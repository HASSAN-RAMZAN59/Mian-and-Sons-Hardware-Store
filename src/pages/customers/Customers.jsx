
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  FaPlus,
  FaEdit,
  FaEye,
  FaFileExcel,
  FaFilePdf,
  FaDollarSign,
  FaTrash,
  FaUsers,
  FaMoneyBillWave,
  FaCreditCard
} from 'react-icons/fa';
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
import { customerService } from '../../services/customerService';
import { orderService } from '../../services/orderService';
import { paymentService } from '../../services/paymentService';
import { showPremiumConfirm } from '../../utils/premiumDialogs';


const toDatePart = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

const Customers = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSummary, setCustomerSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('orders'); // orders, payments, returns
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    city: '',
    cnic: '',
    customerType: 'Retail',
    creditLimit: '',
    openingBalance: '',
    notes: '',
    status: 'Active'
  });

  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentMethod: 'Cash',
    notes: ''
  });


  // Load customers from backend
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const data = await customerService.getAll();
        setCustomers(data);
      } catch (error) {
        toast.error('Failed to load customers from backend');
      }
    };
    fetchCustomers();
  }, []);

  // Filter customers
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.phone.includes(searchTerm) ||
                         customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === '' || customer.customerType === filterType;
    const matchesStatus = filterStatus === '' || customer.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Calculate summary statistics based on filtered results
  const summary = {
    totalCustomers: filteredCustomers.length,
    totalBalanceDue: filteredCustomers.reduce((sum, c) => sum + (Number(c.balanceDue) || 0), 0),
    totalCreditLimit: filteredCustomers.reduce((sum, c) => sum + (Number(c.creditLimit) || 0), 0),
    totalPurchases: filteredCustomers.reduce((sum, c) => sum + (Number(c.totalPurchases) || 0), 0)
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
      fullName: '',
      phone: '',
      whatsapp: '',
      email: '',
      address: '',
      city: '',
      cnic: '',
      customerType: 'Retail',
      creditLimit: '',
      openingBalance: '',
      notes: '',
      status: 'Active'
    });
  };


  // Add customer (backend)
  const handleAddCustomer = async () => {
    if (!formData.fullName || !formData.phone) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      const newCustomer = await customerService.create(formData);
      setCustomers((prev) => [...prev, newCustomer]);
      toast.success('Customer added successfully!');
      setIsAddModalOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to add customer');
    }
  };


  // Edit customer (backend)
  const handleEditCustomer = async () => {
    if (!formData.fullName || !formData.phone) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      const updated = await customerService.update(selectedCustomer._id, formData);
      setCustomers((prev) => prev.map((c) => c._id === updated._id ? updated : c));
      toast.success('Customer updated successfully!');
      setIsEditModalOpen(false);
      setSelectedCustomer(null);
      resetForm();
    } catch (error) {
      toast.error('Failed to update customer');
    }
  };

  // Delete customer (backend)
  const handleDeleteCustomer = async (customer) => {
    const confirmed = await showPremiumConfirm({
      title: 'Delete Customer',
      text: `Are you sure you want to delete customer "${customer.fullName}"? This action cannot be undone.`,
      confirmText: 'Delete Customer',
      cancelText: 'Keep Customer',
      icon: 'warning'
    });

    if (!confirmed) {
      return;
    }
    
    try {
      await customerService.delete(customer._id);
      setCustomers((prev) => prev.filter((c) => c._id !== customer._id));
      toast.success('Customer deleted successfully!');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete customer. Ensure they have no linked records.');
    }
  };

  // Open edit modal
  const openEditModal = (customer) => {
    setSelectedCustomer(customer);
    setFormData({
      fullName: customer.fullName,
      phone: customer.phone,
      whatsapp: customer.whatsapp,
      email: customer.email,
      address: customer.address,
      city: customer.city,
      cnic: customer.cnic,
      customerType: customer.customerType,
      creditLimit: (customer.creditLimit || 0).toString(),
      openingBalance: (customer.openingBalance || 0).toString(),
      notes: customer.notes || '',
      status: customer.status || 'Active'
    });
    setIsEditModalOpen(true);
  };

  // View customer detail (backend aggregation)
  const viewCustomerDetail = async (customer) => {
    try {
      const summary = await customerService.getSummary(customer._id);
      
      // Mandatory Debug Logs
      console.log("Customer ID:", customer._id);
      console.log("Orders:", summary.recentOrders || []);
      console.log("Payments:", summary.recentPayments || []);
      console.log("Returns:", summary.recentReturns || []);
      
      setCustomerSummary(summary);
      setSelectedCustomer(customer);
      setActiveTab('orders');
      setIsDetailModalOpen(true);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load customer summary from backend');
    }
  };

  // Open payment modal
  const openPaymentModal = (customer) => {
    setSelectedCustomer(customer);
    setPaymentData({ amount: '', paymentMethod: 'Cash', notes: '' });
    setIsPaymentModalOpen(true);
  };


  // Process payment (backend)
  const handleProcessPayment = async () => {
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    const amount = parseFloat(paymentData.amount);
    if (amount > selectedCustomer.balanceDue) {
      toast.error('Payment amount cannot exceed balance due');
      return;
    }
    try {
      await paymentService.create({
        customer_id: selectedCustomer._id,
        amount,
        method: paymentData.paymentMethod,
        notes: paymentData.notes,
        date: new Date().toISOString().split('T')[0]
      });
      toast.success(`Payment of Rs. ${amount.toLocaleString()} received successfully!`);
      setIsPaymentModalOpen(false);
      setSelectedCustomer(null);
      setPaymentData({ amount: '', paymentMethod: 'Cash', notes: '' });
      // Optionally reload customers from backend
      const data = await customerService.getAll();
      setCustomers(data);
    } catch (error) {
      toast.error('Failed to process payment');
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!filteredCustomers.length) {
      toast.error('No customer data to export');
      return;
    }

    const headers = [
      'Customer ID',
      'Full Name',
      'Phone',
      'Email',
      'Address',
      'City',
      'Customer Type',
      'Status',
      'Total Purchases',
      'Total Paid',
      'Balance Due',
      'Credit Limit'
    ];

    const rows = filteredCustomers.map((customer) => [
      `CUS-${String(customer._id || customer.id).slice(-4).toUpperCase()}`,
      customer.fullName,
      customer.phone,
      customer.email || '',
      customer.address || '',
      customer.city || '',
      customer.customerType || '',
      customer.status || '',
      Number(customer.totalPurchases || 0),
      Number(customer.totalPaid || 0),
      Number(customer.balanceDue || 0),
      Number(customer.creditLimit || 0)
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Customer list exported successfully!');
  };

  // Generate customer statement PDF
  const handleGenerateStatement = (customer) => {
    const statementHeaders = ['Date', 'Invoice', 'Amount', 'Paid', 'Balance'];
    const statementRows = (customer.purchaseHistory || []).map((entry) => {
      const amount = Number(entry.amount || 0);
      const paid = Number(entry.paid || 0);
      return [
        entry.date || '',
        entry.invoice || '',
        amount,
        paid,
        Math.max(amount - paid, 0)
      ];
    });

    const summaryRows = [
      [],
      ['Customer Name', customer.fullName || ''],
      ['Phone', customer.phone || ''],
      ['Email', customer.email || ''],
      ['Total Purchases', Number(customer.totalPurchases || 0)],
      ['Total Paid', Number(customer.totalPaid || 0)],
      ['Balance Due', Number(customer.balanceDue || 0)]
    ];

    const csvContent = [statementHeaders, ...statementRows, ...summaryRows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customer-statement-${String(customer.fullName || 'customer').replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Statement generated for ${customer.fullName}.`);
  };

  // Check permissions
  const canCreate = hasPermission(user?.role, 'customers', 'create');
  const canUpdate = hasPermission(user?.role, 'customers', 'edit');
  const canDelete = hasPermission(user?.role, 'customers', 'delete');
  const canView = hasPermission(user?.role, 'customers', 'view');

  // Get customer type badge
  const getTypeBadge = (type) => {
    switch (type) {
      case 'Retail':
        return <Badge variant="info">Retail</Badge>;
      case 'Wholesale':
        return <Badge variant="success">Wholesale</Badge>;
      case 'Contractor':
        return <Badge variant="warning">Contractor</Badge>;
      default:
        return <Badge variant="default">{type}</Badge>;
    }
  };

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

  // Table columns
  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (row) => (
        <span className="font-mono font-semibold text-gray-900 dark:text-white">
          CUS-{String(row._id || row.id).slice(-4).toUpperCase()}
        </span>
      )
    },
    {
      key: 'fullName',
      label: 'Name',
      render: (row) => (
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{row.fullName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{getTypeBadge(row.customerType)}</p>
        </div>
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
          {row.email || 'N/A'}
        </span>
      )
    },
    {
      key: 'address',
      label: 'Address',
      render: (row) => (
        <div>
          <p className="text-sm text-gray-700 dark:text-gray-300">{row.address}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{row.city}</p>
        </div>
      )
    },
    {
      key: 'totalPurchases',
      label: 'Total Purchases',
      render: (row) => (
        <span className="font-semibold text-green-600">
          Rs. {(row.totalPurchases ?? 0).toLocaleString()}
        </span>
      )
    },
    {
      key: 'balanceDue',
      label: 'Balance Due',
      render: (row) => (
        <span className={`font-bold ${row.balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
          Rs. {(row.balanceDue ?? 0).toLocaleString()}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex space-x-2">
          {canView && (
            <button
              onClick={() => viewCustomerDetail(row)}
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
          {row.balanceDue > 0 && (
            <button
              onClick={() => openPaymentModal(row)}
              className="text-purple-600 hover:text-purple-800 dark:text-purple-400"
              title="Receive Payment"
            >
              <FaDollarSign size={16} />
            </button>
          )}
          <button
            onClick={() => handleGenerateStatement(row)}
            className="text-red-600 hover:text-red-800 dark:text-red-400"
            title="Generate Statement"
          >
            <FaFilePdf size={16} />
          </button>
          
          {canDelete && (
            <button
              onClick={() => handleDeleteCustomer(row)}
              className="text-red-500 hover:text-red-700 dark:text-red-400"
              title="Delete Customer"
            >
              <FaTrash size={16} />
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Customers</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage customer information and accounts
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
              Add Customer
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Customers</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary.totalCustomers}</p>
            </div>
            <FaUsers className="text-3xl text-blue-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Balance Due</p>
              <p className="text-2xl font-bold text-red-600">
                Rs. {summary.totalBalanceDue.toLocaleString()}
              </p>
            </div>
            <FaMoneyBillWave className="text-3xl text-red-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Credit Limit</p>
              <p className="text-2xl font-bold text-orange-600">
                Rs. {summary.totalCreditLimit.toLocaleString()}
              </p>
            </div>
            <FaCreditCard className="text-3xl text-orange-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Sales</p>
              <p className="text-2xl font-bold text-green-600">
                Rs. {summary.totalPurchases.toLocaleString()}
              </p>
            </div>
            <FaDollarSign className="text-3xl text-green-600" />
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by name, phone, or email..."
          className="w-full md:w-96"
        />
        
        <div className="flex flex-wrap gap-3">
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            options={[
              { value: 'Retail', label: 'Retail' },
              { value: 'Wholesale', label: 'Wholesale' },
              { value: 'Contractor', label: 'Contractor' }
            ]}
            placeholder="All Types"
            className="w-40"
          />
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
          >
            Export Excel
          </Button>
        </div>
      </div>

      {/* Customers Table */}
      <Card title={`Customers (${filteredCustomers.length} records)`}>
        <Table
          columns={columns}
          data={filteredCustomers}
          emptyMessage="No customers found"
        />
      </Card>

      {/* Add/Edit Customer Modal */}
      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          isAddModalOpen ? setIsAddModalOpen(false) : setIsEditModalOpen(false);
          resetForm();
          setSelectedCustomer(null);
        }}
        title={isAddModalOpen ? 'Add New Customer' : 'Edit Customer'}
        size="xl"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                isAddModalOpen ? setIsAddModalOpen(false) : setIsEditModalOpen(false);
                resetForm();
                setSelectedCustomer(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={isAddModalOpen ? handleAddCustomer : handleEditCustomer}
            >
              {isAddModalOpen ? 'Add Customer' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Full Name"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            placeholder="Enter full name"
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
            label="WhatsApp Number"
            name="whatsapp"
            value={formData.whatsapp}
            onChange={handleInputChange}
            placeholder="+92-XXX-XXXXXXX"
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
            label="CNIC"
            name="cnic"
            value={formData.cnic}
            onChange={handleInputChange}
            placeholder="XXXXX-XXXXXXX-X"
          />

          <Select
            label="Customer Type"
            name="customerType"
            value={formData.customerType}
            onChange={handleInputChange}
            options={[
              { value: 'Retail', label: 'Retail' },
              { value: 'Wholesale', label: 'Wholesale' },
              { value: 'Contractor', label: 'Contractor' }
            ]}
            required
          />

          <Input
            label="Credit Limit (Rs.)"
            name="creditLimit"
            type="number"
            value={formData.creditLimit}
            onChange={handleInputChange}
            placeholder="0"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Additional notes about customer..."
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </Modal>

      {/* Customer Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedCustomer(null);
        }}
        title="Customer Details"
        size="xl"
      >
        {selectedCustomer && (
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Customer ID</p>
                <p className="font-semibold text-gray-900 dark:text-white">CUS-{String(selectedCustomer._id || selectedCustomer.id).slice(-4).toUpperCase()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Name</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedCustomer.fullName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedCustomer.phone}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedCustomer.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Address</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedCustomer.address}, {selectedCustomer.city}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">CNIC</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedCustomer.cnic}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Customer Type</p>
                <p className="font-semibold text-gray-900 dark:text-white">{getTypeBadge(selectedCustomer.customerType)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                <p className="font-semibold text-gray-900 dark:text-white">{getStatusBadge(selectedCustomer.status)}</p>
              </div>
            </div>

            {/* Financial Summary (Dynamic) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Spent</p>
                <p className="text-xl font-bold text-green-600">Rs. {(customerSummary?.totalSpent ?? 0).toLocaleString()}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Paid</p>
                <p className="text-xl font-bold text-blue-600">Rs. {(customerSummary?.totalPayments ?? 0).toLocaleString()}</p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Returns</p>
                <p className="text-xl font-bold text-yellow-600">Rs. {(customerSummary?.totalReturns ?? 0).toLocaleString()}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">Outstanding Balance</p>
                <p className="text-xl font-bold text-red-600">Rs. {(customerSummary?.outstandingBalance ?? 0).toLocaleString()}</p>
              </div>
            </div>

            {/* Activity Tabs */}
            <div className="space-y-4">
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`px-4 py-2 text-sm font-medium ${activeTab === 'orders' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Orders ({customerSummary?.totalOrders ?? 0})
                </button>
                <button
                  onClick={() => setActiveTab('payments')}
                  className={`px-4 py-2 text-sm font-medium ${activeTab === 'payments' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Payments ({customerSummary?.recentPayments?.length ?? 0})
                </button>
                <button
                  onClick={() => setActiveTab('returns')}
                  className={`px-4 py-2 text-sm font-medium ${activeTab === 'returns' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Returns ({customerSummary?.recentReturns?.length ?? 0})
                </button>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    {activeTab === 'orders' && (
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Order ID</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Total</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                      </tr>
                    )}
                    {activeTab === 'payments' && (
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Method</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Amount</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Notes</th>
                      </tr>
                    )}
                    {activeTab === 'returns' && (
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Product</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Amount</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {activeTab === 'orders' && (customerSummary?.recentOrders?.length > 0 ? (
                      customerSummary.recentOrders.map((order, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2 text-sm font-mono text-gray-900 dark:text-white">ORD-{String(order.id || order._id).slice(-6).toUpperCase()}</td>
                          <td className="px-4 py-2 text-sm text-right text-gray-900 dark:text-white">Rs. {order.total.toLocaleString()}</td>
                          <td className="px-4 py-2 text-sm text-center">
                            <Badge variant={order.status === 'delivered' ? 'success' : 'warning'}>{order.status}</Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="4" className="px-4 py-8 text-center text-gray-500">No orders found</td></tr>
                    ))}

                    {activeTab === 'payments' && (customerSummary?.recentPayments?.length > 0 ? (
                      customerSummary.recentPayments.map((pay, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{pay.date || new Date(pay.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{pay.method}</td>
                          <td className="px-4 py-2 text-sm text-right text-green-600 font-semibold">Rs. {pay.amount.toLocaleString()}</td>
                          <td className="px-4 py-2 text-sm text-gray-500 truncate max-w-xs">{pay.notes || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="4" className="px-4 py-8 text-center text-gray-500">No payments found</td></tr>
                    ))}

                    {activeTab === 'returns' && (customerSummary?.recentReturns?.length > 0 ? (
                      customerSummary.recentReturns.map((ret, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{new Date(ret.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{ret.productName}</td>
                          <td className="px-4 py-2 text-sm text-right text-red-600 font-semibold">Rs. {ret.refundAmount.toLocaleString()}</td>
                          <td className="px-4 py-2 text-sm text-center">
                            <Badge variant="warning">{ret.status}</Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="4" className="px-4 py-8 text-center text-gray-500">No returns found</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Quick Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedCustomer(null);
          setPaymentData({ amount: '', paymentMethod: 'Cash', notes: '' });
        }}
        title="Receive Payment"
        size="md"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsPaymentModalOpen(false);
                setSelectedCustomer(null);
                setPaymentData({ amount: '', paymentMethod: 'Cash', notes: '' });
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
        {selectedCustomer && (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Customer</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedCustomer.fullName}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Current Balance Due</p>
              <p className="text-2xl font-bold text-red-600">Rs. {(selectedCustomer.balanceDue ?? 0).toLocaleString()}</p>
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
              max={selectedCustomer.balanceDue}
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
                  Rs. {(selectedCustomer.balanceDue - parseFloat(paymentData.amount || 0)).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Customers;
