import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { 
  FaPlus, 
  FaEye, 
  FaPrint, 
  FaTrash,
  FaFileExcel,
  FaTimes,
  FaEdit
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
import TextArea from '../../components/common/TextArea';
import { logAudit } from '../../utils/audit';
import { purchaseService } from '../../services/purchaseService';
import { supplierService } from '../../services/supplierService';
import { productService } from '../../services/productService';
import { showPremiumConfirm } from '../../utils/premiumDialogs';

const getProductName = (product) => `${product.name}${product.size ? ` ${product.size}` : ''}`.trim();

const normalizePayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.suppliers)) return payload.suppliers;
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload?.purchases)) return payload.purchases;
  return [];
};

const normalizeSupplier = (supplier) => ({
  id: supplier?.id ?? supplier?._id,
  company: supplier?.company || supplier?.companyName || '',
  phone: supplier?.phone || supplier?.contact || '',
  name: supplier?.name || supplier?.contactPerson || ''
});

const normalizeProduct = (product) => ({
  id: product?.id ?? product?._id,
  name: product?.name || product?.title || 'Product',
  size: product?.size || '',
  purchasePrice: Number(product?.purchasePrice ?? product?.costPrice ?? product?.buyPrice ?? 0)
});

const normalizePurchaseItem = (item) => {
  const quantity = Number(item?.quantity ?? item?.qty ?? 0);
  const price = Number(item?.price ?? item?.unitPrice ?? item?.purchasePrice ?? 0);
  const total = Number(item?.total ?? item?.lineTotal ?? quantity * price);

  return {
    productId: item?.productId ?? item?.product?._id ?? item?.product?.id ?? '',
    productName: item?.productName || item?.product?.name || item?.name || 'Item',
    quantity,
    price,
    total
  };
};

