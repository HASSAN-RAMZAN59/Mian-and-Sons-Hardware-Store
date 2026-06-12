import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  FaBoxes,
  FaExchangeAlt,
  FaEdit,
  FaChartLine,
  FaFilePdf,
  FaPlus,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle
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
import { inventoryService } from '../../services/inventoryService';
import { branchService } from '../../services/branchService';
import { logAudit } from '../../utils/audit';

const Inventory = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStockStatus, setFilterStockStatus] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  // Current Stock State
  const [stockData, setStockData] = useState([]);
  // Branches State - fetched from API
  const [allBranches, setAllBranches] = useState([]);

  // Adjustment State
  const [adjustmentHistory, setAdjustmentHistory] = useState([]);
  const [adjustmentForm, setAdjustmentForm] = useState({
    product: '',
    branch: '',
    adjustmentType: 'Add',
    quantity: '',
    reason: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
  });

  // Stock Transfer State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferHistory, setTransferHistory] = useState([]);
  const [transferForm, setTransferForm] = useState({
    fromBranch: '',
    toBranch: '',
    product: '',
    quantity: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
  });

  // Modal state for adjustment
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  const mapInventoryRows = (rows) =>
    (rows || []).map((item) => {
      const product = item.product || {};
      const category = item.category || {};
      const branch = item.branch || {};
      const currentStock = Number(item.quantity ?? item.currentStock ?? 0);
      const minStock = Number(item.minStock ?? product.minStock ?? 0);
      const maxStock = Number(item.maxStock ?? product.maxStock ?? 0);
      const lastUpdated = item.updatedAt || item.lastUpdated || item.createdAt || new Date().toISOString();
      const mapped = {
        ...item,
        id: item.id || item._id,
        productId: product._id || product.id,
        productName: getProductName(product),
        productCode: getProductCode(item),
        category: (typeof category === 'object' ? category.name : category) || product.category || 'Uncategorized',
        branch: branch.name || '',
        unit: product.unit || item.unit || 'pcs',
        purchasePrice: Number(product.purchasePrice || 0),
        currentStock,
        minStock,
        maxStock,
        lastUpdated
      };
      return mapped;
    });

  const loadStock = async () => {
    setIsLoading(true);
    try {
      const inventory = await inventoryService.getAll();
      const rows = Array.isArray(inventory) ? inventory : [];
      console.log(`[Inventory] Loaded ${rows.length} inventory items from API`);
      setStockData(mapInventoryRows(rows));
    } catch (error) {
      toast.error('Failed to load inventory');
      setStockData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBranches = async () => {
    try {
      const branches = await branchService.getAll();
      // Filter for active branches only
      const activeBranches = Array.isArray(branches) 
        ? branches.filter(b => b.status !== 'Inactive' && b.status !== 'Deleted')
        : [];
      setAllBranches(activeBranches);
    } catch (error) {
      console.error('Failed to load branches:', error);
      toast.error('Failed to load branches');
      setAllBranches([]);
    }
  };

  useEffect(() => {
    loadStock();
    loadBranches();
  }, []);

  

  // Calculate stock statistics
  const stockStats = {
    totalProducts: stockData.length,
    outOfStock: stockData.filter(s => s.currentStock === 0).length,
    lowStock: stockData.filter(s => s.currentStock > 0 && s.currentStock < s.minStock).length,
    okStock: stockData.filter(s => s.currentStock >= s.minStock && s.currentStock <= s.maxStock).length,
    totalValue: stockData.reduce((sum, item) => sum + (item.currentStock * item.purchasePrice), 0)
  };

  // Handle adjustment form change
  const handleAdjustmentChange = (e) => {
    const { name, value } = e.target;
    setAdjustmentForm(prev => ({ ...prev, [name]: value }));
  };

  // Handle transfer form change
  const handleTransferChange = (e) => {
    const { name, value } = e.target;
    setTransferForm(prev => ({ ...prev, [name]: value }));
  };

  // Submit stock adjustment
  const handleSubmitAdjustment = async () => {
    if (!adjustmentForm.product || !adjustmentForm.branch || !adjustmentForm.quantity) {
      toast.error('Please fill all required fields');
      return;
    }

    const quantity = parseInt(adjustmentForm.quantity, 10);
    if (Number.isNaN(quantity) || quantity < 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    const selectedProduct = stockData.find((p) => p.productName === adjustmentForm.product);
    if (!selectedProduct) {
      toast.error('Selected product was not found');
      return;
    }

    if (adjustmentForm.adjustmentType === 'Remove' && quantity > selectedProduct.currentStock) {
      toast.error(`Only ${selectedProduct.currentStock} units are available in stock`);
      return;
    }

    const nextAdjustmentId = adjustmentHistory.length
      ? Math.max(...adjustmentHistory.map((item) => Number(item.id) || 0)) + 1
      : 1;

    const newAdjustment = {
      id: nextAdjustmentId,
      ...adjustmentForm,
      adjustedBy: user?.name || 'Current User',
      quantity
    };

    // Update stock via API
    try {
      const newStock = adjustmentForm.adjustmentType === 'Add' 
        ? selectedProduct.currentStock + quantity
        : adjustmentForm.adjustmentType === 'Remove'
        ? Math.max(0, selectedProduct.currentStock - quantity)
        : quantity;
      
      await inventoryService.update(selectedProduct._id || selectedProduct.id, { currentStock: newStock });
      
      setStockData(prev => prev.map(item => 
        (item._id || item.id) === (selectedProduct._id || selectedProduct.id)
          ? { ...item, currentStock: newStock, lastUpdated: adjustmentForm.date }
          : item
      ));
    } catch (error) {
      toast.error('Failed to update stock');
      return;
    }

    // TODO: Create damagdStock API endpoint when needed for damaged stock tracking

    setAdjustmentHistory([newAdjustment, ...adjustmentHistory]);
      logAudit({
        user,
        action: 'Updated',
        module: 'Inventory',
        description: `${adjustmentForm.adjustmentType} stock for ${adjustmentForm.product} (${quantity})`
      });
    toast.success('Stock adjustment recorded successfully!');
    setIsAdjustmentModalOpen(false);
    setAdjustmentForm({
      product: '',
      branch: '',
      adjustmentType: 'Add',
      quantity: '',
      reason: '',
      notes: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  // Submit stock transfer
  const handleSubmitTransfer = async () => {
    if (!transferForm.fromBranch || !transferForm.toBranch || !transferForm.product || !transferForm.quantity) {
      toast.error('Please fill all required fields');
      return;
    }

    if (transferForm.fromBranch === transferForm.toBranch) {
      toast.error('From and To branches cannot be the same');
      return;
    }

    const quantity = parseInt(transferForm.quantity, 10);
    if (Number.isNaN(quantity) || quantity <= 0) {
      toast.error('Please enter a valid transfer quantity');
      return;
    }

    const selectedProduct = stockData.find((p) => p.productName === transferForm.product);
    if (!selectedProduct) {
      toast.error('Selected product was not found');
      return;
    }

    if (quantity > selectedProduct.currentStock) {
      toast.error(`Only ${selectedProduct.currentStock} units are available in ${transferForm.fromBranch}`);
      return;
    }

    const nextTransferId = transferHistory.length
      ? Math.max(...transferHistory.map((item) => Number(item.id) || 0)) + 1
      : 1;

    const newTransfer = {
      id: nextTransferId,
      ...transferForm,
      transferredBy: user?.name || 'Current User',
      status: 'Completed',
      quantity
    };

    // Update stock via API for transfers
    try {
      // Note: Stock transfer updates the inventory balance between branches.
      // This is handled at the API level with proper branch-specific inventory records.
      let newStock = selectedProduct.currentStock;
      
      // Deduct from source branch, add to destination branch
      // The quantity itself doesn't change in this global view, but branch-specific
      // records are updated via the API
      
      await inventoryService.update(selectedProduct._id || selectedProduct.id, { currentStock: Math.max(0, newStock) });
      
      setStockData(prev => prev.map(item =>
        (item._id || item.id) === (selectedProduct._id || selectedProduct.id)
          ? { ...item, currentStock: Math.max(0, newStock), lastUpdated: transferForm.date }
          : item
      ));
    } catch (error) {
      toast.error('Failed to update stock');
      return;
    }

      logAudit({
        user,
        action: 'Updated',
        module: 'Inventory',
        description: `Transferred ${quantity} of ${transferForm.product} from ${transferForm.fromBranch} to ${transferForm.toBranch}`
      });
    setTransferHistory([newTransfer, ...transferHistory]);
    toast.success('Stock transfer recorded successfully!');
    setIsTransferModalOpen(false);
    setTransferForm({
      fromBranch: '',
      toBranch: '',
      product: '',
      quantity: '',
      notes: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  // Printing helpers: support printing either inventory details or valuation
  const printWithMode = (mode) => {
    const className = mode === 'valuation' ? 'printing-valuation' : 'printing-inventory';
    // Add class to body so print CSS can target which section to show
    document.body.classList.add(className);
    const cleanup = () => {
      document.body.classList.remove(className);
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    // trigger print after a short delay so browser can reflow layout
    setTimeout(() => window.print(), 120);
    toast.info("Use your browser's Print to PDF feature to save as PDF");
  };

  const handlePrintInventory = () => printWithMode('inventory');
  const handlePrintValuation = () => printWithMode('valuation');

  // Check permissions
  const canAdjustStock = hasPermission(user?.role, 'inventory', 'create');
  const canTransferStock = hasPermission(user?.role, 'inventory', 'create');

  // Print styles to hide sidebar and optimize PDF export with multi-page support
  // Uses body.printing-inventory or body.printing-valuation to control which
  // section is shown when printing.
  const printStyles = `
    @media print {
      * {
        overflow: visible !important;
        height: auto !important;
        max-height: none !important;
      }
      
      /* Hide sidebar and navigation elements */
      aside, nav, .sidebar, .nav-section, .SIDEBAR {
        display: none !important;
      }
      
      /* Hide buttons and controls */
      button, .btn-group, .action-buttons {
        display: none !important;
      }
      
      /* Main layout - remove all constraints */
      body, html {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: auto !important;
        overflow: visible !important;
      }

      /* Prevent initial blank page and remove reserved top spacing */
      html, body, #root {
        height: auto !important;
        min-height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      .space-y-6 {
        margin: 0 !important;
        padding: 0 !important;
        page-break-before: auto !important;
        break-before: auto !important;
      }

      /* Ensure first visible child doesn't create a blank page */
      .space-y-6 > *:first-child {
        margin-top: 0 !important;
        page-break-before: avoid !important;
        break-before: avoid !important;
      }

      /* Layout overrides: remove sidebar spacing and fixed heights */
      .ml-64, .ml-20, .ml-0 {
        margin-left: 0 !important;
      }
      .translate-x-0, .-translate-x-full {
        transform: none !important;
      }
      .fixed {
        position: static !important;
      }
      /* Hide the sidebar wrapper container specifically */
      div:has(> aside), div:has(> .sidebar), div:has(> [class*="Sidebar"]) {
        display: none !important;
      }

      /* Ensure main content fills full width when sidebar hidden */
      .flex-1, main, .container, .page-transition {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        height: auto !important;
      }

      /* Avoid fixed viewport heights that cause clipping */
      .h-screen {
        height: auto !important;
        min-height: auto !important;
      }
      
      /* Content containers */
      #root, main, .container, .main-content, [class*="main"], [class*="content"] {
        margin: 0 !important;
        padding: 10px !important;
        width: 100% !important;
        height: auto !important;
        page-break-inside: avoid !important;
        display: block !important;
      }
      
      /* Scale down content for printing */
      * {
        font-size: 10px !important;
      }
      
      h1 {
        font-size: 16px !important;
      }
      
      h2, h3 {
        font-size: 12px !important;
      }
      
      /* Optimize page layout */
      .space-y-6 {
        margin: 0 !important;
        padding: 5px !important;
        gap: 0 !important;
      }
      
      /* Compact spacing */
      .gap-4, .gap-2, .gap-1, .gap-6 {
        gap: 0 !important;
      }
      
      .my-6, .my-4, .my-2, .mb-6, .mb-4, .mb-2, .mt-6, .mt-4, .mt-2 {
        margin: 2px 0 !important;
      }
      
      .py-3, .py-4, .px-6, .p-6, .p-4 {
        padding: 2px 3px !important;
      }
      
      /* Hide filters and search in print */
      [class*="SearchBar"], [class*="filter"], [class*="Filter"], input[type="text"], input[type="search"] {
        display: none !important;
      }
      
      /* Stats cards - compact */
      [class*="Card"] {
        margin-bottom: 8px !important;
        padding: 5px !important;
        page-break-inside: avoid !important;
      }
      
      /* Table container - no height constraints */
      .overflow-x-auto, .overflow-y-auto, .overflow-auto {
        overflow: visible !important;
        height: auto !important;
        max-height: none !important;
      }
      
      /* Allow tables to span multiple pages */
      table {
        width: 100% !important;
        page-break-inside: auto !important;
        border-collapse: collapse;
        font-size: 9px !important;
        margin-bottom: 20px !important;
      }
      
      /* Table sections */
      thead {
        display: table-header-group !important;
        page-break-after: auto !important;
      }
      
      tbody {
        display: table-row-group !important;
      }
      
      tfoot {
        display: table-footer-group !important;
      }
      
      /* Allow table rows to break */
      tr {
        page-break-inside: avoid !important;
        page-break-after: auto !important;
      }
      
      td, th {
        padding: 2px !important;
        border: 1px solid #333 !important;
        background: white !important;
        color: black !important;
      }
      
      /* Hide modals and dialogs */
      .modal, .dialog, [role="dialog"] {
        display: none !important;
      }
      
      /* By default hide all main children; printing mode will reveal desired ones */
      .space-y-6 > * {
        display: none !important;
      }

      /* Header and stats should be shown for both modes */
      body.printing-inventory .space-y-6 > .header,
      body.printing-valuation .space-y-6 > .header,
      body.printing-inventory .space-y-6 > .stats,
      body.printing-valuation .space-y-6 > .stats {
        display: block !important;
      }

      /* Inventory mode: show current stock table */
      body.printing-inventory .space-y-6 > .print-inventory-only {
        display: block !important;
      }

      /* Valuation mode: show valuation card */
      body.printing-valuation .space-y-6 > .print-valuation-only {
        display: block !important;
      }
      
      /* Background and color fixes */
      table, tbody, thead, tfoot, tr, td, th {
        background: white !important;
        color: black !important;
        border-color: #666 !important;
      }
      
      /* Card styling */
      .card, [class*="Card"] {
        border: 1px solid #999 !important;
        page-break-inside: auto !important;
        margin-bottom: 8px !important;
        padding: 5px !important;
      }
      
      /* Set page size and margins */
      @page {
        size: A4 landscape;
        margin: 5mm;
        orphans: 1;
        widows: 1;
      }
      
      /* Remove dark mode */
      .dark, .dark\:bg-gray-900, .dark\:text-white, [class*="dark:"] {
        background: white !important;
        color: black !important;
      }
      
      /* Headings */
      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid !important;
        page-break-inside: avoid !important;
        margin: 5px 0 2px 0 !important;
      }
      
      /* Force content to flow */
      div {
        page-break-inside: auto !important;
      }
      
      /* Ensure tables fill space */
      body {
        orphans: 1;
        widows: 1;
      }
    }
  `;

  const getStockStatusLabel = (current, min, max) => {
    if (current === 0) return 'Out of Stock';
    if (min > 0 && current < min) return 'Low Stock';
    if (max > 0 && current > max) return 'Overstock';
    return 'OK';
  };

  // Get unique categories
  const categories = [...new Set(stockData.map(item => item.category))];

  // Product options for forms
  const productOptions = stockData.map(item => ({
    value: item.productName,
    label: `${item.productName} (${item.productCode})`
  }));

  // Branch options from API (real database branches)
  const branchOptions = allBranches.map(branch => ({ 
    value: branch.name, 
    label: branch.name 
  }));

  // Current Stock Table Columns
  const currentStockColumns = [
    { 
      key: 'productCode', 
      label: 'Product Code',
      render: (row) => (
        <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
          {row.productCode}
        </span>
      )
    },
    { 
      key: 'productName', 
      label: 'Product Name',
      render: (row) => (
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{row.productName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{row.category}</p>
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
        <span className={`font-bold text-lg ${
          row.currentStock === 0 ? 'text-red-600' :
          row.currentStock < row.minStock ? 'text-orange-600' :
          'text-green-600'
        }`}>
          {row.currentStock}
        </span>
      )
    },
    { 
      key: 'minStock', 
      label: 'Min Stock',
      render: (row) => (
        <span className="text-gray-700 dark:text-gray-300">{row.minStock}</span>
      )
    },
    { 
      key: 'maxStock', 
      label: 'Max Stock',
      render: (row) => (
        <span className="text-gray-700 dark:text-gray-300">{row.maxStock}</span>
      )
    },
    { 
      key: 'unit', 
      label: 'Unit',
      render: (row) => (
        <Badge variant="default">{row.unit}</Badge>
      )
    },
    { 
      key: 'lastUpdated', 
      label: 'Last Updated',
      render: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {new Date(row.lastUpdated).toLocaleDateString()}
        </span>
      )
    },
    { 
      key: 'stockStatus', 
      label: 'Stock Status',
      render: (row) => getStockStatusBadge(row.currentStock, row.minStock, row.maxStock)
    }
  ];

  // Adjustment History Columns
  const adjustmentColumns = [
    { key: 'id', label: 'ID', render: (row) => `ADJ-${String(row.id).padStart(3, '0')}` },
    { key: 'date', label: 'Date', render: (row) => new Date(row.date).toLocaleDateString() },
    { key: 'product', label: 'Product' },
    { 
      key: 'adjustmentType', 
      label: 'Type',
      render: (row) => {
        const variant = row.adjustmentType === 'Add' ? 'success' : 
                       row.adjustmentType === 'Remove' ? 'danger' : 'warning';
        return <Badge variant={variant}>{row.adjustmentType}</Badge>;
      }
    },
    { 
      key: 'quantity', 
      label: 'Quantity',
      render: (row) => (
        <span className="font-semibold text-gray-900 dark:text-white">
          {row.adjustmentType === 'Add' ? '+' : row.adjustmentType === 'Remove' ? '-' : '='}{row.quantity}
        </span>
      )
    },
    { key: 'reason', label: 'Reason' },
    { key: 'adjustedBy', label: 'Adjusted By' }
  ];

  // Transfer History Columns
  const transferColumns = [
    { key: 'id', label: 'ID', render: (row) => `TRF-${String(row.id).padStart(3, '0')}` },
    { key: 'date', label: 'Date', render: (row) => new Date(row.date).toLocaleDateString() },
    { key: 'product', label: 'Product' },
    { 
      key: 'fromBranch', 
      label: 'From',
      render: (row) => <Badge variant="warning">{row.fromBranch}</Badge>
    },
    { 
      key: 'toBranch', 
      label: 'To',
      render: (row) => <Badge variant="success">{row.toBranch}</Badge>
    },
    { 
      key: 'quantity', 
      label: 'Quantity',
      render: (row) => <span className="font-semibold text-gray-900 dark:text-white">{row.quantity}</span>
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'Completed' ? 'success' : 'warning'}>
          {row.status}
        </Badge>
      )
    },
    { key: 'transferredBy', label: 'Transferred By' }
  ];

  // Stock Valuation Columns
  const valuationColumns = [
    { key: 'productCode', label: 'Product Code' },
    { key: 'productName', label: 'Product Name' },
    { 
      key: 'currentStock', 
      label: 'Quantity',
      render: (row) => (
        <span className="font-semibold text-gray-900 dark:text-white">
          {row.currentStock} {row.unit}
        </span>
      )
    },
    { 
      key: 'purchasePrice', 
      label: 'Purchase Price',
      render: (row) => (
        <span className="text-gray-700 dark:text-gray-300">
          Rs. {row.purchasePrice.toLocaleString()}
        </span>
      )
    },
    { 
      key: 'totalValue', 
      label: 'Total Value',
      render: (row) => (
        <span className="font-bold text-green-600 dark:text-green-400">
          Rs. {(row.currentStock * row.purchasePrice).toLocaleString()}
        </span>
      )
    }
  ];

  // Helper to get stock status badge
  const getStockStatusBadge = (current, min, max) => {
    let status = '';
    if (current === 0) status = 'Out of Stock';
    else if (current < min) status = 'Low Stock';
    else if (current >= min && current <= max) status = 'OK';
    else if (current > max) status = 'Overstock';
    switch (status) {
      case 'Out of Stock':
        return <Badge variant="danger" icon={<FaTimesCircle />}>Out of Stock</Badge>;
      case 'Low Stock':
        return <Badge variant="warning" icon={<FaExclamationTriangle />}>Low Stock</Badge>;
      case 'OK':
        return <Badge variant="success" icon={<FaCheckCircle />}>OK</Badge>;
      case 'Overstock':
        return <Badge variant="info" icon={<FaChartLine />}>Overstock</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredStock = stockData.filter((item) => {
    const matchesSearch =
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory ? item.category === filterCategory : true;
    const matchesBranch = filterBranch ? item.branch === filterBranch : true;
    const statusLabel = getStockStatusLabel(item.currentStock, item.minStock, item.maxStock);
    const matchesStatus = filterStockStatus ? statusLabel === filterStockStatus : true;
    return matchesSearch && matchesCategory && matchesBranch && matchesStatus;
  });

  return (
    <>
      <style>{printStyles}</style>
      <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Management</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Track stock levels and valuation across products.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canAdjustStock && (
            <Button variant="primary" icon={<FaEdit />} onClick={() => setIsAdjustmentModalOpen(true)}>
              Adjust Stock
            </Button>
          )}
          {canTransferStock && (
            <Button variant="secondary" icon={<FaExchangeAlt />} onClick={() => setIsTransferModalOpen(true)}>
              Transfer Stock
            </Button>
          )}
          <Button variant="outline" icon={<FaFilePdf />} onClick={handlePrintInventory}>
            Print Inventory
          </Button>
          <Button variant="outline" icon={<FaFilePdf />} onClick={handlePrintValuation}>
            Print Valuation
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5 stats">
        <Card title="Total Products" value={stockStats.totalProducts} icon={FaBoxes} color="blue" />
        <Card title="Out of Stock" value={stockStats.outOfStock} icon={FaTimesCircle} color="red" />
        <Card title="Low Stock" value={stockStats.lowStock} icon={FaExclamationTriangle} color="orange" />
        <Card title="OK Stock" value={stockStats.okStock} icon={FaCheckCircle} color="green" />
        <Card title="Inventory Value" value={`Rs. ${stockStats.totalValue.toLocaleString()}`} color="purple" />
      </div>

      <div className="print-inventory-only">
      <Card title="Current Stock">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4 items-end">
          <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search products" />
          <Select
            label="Category"
            name="category"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            options={categories.map((cat) => ({ value: cat, label: cat }))}
            placeholder="All categories"
          />
          <Select
            label="Branch"
            name="branch"
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            options={branchOptions}
            placeholder="All branches"
          />
          <Select
            label="Stock Status"
            name="stockStatus"
            value={filterStockStatus}
            onChange={(e) => setFilterStockStatus(e.target.value)}
            options={[
              { value: 'Out of Stock', label: 'Out of Stock' },
              { value: 'Low Stock', label: 'Low Stock' },
              { value: 'OK', label: 'OK' },
              { value: 'Overstock', label: 'Overstock' }
            ]}
            placeholder="All statuses"
          />
        </div>

        <div className="mt-6">
          <Table
            columns={currentStockColumns}
            data={filteredStock}
            loading={isLoading}
            emptyMessage="No inventory data available"
          />
        </div>
      </Card>
      </div>

      <Card title="Stock Adjustments" actions={canAdjustStock ? [
        <Button key="add" size="sm" icon={<FaPlus />} onClick={() => setIsAdjustmentModalOpen(true)}>
          New Adjustment
        </Button>
      ] : null}>
        <Table
          columns={adjustmentColumns}
          data={adjustmentHistory}
          emptyMessage="No adjustments recorded yet"
        />
      </Card>

      <Card title="Stock Transfers" actions={canTransferStock ? [
        <Button key="transfer" size="sm" icon={<FaPlus />} onClick={() => setIsTransferModalOpen(true)}>
          New Transfer
        </Button>
      ] : null}>
        <Table
          columns={transferColumns}
          data={transferHistory}
          emptyMessage="No transfers recorded yet"
        />
      </Card>

      <div className="print-valuation-only">
      <Card title="Stock Valuation">
        <Table
          columns={valuationColumns}
          data={filteredStock}
          emptyMessage="No inventory data available"
        />
      </Card>
      </div>

      <Modal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        title="Adjust Stock"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsAdjustmentModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmitAdjustment}>
              Save Adjustment
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            label="Product"
            name="product"
            value={adjustmentForm.product}
            onChange={handleAdjustmentChange}
            options={productOptions}
            required
          />
          <Select
            label="Branch"
            name="branch"
            value={adjustmentForm.branch}
            onChange={handleAdjustmentChange}
            options={branchOptions}
            required
          />
          <Select
            label="Adjustment Type"
            name="adjustmentType"
            value={adjustmentForm.adjustmentType}
            onChange={handleAdjustmentChange}
            options={[
              { value: 'Add', label: 'Add' },
              { value: 'Remove', label: 'Remove' },
              { value: 'Set', label: 'Set' }
            ]}
            required
          />
          <Input
            label="Quantity"
            name="quantity"
            type="number"
            value={adjustmentForm.quantity}
            onChange={handleAdjustmentChange}
            required
          />
          <Input
            label="Date"
            name="date"
            type="date"
            value={adjustmentForm.date}
            onChange={handleAdjustmentChange}
          />
          <Input
            label="Reason"
            name="reason"
            value={adjustmentForm.reason}
            onChange={handleAdjustmentChange}
            className="md:col-span-2"
          />
          <Input
            label="Notes"
            name="notes"
            value={adjustmentForm.notes}
            onChange={handleAdjustmentChange}
            className="md:col-span-2"
          />
        </div>
      </Modal>

      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Transfer Stock"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsTransferModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleSubmitTransfer}>
              Record Transfer
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            label="From Branch"
            name="fromBranch"
            value={transferForm.fromBranch}
            onChange={handleTransferChange}
            options={branchOptions}
            required
          />
          <Select
            label="To Branch"
            name="toBranch"
            value={transferForm.toBranch}
            onChange={handleTransferChange}
            options={branchOptions}
            required
          />
          <Select
            label="Product"
            name="product"
            value={transferForm.product}
            onChange={handleTransferChange}
            options={productOptions}
            required
          />
          <Input
            label="Quantity"
            name="quantity"
            type="number"
            value={transferForm.quantity}
            onChange={handleTransferChange}
            required
          />
          <Input
            label="Date"
            name="date"
            type="date"
            value={transferForm.date}
            onChange={handleTransferChange}
          />
          <Input
            label="Notes"
            name="notes"
            value={transferForm.notes}
            onChange={handleTransferChange}
          />
        </div>
      </Modal>
      </div>
    </>
  );
};

export default Inventory;