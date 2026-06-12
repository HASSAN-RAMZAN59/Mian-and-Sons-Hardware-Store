import React, { useEffect, useRef, useState } from 'react';
import { FaChartLine, FaFileExport, FaPrint, FaFilter, FaMoneyBillWave, FaReceipt, FaPercentage, FaChartPie } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Badge from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { Navigate } from 'react-router-dom';
import { orderService } from '../../services/orderService';

const SalesReport = () => {
  const { user } = useAuth();
  const printRef = useRef();

  const normalizeProducts = (items = []) =>
    (Array.isArray(items) ? items : []).map((item) => {
      return {
        name: item?.productName || item?.name || item?.title || 'Item',
        category: item?.category || 'General',
        quantity: Number(item?.quantity ?? item?.qty ?? 0),
        price: Number(item?.unitPrice ?? item?.price ?? 0),
        discount: Number(item?.discount ?? 0)
      };
    });

  const mapPosSales = (rows) =>
    (Array.isArray(rows) ? rows : []).map((sale) => {
      const products = normalizeProducts(sale.items);
      const createdAt = sale.createdAt || sale.date;
      const date = createdAt ? new Date(createdAt).toISOString().split('T')[0] : '';
      const time = createdAt ? new Date(createdAt).toLocaleTimeString() : '';
      return {
        id: `POS-${String(sale._id || sale.id).slice(-4).padStart(4, '0')}`,
        date,
        time,
        customer: sale.customer?.fullName || sale.customer?.name || 'Walk-in Customer',
        products,
        paymentMethod: sale.paymentMethod || 'Cash',
        branch: sale.branch || 'Main Branch',
        cashier: sale.cashier || 'POS',
        subtotal: Number(sale.totals?.subtotal ?? 0),
        discount: Number(sale.totals?.discount ?? 0),
        total: Number(sale.totals?.grandTotal ?? 0)
      };
    });

  const mapWebsiteOrders = (rows) =>
    (Array.isArray(rows) ? rows : []).map((order, index) => {
      const createdAt = order.createdAt || order.date;
      const date = createdAt ? new Date(createdAt).toISOString().split('T')[0] : '';
      const time = createdAt ? new Date(createdAt).toLocaleTimeString() : '';
      const products = normalizeProducts(order.items);
      const subtotal = Number(order.totals?.subtotal ?? order.amount ?? 0);
      const discount = Number(order.totals?.discount ?? 0);
      const total = Number(order.totals?.grandTotal ?? order.amount ?? 0);

      return {
        id: `WEB-${order.id || String(index + 1).padStart(4, '0')}`,
        date,
        time,
        customer: order.customer?.fullName || order.customer?.name || order.customer?.email || 'Website Customer',
        products,
        paymentMethod: order.paymentMethod || 'COD',
        branch: 'Online Store',
        cashier: 'Website',
        subtotal,
        discount,
        total
      };
    });

  // Filter State
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    customer: 'All',
    product: 'All',
    category: 'All',
    paymentMethod: 'All',
    branch: 'All',
    cashier: 'All',
  });

  const [allSales, setAllSales] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadSales = async () => {
    setIsLoading(true);
    try {
      const orders = await orderService.getAll();
      const posSales = mapPosSales((Array.isArray(orders) ? orders : []).filter(o => o.source === 'pos'));
      const websiteSales = mapWebsiteOrders((Array.isArray(orders) ? orders : []).filter(o => o.source === 'website'));
      const merged = [...posSales, ...websiteSales].filter((sale) => sale.date);
      setAllSales(merged);
    } catch (error) {
      toast.error('Failed to load sales data');
      setAllSales([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  // Check if user has access (admin or superadmin only)
  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    toast.error('Access denied. This page is only accessible to administrators.');
    return <Navigate to="/dashboard" replace />;
  }

  // Sales data comes from localStorage (POS + Website orders)

  // Filter Sales
  const filteredSales = allSales.filter((sale) => {
    const saleDate = new Date(sale.date);
    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);

    if (saleDate < start || saleDate > end) return false;
    if (filters.customer !== 'All' && sale.customer !== filters.customer) return false;
    if (filters.paymentMethod !== 'All' && sale.paymentMethod !== filters.paymentMethod) return false;
    if (filters.branch !== 'All' && sale.branch !== filters.branch) return false;
    if (filters.cashier !== 'All' && sale.cashier !== filters.cashier) return false;
    if (filters.product !== 'All') {
      const hasProduct = sale.products.some((p) => p.name === filters.product);
      if (!hasProduct) return false;
    }
    if (filters.category !== 'All') {
      const hasCategory = sale.products.some((p) => p.category === filters.category);
      if (!hasCategory) return false;
    }

    return true;
  });

  // Calculate Summary Statistics
  const totalSales = filteredSales.length;
  const totalAmount = filteredSales.reduce((sum, sale) => sum + sale.subtotal, 0);
  const totalDiscount = filteredSales.reduce((sum, sale) => sum + sale.discount, 0);
  const netRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const averageSaleValue = totalSales > 0 ? netRevenue / totalSales : 0;

  // Prepare Daily Sales Chart Data
  const dailySalesData = {};
  filteredSales.forEach((sale) => {
    const date = sale.date;
    if (!dailySalesData[date]) {
      dailySalesData[date] = { date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), sales: 0, revenue: 0 };
    }
    dailySalesData[date].sales += 1;
    dailySalesData[date].revenue += sale.total;
  });
  const dailySalesChartData = Object.values(dailySalesData).sort((a, b) => new Date(a.date) - new Date(b.date));

  // Prepare Payment Method Chart Data
  const paymentMethodData = {};
  filteredSales.forEach((sale) => {
    if (!paymentMethodData[sale.paymentMethod]) {
      paymentMethodData[sale.paymentMethod] = { name: sale.paymentMethod, value: 0, count: 0 };
    }
    paymentMethodData[sale.paymentMethod].value += sale.total;
    paymentMethodData[sale.paymentMethod].count += 1;
  });
  const paymentMethodChartData = Object.values(paymentMethodData);

  // Prepare Top Products Chart Data
  const productStats = {};
  filteredSales.forEach((sale) => {
    sale.products.forEach((product) => {
      if (!productStats[product.name]) {
        productStats[product.name] = { name: product.name, quantity: 0, revenue: 0 };
      }
      productStats[product.name].quantity += product.quantity;
      productStats[product.name].revenue += product.quantity * product.price * (1 - product.discount / 100);
    });
  });
  const topProductsData = Object.values(productStats)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  // Get unique values for filters
  const uniqueCustomers = ['All', ...new Set(allSales.map((s) => s.customer))];
  const uniqueProducts = ['All', ...new Set(allSales.flatMap((s) => s.products.map((p) => p.name)))];
  const uniqueCategories = ['All', ...new Set(allSales.flatMap((s) => s.products.map((p) => p.category)))];
  const uniquePaymentMethods = ['All', ...new Set(allSales.map((s) => s.paymentMethod))];
  const uniqueBranches = ['All', ...new Set(allSales.map((s) => s.branch))];
  const uniqueCashiers = ['All', ...new Set(allSales.map((s) => s.cashier))];

  // Colors for charts
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

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
    const headers = ['Sale ID', 'Date', 'Time', 'Customer', 'Products', 'Payment Method', 'Branch', 'Cashier', 'Subtotal', 'Discount', 'Total'];
    const rows = filteredSales.map((sale) => [
      sale.id,
      sale.date,
      sale.time,
      sale.customer,
      sale.products.map((p) => `${p.name} (${p.quantity})`).join(', '),
      sale.paymentMethod,
      sale.branch,
      sale.cashier,
      sale.subtotal,
      sale.discount,
      sale.total,
    ]);

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += headers.join(',') + '\n';
    rows.forEach((row) => {
      csvContent += row.map((cell) => `"${cell}"`).join(',') + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sales_report_${filters.startDate}_to_${filters.endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Sales report exported successfully!');
  };

  // Handle Export to PDF (Simple implementation)
  const handleExportPDF = () => {
    window.print(); // Using browser's print to PDF feature
    toast.info('Use your browser\'s Print to PDF feature to save as PDF');
  };

  return (
    <div ref={printRef}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 print:mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white print:text-black">Sales Report</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 print:text-gray-700">
            Comprehensive sales analytics and reporting
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

      {/* Filter Section */}
      <Card className="mb-6 print:mb-4 print:border print:border-gray-300">
        <div className="flex items-center mb-4">
          <FaFilter className="text-blue-600 dark:text-blue-400 mr-2" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-white print:text-black">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 print:text-black">
              Start Date
            </label>
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 print:text-black">
              End Date
            </label>
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>

          {/* Customer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 print:text-black">
              Customer
            </label>
            <Select value={filters.customer} onChange={(e) => setFilters({ ...filters, customer: e.target.value })}>
              {uniqueCustomers.map((customer) => (
                <option key={customer} value={customer}>
                  {customer}
                </option>
              ))}
            </Select>
          </div>

          {/* Product */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 print:text-black">
              Product
            </label>
            <Select value={filters.product} onChange={(e) => setFilters({ ...filters, product: e.target.value })}>
              {uniqueProducts.map((product) => (
                <option key={product} value={product}>
                  {product}
                </option>
              ))}
            </Select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 print:text-black">
              Category
            </label>
            <Select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
              {uniqueCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 print:text-black">
              Payment Method
            </label>
            <Select
              value={filters.paymentMethod}
              onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
            >
              {uniquePaymentMethods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </Select>
          </div>

          {/* Branch */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 print:text-black">
              Branch
            </label>
            <Select value={filters.branch} onChange={(e) => setFilters({ ...filters, branch: e.target.value })}>
              {uniqueBranches.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </Select>
          </div>

          {/* Cashier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 print:text-black">
              Cashier
            </label>
            <Select value={filters.cashier} onChange={(e) => setFilters({ ...filters, cashier: e.target.value })}>
              {uniqueCashiers.map((cashier) => (
                <option key={cashier} value={cashier}>
                  {cashier}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 print:mb-4">
        <Card className="print:border print:border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-700">Total Sales</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1 print:text-black">{totalSales}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg print:bg-blue-100">
              <FaReceipt className="text-2xl text-blue-600 dark:text-blue-400 print:text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="print:border print:border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-700">Total Amount</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1 print:text-black">
                {formatCurrency(totalAmount)}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg print:bg-green-100">
              <FaMoneyBillWave className="text-2xl text-green-600 dark:text-green-400 print:text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="print:border print:border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-700">Total Discount</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1 print:text-black">
                {formatCurrency(totalDiscount)}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg print:bg-red-100">
              <FaPercentage className="text-2xl text-red-600 dark:text-red-400 print:text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="print:border print:border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-700">Net Revenue</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1 print:text-black">
                {formatCurrency(netRevenue)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg print:bg-purple-100">
              <FaChartLine className="text-2xl text-purple-600 dark:text-purple-400 print:text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="print:border print:border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-700">Avg Sale Value</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1 print:text-black">
                {formatCurrency(averageSaleValue)}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg print:bg-yellow-100">
              <FaChartPie className="text-2xl text-yellow-600 dark:text-yellow-400 print:text-yellow-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 print:grid-cols-1 print:mb-4">
        {/* Daily Sales Bar Chart */}
        <Card className="print:border print:border-gray-300 print:page-break-inside-avoid">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 print:text-black">Daily Sales Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailySalesChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" orientation="left" stroke="#3B82F6" />
              <YAxis yAxisId="right" orientation="right" stroke="#10B981" />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'revenue') return [formatCurrency(value), 'Revenue'];
                  return [value, 'Sales Count'];
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="sales" fill="#3B82F6" name="Sales Count" />
              <Bar yAxisId="right" dataKey="revenue" fill="#10B981" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Payment Method Pie Chart */}
        <Card className="print:border print:border-gray-300 print:page-break-inside-avoid">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 print:text-black">
            Payment Method Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={paymentMethodChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {paymentMethodChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {paymentMethodChartData.map((method, index) => (
              <div key={method.name} className="flex justify-between items-center text-sm">
                <div className="flex items-center">
                  <div
                    className="w-4 h-4 rounded mr-2"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="text-gray-700 dark:text-gray-300 print:text-black">{method.name}</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white print:text-black">
                  {formatCurrency(method.value)} ({method.count} sales)
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top 10 Products Chart */}
      <Card className="mb-6 print:mb-4 print:border print:border-gray-300 print:page-break-inside-avoid">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 print:text-black">
          Top 10 Products by Quantity Sold
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={topProductsData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={150} />
            <Tooltip
              formatter={(value, name) => {
                if (name === 'revenue') return [formatCurrency(value), 'Revenue'];
                return [value, 'Quantity'];
              }}
            />
            <Legend />
            <Bar dataKey="quantity" fill="#3B82F6" name="Quantity Sold" />
            <Bar dataKey="revenue" fill="#10B981" name="Revenue" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Detailed Sales Table */}
      <Card className="print:border print:border-gray-300">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 print:text-black">
          Detailed Sales Records
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 print:divide-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-800 print:bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider print:text-black">
                  Sale ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider print:text-black">
                  Date & Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider print:text-black">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider print:text-black">
                  Products
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider print:text-black">
                  Payment
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider print:text-black">
                  Branch
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider print:text-black">
                  Cashier
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider print:text-black">
                  Subtotal
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider print:text-black">
                  Discount
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider print:text-black">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700 print:bg-white print:divide-gray-300">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 print:hover:bg-white">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white print:text-black">
                    {sale.id}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white print:text-black">
                    <div>{new Date(sale.date).toLocaleDateString()}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 print:text-gray-600">{sale.time}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white print:text-black">
                    {sale.customer}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white print:text-black">
                    <div className="max-w-xs">
                      {sale.products.map((p, idx) => (
                        <div key={idx} className="text-xs">
                          {p.name} x{p.quantity}
                          {p.discount > 0 && (
                            <span className="text-green-600 dark:text-green-400 ml-1 print:text-green-700">
                              (-{p.discount}%)
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm print:text-black">
                    <Badge
                      variant={
                        sale.paymentMethod === 'Cash'
                          ? 'success'
                          : sale.paymentMethod === 'Card'
                          ? 'info'
                          : 'warning'
                      }
                    >
                      {sale.paymentMethod}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white print:text-black">
                    {sale.branch}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white print:text-black">
                    {sale.cashier}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white print:text-black">
                    {formatCurrency(sale.subtotal)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-red-600 dark:text-red-400 font-medium print:text-red-700">
                    {formatCurrency(sale.discount)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-white print:text-black">
                    {formatCurrency(sale.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-800 print:bg-gray-100">
              <tr className="font-bold">
                <td colSpan="7" className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white print:text-black">
                  TOTALS:
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white print:text-black">
                  {formatCurrency(totalAmount)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-red-600 dark:text-red-400 print:text-red-700">
                  {formatCurrency(totalDiscount)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white print:text-black">
                  {formatCurrency(netRevenue)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

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

export default SalesReport;
