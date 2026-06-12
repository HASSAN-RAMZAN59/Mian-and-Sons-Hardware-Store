import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'react-toastify';
import { 
  FaPlus,
  FaEdit,
  FaEye,
  FaTrash,
  FaFileExcel,
  FaDollarSign,
  FaTruck,
  FaMoneyBillWave,
  FaBoxes,
  FaUsers
} from 'react-icons/fa';
import { supplierService } from '../../services/supplierService';
import { purchaseService } from '../../services/purchaseService';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/permissions';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Badge from '../../components/common/Badge';
import SearchBar from '../../components/common/SearchBar';
import { showPremiumConfirm } from '../../utils/premiumDialogs';

const normalizePayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.suppliers)) return payload.suppliers;
  if (Array.isArray(payload?.purchases)) return payload.purchases;
  return [];
};

const normalizeSupplier = (supplier) => ({
  id: supplier?.id ?? supplier?._id,
  company: supplier?.company || supplier?.companyName || '',
  name: supplier?.name || supplier?.contactPerson || '',
  phone: supplier?.phone || supplier?.contact || '',
  email: supplier?.email || '',
  address: supplier?.address || '',
  city: supplier?.city || '',
  ntn: supplier?.ntn || '',
  bankName: supplier?.bankName || '',
  accountTitle: supplier?.accountTitle || '',
  accountNumber: supplier?.accountNumber || '',
  productCategories: supplier?.productCategories || '',
  creditDays: Number(supplier?.creditDays ?? 30),
  openingBalance: Number(supplier?.openingBalance ?? 0),
  totalPurchases: Number(supplier?.totalPurchases ?? 0),
  totalPaid: Number(supplier?.totalPaid ?? 0),
  balancePayable: Number(supplier?.balancePayable ?? 0),
  notes: supplier?.notes || '',
  status: supplier?.status || 'Active',
  createdDate: supplier?.createdDate || supplier?.createdAt || ''
});


const normalizePurchase = (purchase) => ({
  id: purchase?.id ?? purchase?._id,
  supplierId: purchase?.supplierId ?? purchase?.supplier?._id ?? purchase?.supplier?.id ?? '',
  supplierName: purchase?.supplierName || purchase?.supplier?.companyName || purchase?.supplier?.name || '',
  poNo: purchase?.poNo || purchase?.purchaseNo || purchase?.orderNo || 'PO',
  date: purchase?.date || purchase?.createdAt || new Date().toISOString(),
  totalAmount: Number(purchase?.totalAmount ?? purchase?.amount ?? purchase?.grandTotal ?? 0),
  paidAmount: Number(purchase?.paidAmount ?? purchase?.amountPaid ?? 0),
  receivedStatus: purchase?.receivedStatus || purchase?.status || 'Pending'
});

const buildSupplierStats = (purchases = []) => {
  const statsById = new Map();
  const statsByName = new Map();

  purchases.forEach((purchase) => {
    const supplierId = purchase.supplierId ? String(purchase.supplierId) : '';
    const supplierName = purchase.supplierName || 'Supplier';
    const key = supplierId || supplierName;

    const map = supplierId ? statsById : statsByName;
    const entry = map.get(key) || { totalAmount: 0, totalPaid: 0, history: [] };

    entry.totalAmount += Number(purchase.totalAmount || 0);
    entry.totalPaid += Number(purchase.paidAmount || 0);
    entry.history.unshift({
      date: purchase.date,
      invoice: purchase.poNo || 'PO',
      amount: Number(purchase.totalAmount || 0),
      paid: Number(purchase.paidAmount || 0)
    });

    map.set(key, entry);
  });

  return { statsById, statsByName };
};