const normalizePurchase = (purchase) => {
  const totalAmount = Number(purchase?.totalAmount ?? purchase?.amount ?? purchase?.grandTotal ?? 0);
  const paidAmount = Number(purchase?.paidAmount ?? purchase?.amountPaid ?? 0);
  const paymentStatus = purchase?.paymentStatus || (paidAmount >= totalAmount ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Credit');
  const supplierId = purchase?.supplierId ?? purchase?.supplier?._id ?? purchase?.supplier?.id ?? '';
  const supplierName =
    purchase?.supplierCompany ||
    purchase?.supplierName ||
    purchase?.supplier?.company ||
    purchase?.supplier?.name ||
    '';

  return {
    id: purchase?.id ?? purchase?._id,
    poNo: purchase?.poNo || purchase?.purchaseNo || purchase?.orderNo || '',
    date: purchase?.date || purchase?.createdAt || new Date().toISOString(),
    supplierId,
    supplierName,
    items: (Array.isArray(purchase?.items) ? purchase.items : []).map(normalizePurchaseItem),
    totalAmount,
    paidAmount,
    balance: Number(purchase?.balance ?? totalAmount - paidAmount),
    paymentMethod: purchase?.paymentMethod || 'Cash',
    paymentStatus,
    receivedStatus: purchase?.receivedStatus || purchase?.status || 'Pending',
    createdBy: purchase?.createdBy || purchase?.createdByName || '',
    notes: purchase?.notes || ''
  };
};

const Purchases = () => {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    supplierId: '',
    date: new Date().toISOString().split('T')[0],
    items: [],
    amountPaid: 0,
    paymentMethod: 'Cash',
    paymentStatus: 'Credit',
    notes: ''
  });

  const [currentItem, setCurrentItem] = useState({
    productId: '',
    productName: '',
    quantity: '',
    purchasePrice: '',
    total: 0
  });
  const loadSuppliers = useCallback(async () => {
    const response = await supplierService.getAll();
    const list = normalizePayload(response).map(normalizeSupplier).filter((supplier) => supplier.id);
    setSuppliers(list);
  }, []);

  const loadProducts = useCallback(async () => {
    const response = await productService.getAll();
    const list = normalizePayload(response).map(normalizeProduct).filter((product) => product.id);
    setProducts(list);
  }, []);

  const loadPurchases = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await purchaseService.getAll();
      const list = normalizePayload(response).map(normalizePurchase).filter((purchase) => purchase.id);
      setPurchases(list);
    } catch (error) {
      toast.error('Unable to load purchase orders.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuppliers().catch(() => toast.error('Unable to load suppliers.'));
    loadProducts().catch(() => toast.error('Unable to load products.'));
    loadPurchases().catch(() => toast.error('Unable to load purchase orders.'));
  }, [loadSuppliers, loadProducts, loadPurchases]);

  useEffect(() => {
    const refresh = () => {
      loadSuppliers().catch(() => {});
      loadProducts().catch(() => {});
      loadPurchases().catch(() => {});
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    const handleSuppliersUpdated = () => loadSuppliers().catch(() => {});

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
  }, [loadSuppliers, loadProducts, loadPurchases]);

  const supplierOptions = useMemo(() => suppliers.map((supplier) => ({
    value: String(supplier.id),
    label: `${supplier.company || 'Supplier'}${supplier.phone ? ` - ${supplier.phone}` : ''}`
  })), [suppliers]);

  const getSupplierLabelById = useCallback((supplierId) => {
    const match = suppliers.find((supplier) => String(supplier.id) === String(supplierId));
    if (!match) return '';
    return `${match.company || 'Supplier'}${match.phone ? ` - ${match.phone}` : ''}`;
  }, [suppliers]);

  const productOptions = useMemo(() => products.map((product) => ({
    value: String(product.id),
    label: getProductName(product),
    price: product.purchasePrice
  })), [products]);

  const paymentMethods = [
    { value: 'Cash', label: 'Cash' },
    { value: 'Bank Transfer', label: 'Bank Transfer' },
    { value: 'Cheque', label: 'Cheque' },
    { value: 'Credit', label: 'Credit' }
  ];

  const paymentStatuses = [
    { value: 'Paid', label: 'Paid' },
    { value: 'Partial', label: 'Partial' },
    { value: 'Credit', label: 'Credit' }
  ];

  // Filter purchases
  const filteredPurchases = purchases.filter(purchase => {
    const matchesStartDate = !startDate || new Date(purchase.date) >= new Date(startDate);
    const matchesEndDate = !endDate || new Date(purchase.date) <= new Date(endDate);
    const matchesDateRange = matchesStartDate && matchesEndDate;
    const matchesSupplier = filterSupplier === '' || String(purchase.supplierId) === String(filterSupplier);
    const matchesPaymentStatus = filterPaymentStatus === '' || purchase.paymentStatus === filterPaymentStatus;
    
    return matchesDateRange && matchesSupplier && matchesPaymentStatus;
  });

  // Calculate total for current item
  useEffect(() => {
    const quantity = parseFloat(currentItem.quantity) || 0;
    const price = parseFloat(currentItem.purchasePrice) || 0;
    setCurrentItem(prev => ({ ...prev, total: quantity * price }));
  }, [currentItem.quantity, currentItem.purchasePrice]);

  // Calculate total amount
  const calculateTotalAmount = () => {
    return formData.items.reduce((sum, item) => sum + item.total, 0);
  };

  // Add item to purchase
  const handleAddItem = () => {
    if (!currentItem.productId || !currentItem.quantity || !currentItem.purchasePrice) {
      toast.error('Please fill all item fields');
      return;
    }

    const product = productOptions.find(p => p.value === currentItem.productId);
    const newItem = {
      productId: currentItem.productId,
      productName: product?.label || currentItem.productName,
      quantity: parseFloat(currentItem.quantity),
      price: parseFloat(currentItem.purchasePrice),
      total: currentItem.total
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    // Reset current item
    setCurrentItem({
      productId: '',
      productName: '',
      quantity: '',
      purchasePrice: '',
      total: 0
    });

    toast.success('Item added to purchase order');
  };

  // Remove item from purchase
  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
    toast.info('Item removed');
  };

  // Handle product selection
  const handleProductSelect = (productId) => {
    const product = productOptions.find(p => p.value === productId);
    setCurrentItem(prev => ({
      ...prev,
      productId,
      productName: product?.label || '',
      purchasePrice: product?.price || ''
    }));
  };

  // Submit purchase
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canCreate) {
      toast.error('You do not have permission to create purchases');
      return;
    }

    if (!formData.supplierId) {
      toast.error('Please select a supplier');
      return;
    }

    if (formData.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    const totalAmount = calculateTotalAmount();
    const paidAmount = parseFloat(formData.amountPaid) || 0;

    const payload = {
      supplierId: formData.supplierId,
      date: formData.date,
      items: formData.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        total: item.total
      })),
      totalAmount,
      paidAmount,
      paymentMethod: formData.paymentMethod,
      paymentStatus: formData.paymentStatus,
      notes: formData.notes
    };

    try {
      if (editingPurchase) {
        await purchaseService.update(editingPurchase.id, payload);
        logAudit({
          user,
          action: 'Updated',
          module: 'Purchases',
          description: `Updated purchase order ${editingPurchase.poNo || ''}`
        });
        toast.success('Purchase order updated successfully!');
      } else {
        const created = await purchaseService.create(payload);
        logAudit({
          user,
          action: 'Created',
          module: 'Purchases',
          description: 'Created purchase order'
        });
        const createdPo = normalizePurchase(created);
        toast.success(`Purchase order ${createdPo.poNo || ''} created successfully!`);
      }

      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      setEditingPurchase(null);
      resetForm();
      loadPurchases().catch(() => {});
    } catch (error) {
      toast.error('Unable to save purchase order.');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      supplierId: '',
      date: new Date().toISOString().split('T')[0],
      items: [],
      amountPaid: 0,
      paymentMethod: 'Cash',
      paymentStatus: 'Credit',
      notes: ''
    });
    setCurrentItem({
      productId: '',
      productName: '',
      quantity: '',
      purchasePrice: '',
      total: 0
    });
  };

  const startEdit = (purchase) => {
    setEditingPurchase(purchase);
    setFormData({
      supplierId: String(purchase.supplierId || ''),
      date: new Date(purchase.date).toISOString().split('T')[0],
      items: purchase.items || [],
      amountPaid: purchase.paidAmount || 0,
      paymentMethod: purchase.paymentMethod || 'Cash',
      paymentStatus: purchase.paymentStatus || 'Credit',
      notes: purchase.notes || ''
    });
    setIsEditModalOpen(true);
  };

  // View purchase details
  const viewPurchase = (purchase) => {
    setSelectedPurchase(purchase);
    setIsViewModalOpen(true);
  };

  // Print purchase order
  const printPurchase = (purchase) => {
    toast.info(`Printing purchase order ${purchase.poNo}...`);
    // In real app, this would open a print dialog with formatted PO
  };

  // Delete purchase
  const deletePurchase = async (purchase) => {
    const confirmed = await showPremiumConfirm({
      title: 'Delete Purchase Order',
      text: `Are you sure you want to delete ${purchase.poNo}?`,
      confirmText: 'Delete Order',
      cancelText: 'Cancel',
      icon: 'warning'
    });

    if (!confirmed) {
      return;
    }

    try {
      await purchaseService.delete(purchase.id);
      logAudit({
        user,
        action: 'Deleted',
        module: 'Purchases',
        description: `Deleted purchase order ${purchase.poNo}`
      });
      toast.success('Purchase order deleted');
      loadPurchases().catch(() => {});
    } catch (error) {
      toast.error('Unable to delete purchase order.');
    }
  };

  // Export to Excel
  const handleExport = () => {
    if (!canExport) {
      toast.error('You do not have permission to export purchases');
      return;
    }

    if (!filteredPurchases.length) {
      toast.error('No purchases to export');
      return;
    }

    const headers = ['PO Number', 'Date', 'Supplier', 'Items', 'Total', 'Paid', 'Balance', 'Payment Method', 'Payment Status', 'Received Status', 'Created By'];
    const rows = filteredPurchases.map((purchase) => [
      purchase.poNo,
      purchase.date,
      purchase.supplierName || getSupplierLabelById(purchase.supplierId),
      purchase.items.length,
      purchase.totalAmount,
      purchase.paidAmount,
      purchase.balance,
      purchase.paymentMethod,
      purchase.paymentStatus,
      purchase.receivedStatus,
      purchase.createdBy
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `purchases-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Purchases exported successfully!');
  };

  // Get payment status badge
  const getPaymentStatusBadge = (status) => {
    switch (status) {
      case 'Paid':
        return <Badge variant="success">Paid</Badge>;
      case 'Partial':
        return <Badge variant="warning">Partial</Badge>;
      case 'Credit':
        return <Badge variant="info">Credit</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  // Get received status badge
  const getReceivedStatusBadge = (status) => {
    switch (status) {
      case 'Received':
        return <Badge variant="success">Received</Badge>;
      case 'Partial':
        return <Badge variant="warning">Partial</Badge>;
      case 'Pending':
        return <Badge variant="info">Pending</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  // Permissions
  const canCreate = hasPermission(user?.role, 'purchases', 'create');
  const canDelete = hasPermission(user?.role, 'purchases', 'delete');
  const canExport = hasPermission(user?.role, 'purchases', 'export');

  // Table columns
  const columns = [
    {
      key: 'poNo',
      label: 'PO #',
      render: (row) => (
        <span className="font-mono font-semibold text-primary">{row.poNo}</span>
      )
    },
    {
      key: 'date',
      label: 'Date',
      render: (row) => (
        <span className="text-sm text-gray-900 dark:text-white">
          {new Date(row.date).toLocaleDateString()}
        </span>
      )
    },
    {
      key: 'supplierName',
      label: 'Supplier',
      render: (row) => (
        <span className="text-sm text-gray-900 dark:text-white">
          {row.supplierName || getSupplierLabelById(row.supplierId)}
        </span>
      )
    },
    {
      key: 'itemsCount',
      label: 'Items',
      render: (row) => (
        <Badge variant="info">{row.items.length}</Badge>
      )
    },
    {
      key: 'totalAmount',
      label: 'Total',
      render: (row) => (
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          Rs. {(row.totalAmount ?? 0).toLocaleString()}
        </span>
      )
    },
    {
      key: 'paidAmount',
      label: 'Paid',
      render: (row) => (
        <span className="text-sm font-semibold text-green-600">
          Rs. {(row.paidAmount ?? 0).toLocaleString()}
        </span>
      )
    },
    {
      key: 'balance',
      label: 'Balance',
      render: (row) => (
        <span className={`text-sm font-semibold ${row.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
          Rs. {(row.balance ?? 0).toLocaleString()}
        </span>
      )
    },
    {
      key: 'paymentStatus',
      label: 'Payment',
      render: (row) => getPaymentStatusBadge(row.paymentStatus)
    },
    {
      key: 'receivedStatus',
      label: 'Received',
      render: (row) => getReceivedStatusBadge(row.receivedStatus)
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => viewPurchase(row)}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
            title="View Details"
          >
            <FaEye size={16} />
          </button>
          {canCreate && (
            <button
              onClick={() => startEdit(row)}
              className="text-amber-600 hover:text-amber-800 dark:text-amber-400"
              title="Edit PO"
            >
              <FaEdit size={16} />
            </button>
          )}
          <button
            onClick={() => printPurchase(row)}
            className="text-green-600 hover:text-green-800 dark:text-green-400"
            title="Print PO"
          >
            <FaPrint size={16} />
          </button>
          {canDelete && (
            <button
              onClick={() => deletePurchase(row)}
              className="text-red-600 hover:text-red-800 dark:text-red-400"
              title="Delete"
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Purchase Orders</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage supplier purchase orders and inventory
          </p>
        </div>
        <div className="flex space-x-3">
          {canCreate && (
            <Button
              variant="primary"
              icon={<FaPlus />}
              onClick={() => setIsAddModalOpen(true)}
            >
              New Purchase
            </Button>
          )}
          <Button
            variant="success"
            icon={<FaFileExcel />}
            onClick={handleExport}
            disabled={!canExport}
          >
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <Select
            label="Supplier"
            value={filterSupplier}
            onChange={(e) => setFilterSupplier(e.target.value)}
            options={supplierOptions}
            placeholder="All Suppliers"
          />
          <Select
            label="Payment Status"
            value={filterPaymentStatus}
            onChange={(e) => setFilterPaymentStatus(e.target.value)}
            options={paymentStatuses}
            placeholder="All Status"
          />
        </div>
      </Card>

      {/* Purchases Table */}
      <Card title={`Purchase Orders (${filteredPurchases.length} total)`}>
        <Table
          columns={columns}
          data={filteredPurchases}
          emptyMessage={isLoading ? 'Loading purchase orders...' : 'No purchase orders found'}
        />
      </Card>

      {/* Add Purchase Modal */}
      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
          setEditingPurchase(null);
          resetForm();
        }}
        title={editingPurchase ? 'Update Purchase Order' : 'Create Purchase Order'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Supplier and Date */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Supplier"
              value={formData.supplierId}
              onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
              options={supplierOptions}
              placeholder="Select Supplier"
              required
            />
            <Input
              label="Purchase Date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          {/* Items Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Purchase Items
            </h3>
            
            {/* Add Item Form */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-4">
                  <Select
                    label="Product"
                    value={currentItem.productId}
                    onChange={(e) => handleProductSelect(e.target.value)}
                    options={productOptions}
                    placeholder="Select Product"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    label="Quantity"
                    type="number"
                    value={currentItem.quantity}
                    onChange={(e) => setCurrentItem({ ...currentItem, quantity: e.target.value })}
                    placeholder="Qty"
                    min="1"
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    label="Purchase Price"
                    type="number"
                    value={currentItem.purchasePrice}
                    onChange={(e) => setCurrentItem({ ...currentItem, purchasePrice: e.target.value })}
                    placeholder="Price"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Total
                  </label>
                  <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm font-semibold text-gray-900 dark:text-white">
                    Rs. {currentItem.total.toLocaleString()}
                  </div>
                </div>
                <div className="col-span-1 flex items-end">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleAddItem}
                    className="w-full"
                  >
                    <FaPlus />
                  </Button>
                </div>
              </div>
            </div>

            {/* Items List */}
            {formData.items.length > 0 && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Product</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Qty</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Price</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Total</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {formData.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.productName}</td>
                        <td className="px-4 py-2 text-sm text-center text-gray-700 dark:text-gray-300">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm text-right text-gray-700 dark:text-gray-300">
                          Rs. {item.price.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-semibold text-gray-900 dark:text-white">
                          Rs. {item.total.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <FaTimes />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payment Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Payment Details
            </h3>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900 dark:text-white">Total Amount:</span>
                <span className="text-2xl font-bold text-primary">
                  Rs. {calculateTotalAmount().toLocaleString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Amount Paid"
                type="number"
                value={formData.amountPaid}
                onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              <Select
                label="Payment Method"
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                options={paymentMethods}
              />
              <Select
                label="Payment Status"
                value={formData.paymentStatus}
                onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                options={paymentStatuses}
              />
            </div>

            <div className="mt-3 text-sm">
              <span className="text-gray-600 dark:text-gray-400">Balance Due: </span>
              <span className="font-bold text-red-600">
                Rs. {(calculateTotalAmount() - (parseFloat(formData.amountPaid) || 0)).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Notes */}
          <TextArea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes or instructions..."
            rows={3}
          />

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
                setEditingPurchase(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingPurchase ? 'Update Purchase Order' : 'Create Purchase Order'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Purchase Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedPurchase(null);
        }}
        title="Purchase Order Details"
        size="xl"
      >
        {selectedPurchase && (
          <div className="space-y-6">
            {/* PO Header */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">PO Number</p>
                <p className="text-lg font-semibold text-primary">{selectedPurchase.poNo}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Date</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {new Date(selectedPurchase.date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Supplier</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedPurchase.supplierName || getSupplierLabelById(selectedPurchase.supplierId)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Created By</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedPurchase.createdBy}
                </p>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Items Ordered</h4>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Product</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Quantity</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Unit Price</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {selectedPurchase.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.productName}</td>
                        <td className="px-4 py-2 text-sm text-center text-gray-700 dark:text-gray-300">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm text-right text-gray-700 dark:text-gray-300">
                          Rs. {item.price.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-semibold text-gray-900 dark:text-white">
                          Rs. {item.total.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    Rs. {selectedPurchase.totalAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Amount Paid:</span>
                  <span className="font-semibold text-green-600">
                    Rs. {selectedPurchase.paidAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-gray-300 dark:border-gray-600">
                  <span className="font-semibold text-gray-900 dark:text-white">Balance Due:</span>
                  <span className={`font-bold ${selectedPurchase.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    Rs. {selectedPurchase.balance.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Payment Method</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedPurchase.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Payment Status</p>
                  <div className="mt-1">{getPaymentStatusBadge(selectedPurchase.paymentStatus)}</div>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Received Status</p>
                  <div className="mt-1">{getReceivedStatusBadge(selectedPurchase.receivedStatus)}</div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {selectedPurchase.notes && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Notes</p>
                <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  {selectedPurchase.notes}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => setIsViewModalOpen(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                icon={<FaPrint />}
                onClick={() => printPurchase(selectedPurchase)}
              >
                Print PO
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Purchases;
