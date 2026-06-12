import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  FaExclamationTriangle,
  FaExclamationCircle,
  FaTimesCircle,
  FaShoppingCart,
  FaWhatsapp,
  FaSync,
  FaClock,
  FaCheckSquare
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/permissions';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import SearchBar from '../../components/common/SearchBar';
import { inventoryService } from '../../services/inventoryService';
import { purchaseService } from '../../services/purchaseService';
import { supplierService } from '../../services/supplierService';

const getProductName = (product) => {
  if (!product) return '';
  return [product.name, product.size].filter(Boolean).join(' ').trim();
};

const getProductCode = (item) => {
  const sourceId = item?.product?._id || item?.product?.id || item?._id || item?.id;
  if (!sourceId) return 'PRD-000';
  const suffix = String(sourceId).slice(-6).toUpperCase();
  return `PRD-${suffix}`;
};



const resolveAlertLevel = (currentStock, minStock) => {
  if (currentStock === 0) return 'Out of Stock';
  if (currentStock <= Math.max(1, Math.floor(minStock * 0.5))) return 'Critical';
  if (currentStock < minStock) return 'Low Stock';
  return null;
};

const StockAlerts = () => {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [stockAlerts, setStockAlerts] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const data = await supplierService.getAll();
        setSuppliers(data);
      } catch (err) {
        console.error('Failed to load suppliers:', err);
      }
    };
    fetchSuppliers();
  }, []);


  // Load inventory data from backend and compute alerts

  // Define loadStockAlerts at top level so it is available everywhere
  const mapInventoryRows = (rows) =>
    (rows || []).map((item) => {
      const product = item.product || {};
      const category = item.category || {};
      const currentStock = Number(item.quantity ?? item.currentStock ?? 0);
      const minStock = Number(item.minStock ?? product.minStock ?? 0);
      const maxStock = Number(item.maxStock ?? product.maxStock ?? 0);
      return {
        ...item,
        id: item.id || item._id,
        productName: getProductName(product),
        productCode: getProductCode(item),
        category: category.name || product.category || 'Uncategorized',
        currentStock,
        minStock,
        maxStock,
        supplier: product.supplier || item.supplier
      };
    });

  const loadStockAlerts = async () => {
    try {
      const inventory = await inventoryService.getAll();
      const mappedInventory = mapInventoryRows(Array.isArray(inventory) ? inventory : []);
      const alerts = mappedInventory
        .map((item) => {
          const alertLevel = resolveAlertLevel(Number(item.currentStock) || 0, Number(item.minStock) || 0);
          if (!alertLevel) return null;
          return {
            ...item,
            alertLevel
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.currentStock - b.currentStock);
      setStockAlerts(alerts);
    } catch (error) {
      toast.error('Failed to load stock alerts');
    }
  };

  useEffect(() => {
    loadStockAlerts();
  }, []);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    const interval = setInterval(() => {
      // Reload alerts from backend
      (async () => {
        try {
          const inventory = await inventoryService.getAll();
          const mappedInventory = mapInventoryRows(Array.isArray(inventory) ? inventory : []);
          const alerts = mappedInventory
            .map((item) => {
              const alertLevel = resolveAlertLevel(Number(item.currentStock) || 0, Number(item.minStock) || 0);
              if (!alertLevel) return null;
              return {
                ...item,
                alertLevel
              };
            })
            .filter(Boolean)
            .sort((a, b) => a.currentStock - b.currentStock);
          setStockAlerts(alerts);
          setLastRefresh(new Date());
          toast.info('Stock alerts refreshed automatically');
        } catch (error) {
          toast.error('Failed to refresh stock alerts');
        }
      })();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshEnabled]);

  // Get alert level badge
  const getAlertBadge = (alertLevel) => {
    switch (alertLevel) {
      case 'Out of Stock':
        return (
          <Badge variant="danger" icon={<FaTimesCircle />}>
            Out of Stock
          </Badge>
        );
      case 'Critical':
        return (
          <Badge variant="danger" icon={<FaExclamationCircle />}>
            Critical
          </Badge>
        );
      case 'Low Stock':
        return (
          <Badge variant="warning" icon={<FaExclamationTriangle />}>
            Low Stock
          </Badge>
        );
      default:
        return <Badge variant="default">Unknown</Badge>;
    }
  };

  // Get row class based on alert level
  const getRowClass = (alertLevel) => {
    switch (alertLevel) {
      case 'Out of Stock':
        return 'bg-red-100 dark:bg-red-900/30 border-l-4 border-red-600';
      case 'Critical':
        return 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500';
      case 'Low Stock':
        return 'bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500';
      default:
        return '';
    }
  };

  // Calculate counts
  const counts = {
    all: stockAlerts.length,
    critical: stockAlerts.filter(a => a.alertLevel === 'Critical').length,
    lowStock: stockAlerts.filter(a => a.alertLevel === 'Low Stock').length,
    outOfStock: stockAlerts.filter(a => a.alertLevel === 'Out of Stock').length
  };

  // Filter alerts
  const filteredAlerts = stockAlerts.filter(alert => {
    const matchesSearch = alert.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeFilter === 'All') return matchesSearch;
    if (activeFilter === 'Critical') return matchesSearch && alert.alertLevel === 'Critical';
    if (activeFilter === 'Low Stock') return matchesSearch && alert.alertLevel === 'Low Stock';
    if (activeFilter === 'Out of Stock') return matchesSearch && alert.alertLevel === 'Out of Stock';
    
    return matchesSearch;
  });

  // Handle checkbox change
  const handleCheckboxChange = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedItems.length === filteredAlerts.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredAlerts.map(alert => alert.id));
    }
  };

  // Create purchase order for single item
  const handleCreatePO = async (alert) => {
    if (!canCreatePO) {
      toast.error('You do not have permission to create purchase orders');
      return;
    }

    let supplierId = alert.product?.supplier_id || alert.supplier_id || alert.product?.supplierId || alert.supplierId;
    if (!supplierId && suppliers.length > 0) {
      supplierId = suppliers[0]._id || suppliers[0].id;
    }
    if (!supplierId) {
      toast.error('No suppliers found in the database. Please add a supplier first.');
      return;
    }

    const restockQuantity = Math.max(alert.maxStock - alert.currentStock, alert.minStock);
    const price = alert.product?.purchasePrice || alert.purchasePrice || 0;
    const total = restockQuantity * price;
    const today = new Date().toISOString().split('T')[0];
    const nextPoNumber = `PO-SA-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    const newPO = {
      poNo: nextPoNumber,
      supplierId: String(supplierId),
      date: today,
      items: [
        {
          productId: String(alert.product?._id || alert.product?.id || alert.id),
          productName: alert.productName,
          quantity: restockQuantity,
          price: price,
          total: total
        }
      ],
      totalAmount: total,
      paidAmount: 0.0,
      paymentMethod: 'Cash',
      paymentStatus: 'Credit',
      receivedStatus: 'Received',
      notes: `Auto-restock from low stock alert.`,
      createdBy: user?.username || user?.name || 'Admin'
    };

    try {
      await purchaseService.create(newPO);
      await loadStockAlerts();
      toast.success(`Purchase Order ${nextPoNumber} created and stock updated!`);
    } catch (error) {
      toast.error('Failed to create purchase order: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Create bulk purchase orders
  const handleBulkCreatePO = async () => {
    if (!canCreatePO) {
      toast.error('You do not have permission to create purchase orders');
      return;
    }

    if (selectedItems.length === 0) {
      toast.error('Please select at least one item');
      return;
    }

    const selectedAlerts = stockAlerts.filter((alert) => selectedItems.includes(alert.id || alert._id));
    const today = new Date().toISOString().split('T')[0];

    try {
      let createdCount = 0;
      for (const alert of selectedAlerts) {
        let supplierId = alert.product?.supplier_id || alert.supplier_id || alert.product?.supplierId || alert.supplierId;
        if (!supplierId && suppliers.length > 0) {
          supplierId = suppliers[0]._id || suppliers[0].id;
        }
        if (!supplierId) {
          toast.error(`No supplier found for ${alert.productName}. Skipping.`);
          continue;
        }

        const restockQuantity = Math.max(alert.maxStock - alert.currentStock, alert.minStock);
        const price = alert.product?.purchasePrice || alert.purchasePrice || 0;
        const total = restockQuantity * price;
        const nextPoNumber = `PO-SA-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

        const newPO = {
          poNo: nextPoNumber,
          supplierId: String(supplierId),
          date: today,
          items: [
            {
              productId: String(alert.product?._id || alert.product?.id || alert.id),
              productName: alert.productName,
              quantity: restockQuantity,
              price: price,
              total: total
            }
          ],
          totalAmount: total,
          paidAmount: 0.0,
          paymentMethod: 'Cash',
          paymentStatus: 'Credit',
          receivedStatus: 'Received',
          notes: `Auto-restock from low stock alert.`,
          createdBy: user?.username || user?.name || 'Admin'
        };

        await purchaseService.create(newPO);
        createdCount++;
      }

      await loadStockAlerts();
      toast.success(`Successfully created ${createdCount} purchase orders.`);
      setSelectedItems([]);
    } catch (error) {
      toast.error('Bulk creation failed: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Send WhatsApp alert
  const handleSendWhatsAppAlert = () => {
    toast.success('Stock alert WhatsApp notification sent to administrators and suppliers!');
    // In real app, this would send actual WhatsApp notifications
  };

  // Manual refresh
  const handleManualRefresh = () => {
    loadStockAlerts();
    setLastRefresh(new Date());
    toast.success('Stock alerts refreshed successfully!');
  };

  // Format time ago
  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  // Check permissions
  const canCreatePO = hasPermission(user?.role, 'inventory', 'create');
  const canSendEmail = hasPermission(user?.role, 'inventory', 'create') && 
                       (user?.role === 'superadmin' || user?.role === 'admin');

  // Table columns
  const columns = [
    {
      key: 'productCode',
      label: 'Product',
      render: (row) => (
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{row.productName}</p>
          <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{row.productCode}</p>
        </div>
      )
    },
    {
      key: 'category',
      label: 'Category',
      render: (row) => (
        <Badge variant="info">{row.category}</Badge>
      )
    },
    {
      key: 'currentStock',
      label: 'Current Stock',
      render: (row) => (
        <div className="text-center">
          <p className={`text-xl font-bold ${
            row.currentStock === 0 ? 'text-red-600' :
            row.alertLevel === 'Critical' ? 'text-red-500' :
            'text-orange-500'
          }`}>
            {row.currentStock}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{row.unit}</p>
        </div>
      )
    },
    {
      key: 'minStock',
      label: 'Min Stock',
      render: (row) => (
        <div className="text-center">
          <p className="font-semibold text-gray-700 dark:text-gray-300">{row.minStock}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{row.unit}</p>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => getAlertBadge(row.alertLevel)
    },
    {
      key: 'lastPurchaseDate',
      label: 'Last Purchase',
      render: (row) => {
        const dateStr = row.lastPurchaseDate;
        const isValid = dateStr && !isNaN(Date.parse(dateStr));
        return (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {isValid ? new Date(dateStr).toLocaleDateString() : 'N/A'}
          </span>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Stock Alerts</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor and manage low stock and out-of-stock items
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <FaClock />
            <span>Last refresh: {formatTimeAgo(lastRefresh)}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={<FaSync />}
            onClick={handleManualRefresh}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Alerts</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{counts.all}</p>
            </div>
            <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <FaExclamationTriangle className="text-2xl text-blue-600" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Critical</p>
              <p className="text-3xl font-bold text-red-600">{counts.critical}</p>
            </div>
            <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-red-100 dark:bg-red-900/30">
              <FaExclamationCircle className="text-2xl text-red-600" />
            </div>
          </div>
          <div className="mt-4 flex justify-center">
            <Badge variant="danger">Immediate Action Required</Badge>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Low Stock</p>
              <p className="text-3xl font-bold text-orange-600">{counts.lowStock}</p>
            </div>
            <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <FaExclamationTriangle className="text-2xl text-orange-600" />
            </div>
          </div>
          <div className="mt-4 flex justify-center">
            <Badge variant="warning">Reorder Soon</Badge>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Out of Stock</p>
              <p className="text-3xl font-bold text-red-700">{counts.outOfStock}</p>
            </div>
            <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-red-100 dark:bg-red-900/30">
              <FaTimesCircle className="text-2xl text-red-700" />
            </div>
          </div>
          <div className="mt-4 flex justify-center">
            <Badge variant="danger">Urgent</Badge>
          </div>
        </Card>
      </div>

      {/* Auto-refresh indicator */}
      <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 px-4 py-3 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center space-x-3">
          <FaSync className={`text-blue-600 ${autoRefreshEnabled ? 'animate-spin-slow' : ''}`} />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Auto-refresh: {autoRefreshEnabled ? 'Enabled' : 'Disabled'}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {autoRefreshEnabled ? 'Updates every 5 minutes' : 'Manual refresh only'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            autoRefreshEnabled
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-600'
          }`}
        >
          {autoRefreshEnabled ? 'Disable' : 'Enable'}
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'All', label: 'All Alerts', count: counts.all, color: 'blue' },
            { key: 'Critical', label: 'Critical', count: counts.critical, color: 'red' },
            { key: 'Low Stock', label: 'Low Stock', count: counts.lowStock, color: 'orange' },
            { key: 'Out of Stock', label: 'Out of Stock', count: counts.outOfStock, color: 'red' }
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeFilter === filter.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span>{filter.label}</span>
                <Badge 
                  variant={filter.color === 'blue' ? 'info' : filter.color === 'orange' ? 'warning' : 'danger'}
                  size="sm"
                >
                  {filter.count}
                </Badge>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search alerts by product, code, or category..."
          className="w-full md:w-96"
        />
        

      </div>

      {/* Alerts Table */}
      <Card title={`${activeFilter} (${filteredAlerts.length} items)`}>
        <Table
          columns={columns}
          data={filteredAlerts}
          emptyMessage="No stock alerts found"
          getRowClassName={(row) => getRowClass(row.alertLevel)}
        />
      </Card>


    </div>
  );
};

export default StockAlerts;