const mergeSupplierStats = (suppliers, purchases) => {
  const { statsById, statsByName } = buildSupplierStats(purchases);

  return suppliers.map((supplier) => {
    const idKey = supplier.id ? String(supplier.id) : '';
    const nameKey = supplier.companyName || 'Supplier';
    const stats = (idKey && statsById.get(idKey)) || statsByName.get(nameKey) || {
      totalAmount: 0,
      totalPaid: 0,
      history: []
    };

    const totalPurchases = Number(supplier.totalPurchases || stats.totalAmount);
    const totalPaid = Number(supplier.totalPaid || stats.totalPaid);
    const balancePayable = Number(supplier.balancePayable ?? totalPurchases - totalPaid);

    return {
      ...supplier,
      totalPurchases,
      totalPaid,
      balancePayable,
      purchaseHistory: stats.history
    };
  });
};

const Suppliers = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    company: '',
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    ntn: '',
    bankName: '',
    accountTitle: '',
    accountNumber: '',
    productCategories: '',
    creditDays: '30',
    openingBalance: '',
    notes: '',
    status: 'Active'
  });

  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentMethod: 'Bank Transfer',
    notes: ''
  });

  const loadSuppliers = useCallback(async () => {
    const response = await supplierService.getAll();
    const list = normalizePayload(response).map(normalizeSupplier).filter((supplier) => supplier.id);
    setSuppliers(list);
  }, []);

  const loadPurchases = useCallback(async () => {
    const response = await purchaseService.getAll();
    const list = normalizePayload(response).map(normalizePurchase).filter((purchase) => purchase.id);
    setPurchases(list);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      loadSuppliers(),
      loadPurchases()
    ])
      .catch(() => toast.error('Unable to load supplier data.'))
      .finally(() => setIsLoading(false));
  }, [loadSuppliers, loadPurchases]);

  useEffect(() => {
    const refresh = () => {
      loadSuppliers().catch(() => {});
      loadPurchases().catch(() => {});
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    const handleSuppliersUpdated = () => refresh();

    const interval = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('suppliers-updated', handleSuppliersUpdated);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('suppliers-updated', handleSuppliersUpdated);
    };
  }, [loadSuppliers, loadPurchases]);

  const displaySuppliers = useMemo(
    () => mergeSupplierStats(suppliers, purchases),
    [suppliers, purchases]
  );

  // Filter suppliers
  const filteredSuppliers = displaySuppliers.filter(supplier => {
    const query = searchTerm.toLowerCase();
    const matchesSearch = String(supplier.company || '').toLowerCase().includes(query) ||
                         String(supplier.name || '').toLowerCase().includes(query) ||
                         String(supplier.phone || '').includes(searchTerm) ||
                         String(supplier.email || '').toLowerCase().includes(query);
    const matchesStatus = filterStatus === '' || supplier.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate summary statistics
  const activeOrders = purchases.filter((purchase) => purchase.receivedStatus !== 'Received').length;
  const summary = {
    totalSuppliers: displaySuppliers.filter(s => s.status === 'Active').length,
    totalBalancePayable: displaySuppliers.reduce((sum, s) => sum + s.balancePayable, 0),
    totalPurchases: displaySuppliers.reduce((sum, s) => sum + s.totalPurchases, 0),
    activeOrders
  };

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle payment input change
  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({ ...prev, [name]: value }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      companyName: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      ntn: '',
      bankName: '',
      accountTitle: '',
      accountNumber: '',
      productCategories: '',
      creditDays: '30',
      openingBalance: '',
      notes: '',
      status: 'Active'
    });
  };

  // Add supplier
  const handleAddSupplier = async () => {
    if (!canCreate) {
      toast.error('You do not have permission to add suppliers');
      return;
    }

    if (!formData.company || !formData.name || !formData.phone) {
      toast.error('Please fill all required fields');
      return;
    }

    const payload = {
      ...formData,
      creditDays: parseInt(formData.creditDays, 10) || 30,
      openingBalance: parseFloat(formData.openingBalance) || 0
    };

    try {
      await supplierService.create(payload);
      toast.success('Supplier added successfully!');
      setIsAddModalOpen(false);
      resetForm();
      loadSuppliers().catch(() => {});
      window.dispatchEvent(new CustomEvent('suppliers-updated'));
    } catch (error) {
      toast.error('Unable to add supplier.');
    }
  };

  // Delete supplier
  const handleDeleteSupplier = async (supplier) => {
    if (!canDelete) {
      toast.error('You do not have permission to delete suppliers');
      return;
    }

    const confirmed = await showPremiumConfirm({
      title: 'Delete Supplier',
      text: `Are you sure you want to delete supplier "${supplier.company}"? This action cannot be undone.`,
      confirmText: 'Delete Supplier',
      cancelText: 'Cancel',
      icon: 'warning'
    });

    if (!confirmed) return;

    try {
      await supplierService.delete(supplier.id);
      toast.success('Supplier deleted successfully!');
      if (selectedSupplier?.id === supplier.id) {
        setSelectedSupplier(null);
        setIsDetailModalOpen(false);
        setIsEditModalOpen(false);
        setIsPaymentModalOpen(false);
      }
      loadSuppliers().catch(() => {});
      window.dispatchEvent(new CustomEvent('suppliers-updated'));
    } catch (error) {
      toast.error('Unable to delete supplier.');
    }
  };

  // Edit supplier
  const handleEditSupplier = async () => {
    if (!canUpdate) {
      toast.error('You do not have permission to update suppliers');
      return;
    }

    if (!formData.company || !formData.name || !formData.phone) {
      toast.error('Please fill all required fields');
      return;
    }

    const payload = {
      ...formData,
      creditDays: parseInt(formData.creditDays, 10) || 30,
      openingBalance: parseFloat(formData.openingBalance) || 0
    };

    try {
      await supplierService.update(selectedSupplier.id, payload);
      toast.success('Supplier updated successfully!');
      setIsEditModalOpen(false);
      setSelectedSupplier(null);
      resetForm();
      loadSuppliers().catch(() => {});
      window.dispatchEvent(new CustomEvent('suppliers-updated'));
    } catch (error) {
      toast.error('Unable to update supplier.');
    }
  };

  // Open edit modal
  const openEditModal = (supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      company: supplier.company,
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      city: supplier.city,
      ntn: supplier.ntn,
      bankName: supplier.bankName,
      accountTitle: supplier.accountTitle,
      accountNumber: supplier.accountNumber,
      productCategories: supplier.productCategories,
      creditDays: supplier.creditDays.toString(),
      openingBalance: supplier.openingBalance.toString(),
      notes: supplier.notes,
      status: supplier.status
    });
    setIsEditModalOpen(true);
  };

  // View supplier detail
  const viewSupplierDetail = (supplier) => {
    setSelectedSupplier(supplier);
    setIsDetailModalOpen(true);
  };

  // Open payment modal
  const openPaymentModal = (supplier) => {
    setSelectedSupplier(supplier);
    setPaymentData({ amount: '', paymentMethod: 'Bank Transfer', notes: '' });
    setIsPaymentModalOpen(true);
  };

  // Process payment
  const handleProcessPayment = async () => {
    if (!canUpdate) {
      toast.error('You do not have permission to process payments');
      return;
    }

    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(paymentData.amount);
    if (amount > selectedSupplier.balancePayable) {
      toast.error('Payment amount cannot exceed balance payable');
      return;
    }

    const updatedSupplier = {
      ...selectedSupplier,
      balancePayable: selectedSupplier.balancePayable - amount,
      totalPaid: selectedSupplier.totalPaid + amount
    };

    try {
      await supplierService.update(selectedSupplier.id, {
        balancePayable: updatedSupplier.balancePayable,
        totalPaid: updatedSupplier.totalPaid
      });
      toast.success(`Payment of Rs. ${amount.toLocaleString()} made successfully!`);
      setIsPaymentModalOpen(false);
      setSelectedSupplier(null);
      setPaymentData({ amount: '', paymentMethod: 'Bank Transfer', notes: '' });
      loadSuppliers().catch(() => {});
      window.dispatchEvent(new CustomEvent('suppliers-updated'));
    } catch (error) {
      toast.error('Unable to process payment.');
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!canExport) {
      toast.error('You do not have permission to export suppliers');
      return;
    }

    if (!filteredSuppliers.length) {
      toast.error('No suppliers to export');
      return;
    }

    const headers = [
      'Supplier ID',
      'Company Name',
      'Contact Person',
      'Phone',
      'Email',
      'City',
      'Products',
      'Balance Payable',
      'Status'
    ];

    const rows = filteredSuppliers.map((supplier) => [
      `SUP-${String(supplier.id).padStart(3, '0')}`,
      supplier.company,
      supplier.name,
      supplier.phone,
      supplier.email,
      supplier.city,
      supplier.productCategories,
      supplier.balancePayable,
      supplier.status
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `suppliers-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Suppliers exported successfully!');
  };

  // Check permissions
  const canCreate = hasPermission(user?.role, 'suppliers', 'create');
  const canUpdate = hasPermission(user?.role, 'suppliers', 'edit');
  const canDelete = hasPermission(user?.role, 'suppliers', 'delete');
  const canView = hasPermission(user?.role, 'suppliers', 'view');
  const canExport = hasPermission(user?.role, 'suppliers', 'export');

  // Get status badge
  const getStatusBadge = (status) => {
    return status === 'Active' 
      ? <Badge variant="success">Active</Badge>
      : <Badge variant="default">Inactive</Badge>;
  };

  // City options
  const cityOptions = [
    { value: 'Lahore', label: 'Lahore' },
    { value: 'Karachi', label: 'Karachi' },
    { value: 'Islamabad', label: 'Islamabad' },
    { value: 'Rawalpindi', label: 'Rawalpindi' },
    { value: 'Faisalabad', label: 'Faisalabad' },
    { value: 'Multan', label: 'Multan' }
  ];

  // Bank options
  const bankOptions = [
    { value: 'HBL', label: 'Habib Bank Limited' },
    { value: 'UBL', label: 'United Bank Limited' },
    { value: 'MCB', label: 'Muslim Commercial Bank' },
    { value: 'Allied Bank', label: 'Allied Bank Limited' },
    { value: 'Meezan Bank', label: 'Meezan Bank' },
    { value: 'Bank Alfalah', label: 'Bank Alfalah' }
  ];

  // Table columns
  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (row) => (
        <span className="font-mono font-semibold text-gray-900 dark:text-white">
          SUP-{String(row.id).padStart(3, '0')}
        </span>
      )
    },
    {
      key: 'company',
      label: 'Company',
      render: (row) => (
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{row.company}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{row.city}</p>
        </div>
      )
    },
    {
      key: 'name',
      label: 'Contact Person',
      render: (row) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">{row.name}</span>
      )
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (row) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">{row.phone}</span>
      )
    },
    {
      key: 'email',
      label: 'Email',
      render: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.email}
        </span>
      )
    },
    {
      key: 'productCategories',
      label: 'Products Supplied',
      render: (row) => (
        <div className="max-w-xs">
          <p className="text-sm text-gray-700 dark:text-gray-300 truncate" title={row.productCategories}>
            {row.productCategories}
          </p>
        </div>
      )
    },
    {
      key: 'balancePayable',
      label: 'Balance Payable',
      render: (row) => (
        <span className={`font-bold ${row.balancePayable > 0 ? 'text-red-600' : 'text-green-600'}`}>
          Rs. {(row.balancePayable ?? 0).toLocaleString()}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => getStatusBadge(row.status)
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex space-x-2">
          {canView && (
            <button
              onClick={() => viewSupplierDetail(row)}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
              title="View Details"
            >
              <FaEye size={16} />
            </button>
          )}
          {canUpdate && (
            <button
              onClick={() => openEditModal(row)}
              className="text-green-600 hover:text-green-800 dark:text-green-400"
              title="Edit"
            >
              <FaEdit size={16} />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => handleDeleteSupplier(row)}
              className="text-red-600 hover:text-red-800 dark:text-red-400"
              title="Delete"
            >
              <FaTrash size={16} />
            </button>
          )}
          {row.balancePayable > 0 && (
            <button
              onClick={() => openPaymentModal(row)}
              className="text-purple-600 hover:text-purple-800 dark:text-purple-400"
              title="Make Payment"
            >
              <FaDollarSign size={16} />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Suppliers</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage supplier information and accounts
          </p>
        </div>
        <div className="flex space-x-3">
          {canCreate && (
            <Button 
              variant="primary" 
              icon={<FaPlus />}
              onClick={() => {
                resetForm();
                setIsAddModalOpen(true);
              }}
            >
              Add Supplier
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Suppliers</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary.totalSuppliers}</p>
            </div>
            <FaTruck className="text-3xl text-blue-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Balance Payable</p>
              <p className="text-2xl font-bold text-red-600">
                Rs. {(summary.totalBalancePayable / 1000).toFixed(0)}K
              </p>
            </div>
            <FaMoneyBillWave className="text-3xl text-red-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Purchases</p>
              <p className="text-2xl font-bold text-green-600">
                Rs. {(summary.totalPurchases / 1000).toFixed(0)}K
              </p>
            </div>
            <FaBoxes className="text-3xl text-green-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Orders</p>
              <p className="text-3xl font-bold text-orange-600">{summary.activeOrders}</p>
            </div>
            <FaUsers className="text-3xl text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by company, contact, phone, or email..."
          className="w-full md:w-96"
        />
        
        <div className="flex flex-wrap gap-3">
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            options={[
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' }
            ]}
            placeholder="All Status"
            className="w-40"
          />
          <Button
            variant="success"
            icon={<FaFileExcel />}
            onClick={handleExportExcel}
            disabled={!canExport}
          >
            Export Excel
          </Button>
        </div>
      </div>

      {/* Suppliers Table */}
      <Card title={`Suppliers (${filteredSuppliers.length} records)`}>
        <Table
          columns={columns}
          data={filteredSuppliers}
          emptyMessage={isLoading ? 'Loading suppliers...' : 'No suppliers found'}
        />
      </Card>

      {/* Add/Edit Supplier Modal */}
      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          isAddModalOpen ? setIsAddModalOpen(false) : setIsEditModalOpen(false);
          resetForm();
          setSelectedSupplier(null);
        }}
        title={isAddModalOpen ? 'Add New Supplier' : 'Edit Supplier'}
        size="xl"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                isAddModalOpen ? setIsAddModalOpen(false) : setIsEditModalOpen(false);
                resetForm();
                setSelectedSupplier(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={isAddModalOpen ? handleAddSupplier : handleEditSupplier}
            >
              {isAddModalOpen ? 'Add Supplier' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Company"
            name="company"
            value={formData.company}
            onChange={handleInputChange}
            placeholder="Enter company name"
            required
          />

          <Input
            label="Name (Contact Person)"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter contact person name"
            required
          />

          <Input
            label="Phone Number"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="+92-XXX-XXXXXXX"
            required
          />

          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="email@example.com"
          />

          <Input
            label="Address"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            placeholder="Street address"
          />

          <Select
            label="City"
            name="city"
            value={formData.city}
            onChange={handleInputChange}
            options={cityOptions}
            placeholder="Select city"
          />

          <Input
            label="NTN (National Tax Number)"
            name="ntn"
            value={formData.ntn}
            onChange={handleInputChange}
            placeholder="XXXXXXX-X"
          />

          <Select
            label="Bank Name"
            name="bankName"
            value={formData.bankName}
            onChange={handleInputChange}
            options={bankOptions}
            placeholder="Select bank"
          />

          <Input
            label="Account Title"
            name="accountTitle"
            value={formData.accountTitle}
            onChange={handleInputChange}
            placeholder="Account holder name"
          />

          <Input
            label="Account Number"
            name="accountNumber"
            value={formData.accountNumber}
            onChange={handleInputChange}
            placeholder="Bank account number"
          />

          <Input
            label="Credit Days"
            name="creditDays"
            type="number"
            value={formData.creditDays}
            onChange={handleInputChange}
            placeholder="30"
            min="0"
          />

          <Input
            label="Opening Balance (Rs.)"
            name="openingBalance"
            type="number"
            value={formData.openingBalance}
            onChange={handleInputChange}
            placeholder="0"
            min="0"
          />

          <Select
            label="Status"
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            options={[
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' }
            ]}
          />

          <div className="md:col-span-2">
            <Input
              label="Product Categories"
              name="productCategories"
              value={formData.productCategories}
              onChange={handleInputChange}
              placeholder="e.g., Paints, Hardware, Electrical, Plumbing"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Additional notes about supplier..."
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </Modal>

      {/* Supplier Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedSupplier(null);
        }}
        title="Supplier Details"
        size="xl"
      >
        {selectedSupplier && (
          <div className="space-y-6">
            {/* Supplier Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Supplier ID</p>
                <p className="font-semibold text-gray-900 dark:text-white">SUP-{String(selectedSupplier.id).padStart(3, '0')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Company Name</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedSupplier.companyName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Contact Person</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedSupplier.contactPerson}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedSupplier.phone}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedSupplier.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Address</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedSupplier.address}, {selectedSupplier.city}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">NTN</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedSupplier.ntn}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Credit Days</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedSupplier.creditDays} days</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Product Categories</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedSupplier.productCategories}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Bank Details</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {selectedSupplier.bankName} - {selectedSupplier.accountTitle} - {selectedSupplier.accountNumber}
                </p>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Purchases</p>
                <p className="text-xl font-bold text-green-600">Rs. {selectedSupplier.totalPurchases.toLocaleString()}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Paid</p>
                <p className="text-xl font-bold text-blue-600">Rs. {selectedSupplier.totalPaid.toLocaleString()}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">Balance Payable</p>
                <p className="text-xl font-bold text-red-600">Rs. {selectedSupplier.balancePayable.toLocaleString()}</p>
              </div>
            </div>

            {/* Purchase History */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Purchase History</h3>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">PO Number</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Amount</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Paid</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {selectedSupplier.purchaseHistory.length > 0 ? (
                      selectedSupplier.purchaseHistory.map((purchase, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                            {new Date(purchase.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2 text-sm font-mono text-gray-900 dark:text-white">{purchase.invoice}</td>
                          <td className="px-4 py-2 text-sm text-right text-gray-900 dark:text-white">
                            Rs. {purchase.amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-sm text-right text-green-600">
                            Rs. {purchase.paid.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-sm text-right font-semibold text-red-600">
                            Rs. {(purchase.amount - purchase.paid).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                          No purchase history available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedSupplier(null);
          setPaymentData({ amount: '', paymentMethod: 'Bank Transfer', notes: '' });
        }}
        title="Make Payment"
        size="md"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsPaymentModalOpen(false);
                setSelectedSupplier(null);
                setPaymentData({ amount: '', paymentMethod: 'Bank Transfer', notes: '' });
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleProcessPayment}
            >
              Process Payment
            </Button>
          </div>
        }
      >
        {selectedSupplier && (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Supplier</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedSupplier.companyName}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Current Balance Payable</p>
              <p className="text-2xl font-bold text-red-600">Rs. {selectedSupplier.balancePayable.toLocaleString()}</p>
            </div>

            <Input
              label="Payment Amount (Rs.)"
              name="amount"
              type="number"
              value={paymentData.amount}
              onChange={handlePaymentChange}
              placeholder="Enter amount"
              required
              min="0"
              max={selectedSupplier.balancePayable}
            />

            <Select
              label="Payment Method"
              name="paymentMethod"
              value={paymentData.paymentMethod}
              onChange={handlePaymentChange}
              options={[
                { value: 'Cash', label: 'Cash' },
                { value: 'Bank Transfer', label: 'Bank Transfer' },
                { value: 'Cheque', label: 'Cheque' },
                { value: 'Online', label: 'Online Payment' }
              ]}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={paymentData.notes}
                onChange={handlePaymentChange}
                placeholder="Payment notes..."
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {paymentData.amount && (
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Remaining Balance After Payment</p>
                <p className="text-2xl font-bold text-green-600">
                  Rs. {(selectedSupplier.balancePayable - parseFloat(paymentData.amount || 0)).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Suppliers;
