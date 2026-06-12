import React, { useEffect, useRef, useState } from 'react';
import { FaBoxes, FaFileExport, FaPrint, FaExclamationTriangle, FaSkull, FaExchangeAlt, FaDollarSign, FaChartPie, FaChartBar } from 'react-icons/fa';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { Navigate } from 'react-router-dom';
import { reportService } from '../../services/reportService';



const toSku = (id) => `PRD-${String(id).padStart(3, '0')}`;

const mapStockRows = (rows = []) =>
  (Array.isArray(rows) ? rows : []).map((row) => {
    const currentStock = Number(row.currentStock ?? row.stockQty ?? row.stock ?? 0);
    const unitPrice = Number(row.salePrice ?? row.unitPrice ?? row.price ?? 0);
    const lastUpdated = row.lastUpdated || new Date().toISOString().split('T')[0];

    return {
      id: row.productCode || toSku(row.id),
      name: row.productName || row.name || 'Product',
      category: row.category || 'General',
      sku: row.productCode || toSku(row.id),
      currentStock,
      minStock: Number(row.minStock ?? 5),
      maxStock: Number(row.maxStock ?? Math.max(currentStock * 2, 20)),
      unitPrice,
      totalValue: currentStock * unitPrice,
      lastSaleDate: lastUpdated,
      lastPurchaseDate: lastUpdated,
      inQuantity: 0,
      outQuantity: 0,
      supplier: row.brand || row.company || 'Local Supplier'
    };
  });

const mapProductsToInventory = (rows = []) =>
  (Array.isArray(rows) ? rows : []).map((product) => {
    const currentStock = Number(product.currentStock ?? product.stockQty ?? product.stock ?? 0);
    const unitPrice = Number(product.salePrice ?? product.price ?? 0);
    const lastUpdated = new Date().toISOString().split('T')[0];

    return {
      id: toSku(product.id),
      name: product.name,
      category: product.category || 'General',
      sku: toSku(product.id),
      currentStock,
      minStock: Number(product.minStock ?? 5),
      maxStock: Number(product.maxStock ?? Math.max(currentStock * 2, 20)),
      unitPrice,
      totalValue: currentStock * unitPrice,
      lastSaleDate: lastUpdated,
      lastPurchaseDate: lastUpdated,
      inQuantity: 0,
      outQuantity: 0,
      supplier: product.brand || product.company || 'Local Supplier'
    };
  });

const InventoryReport = () => {
  const { user } = useAuth();
  const printRef = useRef();
  const [activeTab, setActiveTab] = useState('stock-summary');
  const [inventoryData, setInventoryData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadInventory = async () => {
    setIsLoading(true);
    try {
      const data = await reportService.getInventoryReport();
      const list = Array.isArray(data) ? data : data?.inventory || [];
      setInventoryData(list);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load dynamic inventory report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    toast.error('Access denied. This page is only accessible to administrators.');
    return <Navigate to="/dashboard" replace />;
  }

  // Calculate total inventory value
  const totalInventoryValue = inventoryData.reduce((sum, item) => sum + item.totalValue, 0);
  const totalProducts = inventoryData.length;
  const lowStockItems = inventoryData.filter((item) => item.currentStock < item.minStock);
  
  // Dead stock - no sale in last 90 days or never sold
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const deadStockItems = inventoryData.filter((item) => {
    if (!item.lastSaleDate) return true;
    const lastSale = new Date(item.lastSaleDate);
    return lastSale < ninetyDaysAgo;
  });

  // Category-wise distribution
  const categoryData = {};
  inventoryData.forEach((item) => {
    if (!categoryData[item.category]) {
      categoryData[item.category] = { name: item.category, value: 0, quantity: 0 };
    }
    categoryData[item.category].value += item.totalValue;
    categoryData[item.category].quantity += item.currentStock;
  });
  const categoryChartData = Object.values(categoryData);

  // Top 20 products by quantity
  const topProductsData = [...inventoryData]
    .sort((a, b) => b.currentStock - a.currentStock)
    .slice(0, 20)
    .map((item) => ({
      name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
      quantity: item.currentStock,
      value: item.totalValue,
    }));

  // Stock movement data
  const stockMovementData = inventoryData.map((item) => ({
    ...item,
    netMovement: item.inQuantity - item.outQuantity,
  }));

  // Colors for charts
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Handle Print
  const handlePrint = () => {
    window.print();
  };

  // Handle Export to Excel
  const handleExportExcel = () => {
    let data = [];
    let filename = '';

    switch (activeTab) {
      case 'stock-summary':
        data = inventoryData;
        filename = 'stock_summary';
        break;
      case 'low-stock':
        data = lowStockItems;
        filename = 'low_stock_report';
        break;
      case 'dead-stock':
        data = deadStockItems;
        filename = 'dead_stock_report';
        break;
      case 'stock-movement':
        data = stockMovementData;
        filename = 'stock_movement';
        break;
      case 'stock-valuation':
        data = categoryChartData;
        filename = 'stock_valuation';
        break;
      default:
        data = inventoryData;
        filename = 'inventory_report';
    }

    const headers = ['SKU', 'Product', 'Category', 'Current Stock', 'Min Stock', 'Unit Price', 'Total Value'];
    const rows = data.map((item) => [
      item.sku || item.name,
      item.name,
      item.category,
      item.currentStock || item.quantity,
      item.minStock || '-',
      item.unitPrice || '-',
      item.totalValue || item.value,
    ]);

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += headers.join(',') + '\n';
    rows.forEach((row) => {
      csvContent += row.map((cell) => `"${cell}"`).join(',') + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Report exported successfully!');
  };

  // Handle Export to PDF
  const handleExportPDF = () => {
    window.print();
    toast.info("Use your browser's Print to PDF feature to save as PDF");
  };

  // Tab navigation
  const tabs = [
    { id: 'stock-summary', label: 'Stock Summary', icon: FaBoxes },
    { id: 'low-stock', label: 'Low Stock Report', icon: FaExclamationTriangle },
    { id: 'dead-stock', label: 'Dead Stock Report', icon: FaSkull },
    { id: 'stock-movement', label: 'Stock Movement', icon: FaExchangeAlt },
    { id: 'stock-valuation', label: 'Stock Valuation', icon: FaDollarSign },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-800">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400 font-semibold text-lg animate-pulse">
          Compiling live inventory data...
        </p>
      </div>
    );
  }

  return (
    <div ref={printRef}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 print:mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white print:text-black">Inventory Report</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 print:text-gray-700">
            Comprehensive inventory analytics and stock management
          </p>
        </div>
        <div className="flex space-x-3 print:hidden">
          <Button onClick={handlePrint} variant="secondary">
            <FaPrint className="mr-2" />
            Print
          </Button>
          <Button onClick={handleExportExcel} variant="secondary">
            <FaFileExport className="mr-2" />
            Export Excel
          </Button>
          <Button onClick={handleExportPDF}>
            <FaFileExport className="mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 print:mb-4">
        <Card className="print:border print:border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-700">Total Products</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1 print:text-black">{totalProducts}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg print:bg-blue-100">
              <FaBoxes className="text-2xl text-blue-600 dark:text-blue-400 print:text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="print:border print:border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-700">Total Value</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1 print:text-black">
                {formatCurrency(totalInventoryValue)}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg print:bg-green-100">
              <FaDollarSign className="text-2xl text-green-600 dark:text-green-400 print:text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="print:border print:border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-700">Low Stock Items</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1 print:text-black">
                {lowStockItems.length}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg print:bg-yellow-100">
              <FaExclamationTriangle className="text-2xl text-yellow-600 dark:text-yellow-400 print:text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="print:border print:border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-700">Dead Stock Items</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1 print:text-black">
                {deadStockItems.length}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg print:bg-red-100">
              <FaSkull className="text-2xl text-red-600 dark:text-red-400 print:text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 print:grid-cols-1 print:mb-4">
        {/* Category-wise Stock Distribution */}
        <Card className="print:border print:border-gray-300 print:page-break-inside-avoid">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 print:text-black flex items-center">
            <FaChartPie className="mr-2" />
            Category-wise Stock Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {categoryChartData.map((cat, index) => (
              <div key={cat.name} className="flex justify-between items-center text-sm">
                <div className="flex items-center">
                  <div
                    className="w-4 h-4 rounded mr-2"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="text-gray-700 dark:text-gray-300 print:text-black">{cat.name}</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white print:text-black">
                  {formatCurrency(cat.value)} ({cat.quantity} units)
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Top 20 Products by Quantity */}
        <Card className="print:border print:border-gray-300 print:page-break-inside-avoid">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 print:text-black flex items-center">
            <FaChartBar className="mr-2" />
            Top 20 Products by Stock Quantity
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProductsData.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} />
              <Tooltip formatter={(value, name) => (name === 'value' ? formatCurrency(value) : value)} />
              <Legend />
              <Bar dataKey="quantity" fill="#3B82F6" name="Quantity" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Tabs */}
      <div className="mb-6 print:mb-4">
        <div className="border-b border-gray-200 dark:border-gray-700 print:hidden">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <Icon className="mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'stock-summary' && (
        <Card className="print:border print:border-gray-300">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 print:text-black">
            Stock Summary - Product-wise Current Stock
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 print:divide-gray-300">
              <thead className="bg-gray-50 dark:bg-gray-800 print:bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                    Product Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                    Current Stock
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                    Min Stock
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                    Max Stock
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                    Unit Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                    Total Value
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700 print:bg-white print:divide-gray-300">
                {inventoryData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 print:hover:bg-white">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white print:text-black">
                      {item.sku}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white print:text-black">
                      {item.name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white print:text-black">
                      {item.category}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white print:text-black">
                      {item.currentStock}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400 print:text-gray-700">
                      {item.minStock}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400 print:text-gray-700">
                      {item.maxStock}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white print:text-black">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-gray-900 dark:text-white print:text-black">
                      {formatCurrency(item.totalValue)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {item.currentStock < item.minStock ? (
                        <Badge variant="danger">Low Stock</Badge>
                      ) : item.currentStock > item.maxStock * 0.8 ? (
                        <Badge variant="warning">High Stock</Badge>
                      ) : (
                        <Badge variant="success">Normal</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-800 print:bg-gray-100">
                <tr className="font-bold">
                  <td colSpan="7" className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white print:text-black">
                    TOTAL:
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white print:text-black">
                    {formatCurrency(totalInventoryValue)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'low-stock' && (
        <Card className="print:border print:border-gray-300">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 print:text-black flex items-center">
            <FaExclamationTriangle className="text-yellow-600 mr-2" />
            Low Stock Report - Items Below Minimum Level
          </h2>
          {lowStockItems.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-center py-8">No low stock items found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 print:divide-gray-300">
                <thead className="bg-gray-50 dark:bg-gray-800 print:bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                      Category
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                      Current Stock
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                      Min Stock
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                      Shortage
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                      Supplier
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                      Reorder Value
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700 print:bg-white print:divide-gray-300">
                  {lowStockItems.map((item) => {
                    const shortage = item.minStock - item.currentStock;
                    const reorderValue = shortage * item.unitPrice;
                    return (
                      <tr key={item.id} className="bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white print:text-black">
                          {item.name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white print:text-black">
                          {item.category}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-red-600 dark:text-red-400 font-semibold print:text-red-700">
                          {item.currentStock}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white print:text-black">
                          {item.minStock}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-red-600 dark:text-red-400 font-semibold print:text-red-700">
                          {shortage}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white print:text-black">
                          {item.supplier}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-gray-900 dark:text-white print:text-black">
                          {formatCurrency(reorderValue)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'dead-stock' && (
        <Card className="print:border print:border-gray-300">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 print:text-black flex items-center">
            <FaSkull className="text-red-600 mr-2" />
            Dead Stock Report - No Sales in Last 90 Days
          </h2>
          {deadStockItems.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-center py-8">No dead stock items found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 print:divide-gray-300">
                <thead className="bg-gray-50 dark:bg-gray-800 print:bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                      Category
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                      Current Stock
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                      Stock Value
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                      Last Sale Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                      Days Since Sale
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700 print:bg-white print:divide-gray-300">
                  {deadStockItems.map((item) => {
                    const lastSale = new Date(item.lastSaleDate);
                    const today = new Date();
                    const daysSinceSale = Math.floor((today - lastSale) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={item.id} className="bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white print:text-black">
                          {item.name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white print:text-black">
                          {item.category}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white print:text-black">
                          {item.currentStock}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white print:text-black">
                          {formatCurrency(item.totalValue)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white print:text-black">
                          {new Date(item.lastSaleDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-red-600 dark:text-red-400 font-semibold print:text-red-700">
                          {daysSinceSale} days
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'stock-movement' && (
        <Card className="print:border print:border-gray-300">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 print:text-black flex items-center">
            <FaExchangeAlt className="text-blue-600 mr-2" />
            Stock Movement - Product In/Out History
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 print:divide-gray-300">
              <thead className="bg-gray-50 dark:bg-gray-800 print:bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                    Stock In
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                    Stock Out
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                    Net Movement
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                    Current Stock
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                    Last Purchase
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                    Last Sale
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700 print:bg-white print:divide-gray-300">
                {stockMovementData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 print:hover:bg-white">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white print:text-black">
                      {item.name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white print:text-black">
                      {item.category}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-green-600 dark:text-green-400 font-semibold print:text-green-700">
                      +{item.inQuantity}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-red-600 dark:text-red-400 font-semibold print:text-red-700">
                      -{item.outQuantity}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-gray-900 dark:text-white print:text-black">
                      {item.netMovement > 0 ? '+' : ''}
                      {item.netMovement}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white print:text-black">
                      {item.currentStock}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white print:text-black">
                      {new Date(item.lastPurchaseDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white print:text-black">
                      {new Date(item.lastSaleDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'stock-valuation' && (
        <Card className="print:border print:border-gray-300">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 print:text-black flex items-center">
            <FaDollarSign className="text-green-600 mr-2" />
            Stock Valuation - Total Inventory Value by Category
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 print:divide-gray-300">
              <thead className="bg-gray-50 dark:bg-gray-800 print:bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                    Total Quantity
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                    Total Value
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                    % of Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700 print:bg-white print:divide-gray-300">
                {categoryChartData.map((cat) => {
                  const percentage = (cat.value / totalInventoryValue) * 100;
                  return (
                    <tr key={cat.name} className="hover:bg-gray-50 dark:hover:bg-gray-800 print:hover:bg-white">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white print:text-black">
                        {cat.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white print:text-black">
                        {cat.quantity}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-gray-900 dark:text-white print:text-black">
                        {formatCurrency(cat.value)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white print:text-black">
                        {percentage.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-800 print:bg-gray-100">
                <tr className="font-bold">
                  <td className="px-4 py-3 text-left text-sm text-gray-900 dark:text-white print:text-black">TOTAL</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white print:text-black">
                    {categoryChartData.reduce((sum, cat) => sum + cat.quantity, 0)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white print:text-black">
                    {formatCurrency(totalInventoryValue)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white print:text-black">
                    100%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #root, #root * {
            visibility: visible;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:page-break-inside-avoid {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
};

export default InventoryReport;
