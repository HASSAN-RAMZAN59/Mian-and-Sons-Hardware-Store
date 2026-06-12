import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import useProductsCatalog from '../../hooks/useProductsCatalog';
import { branchService } from '../../services/branchService';
import { purchaseService } from '../../services/purchaseService';
import { dashboardService } from '../../services/dashboardService';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  FaBoxOpen, 
  FaShoppingCart, 
  FaUsers, 
  FaMoneyBill,
  FaDollarSign,
  FaChartLine,
  FaArrowUp,
  FaArrowDown,
  FaExclamationTriangle,
  FaBuilding
} from 'react-icons/fa';

const Dashboard = () => {
  const { products: productsData } = useProductsCatalog();
  const { user } = useAuth();
  const navigate = useNavigate();
  const formatCurrency = (val) => {
    const num = Number(val || 0);
    if (Math.abs(num) >= 100000) {
      return `Rs. ${(num / 1000).toFixed(0)}K`;
    }
    return num < 0 ? `-Rs. ${Math.abs(num).toLocaleString()}` : `Rs. ${num.toLocaleString()}`;
  };
  const [greeting, setGreeting] = useState('');
  const [branchesData, setBranchesData] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesError, setBranchesError] = useState('');
  const [targetDrafts, setTargetDrafts] = useState({});
  const [targetSaving, setTargetSaving] = useState({});
  const [performanceDrafts, setPerformanceDrafts] = useState({});
  const [performanceOverrideDrafts, setPerformanceOverrideDrafts] = useState({});
  const [pendingPurchaseOrders, setPendingPurchaseOrders] = useState([]);
  const [pendingPurchaseLoading, setPendingPurchaseLoading] = useState(false);
  const [pendingPurchaseError, setPendingPurchaseError] = useState('');
  
  const [dashboardStats, setDashboardStats] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Set greeting based on time
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good Morning');
    } else if (hour < 18) {
      setGreeting('Good Afternoon');
    } else {
      setGreeting('Good Evening');
    }
  }, []);

  // Fetch Dashboard Stats from Backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await dashboardService.getStats();
        setDashboardStats(data);
      } catch (error) {
        console.error("Dashboard stats error:", error);
      } finally {
        setDashboardLoading(false);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const normalizeBranches = (payload) => {
      const list = Array.isArray(payload) ? payload : payload?.data || [];
      return list.map((branch, index) => {
        const id = branch?.id || branch?._id || branch?.code || branch?.branchId || `branch-${index}`;
        const sales = Number(branch?.totalSales ?? branch?.sales ?? branch?.revenue ?? 0);
        const target = Number(branch?.targetSales ?? branch?.target ?? branch?.goal ?? 0);
        const customers = Number(branch?.customerCount ?? branch?.customers ?? branch?.totalCustomers ?? 0);
        const performanceOverride = Boolean(branch?.performanceOverride ?? branch?.manualPerformance);
        const performanceValue = Number(branch?.performance ?? branch?.performanceValue ?? 0);

        return {
          id,
          name: branch?.name || branch?.branchName || branch?.city || 'Branch',
          sales: Number.isFinite(sales) ? Math.round(sales) : 0,
          target: Number.isFinite(target) ? Math.round(target) : 0,
          customers: Number.isFinite(customers) ? customers : 0,
          performanceOverride,
          performanceValue: Number.isFinite(performanceValue) ? Math.round(performanceValue) : 0
        };
      });
    };

    const loadBranches = async (silent = false) => {
      if (!silent) {
        setBranchesLoading(true);
      }
      try {
        const data = await branchService.getAll();
        const normalized = normalizeBranches(data);
        if (isMounted) {
          setBranchesData(normalized);
          setBranchesError('');
        }
      } catch (error) {
        if (isMounted) {
          setBranchesData([]);
          setBranchesError('Unable to load branch performance data.');
        }
      } finally {
        if (isMounted && !silent) {
          setBranchesLoading(false);
        }
      }
    };

    loadBranches();
    const interval = setInterval(() => loadBranches(true), 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const productCatalog = useMemo(
    () => productsData.map((product) => ({
      ...product,
      stockQty: Number(product.stockQty ?? product.stock ?? 0),
      minStock: Number(product.minStock ?? 5),
      salePrice: Number(product.salePrice ?? product.price ?? 0),
      purchasePrice: Number(product.purchasePrice ?? 0)
    })),
    [productsData]
  );

  const lowStockAlerts = useMemo(
    () => productCatalog
      .filter((product) => product.stockQty <= product.minStock)
      .sort((a, b) => a.stockQty - b.stockQty)
      .slice(0, 8)
      .map((product) => ({
        id: product.id,
        product: product.size ? `${product.name} - ${product.size}` : product.name,
        category: product.category,
        currentStock: product.stockQty,
        minStock: product.minStock,
        status: product.stockQty <= Math.max(2, Math.ceil(product.minStock * 0.5)) ? 'Critical' : 'Low'
      })),
    [productCatalog]
  );

  const totalLowStockCount = useMemo(
    () => productCatalog.filter((product) => product.stockQty <= product.minStock).length,
    [productCatalog]
  );

  const stats = useMemo(() => {
    if (!dashboardStats) return {
      totalProducts: productCatalog.length,
      todaysSales: 0,
      totalCustomers: 0,
      pendingPayments: 0,
      monthRevenue: 0,
      monthExpenses: 0,
      netProfit: 0,
      lowStockItems: 0
    };

    return {
      totalProducts: dashboardStats.totalProducts,
      todaysSales: dashboardStats.todaysOrders || 0,
      totalCustomers: dashboardStats.totalCustomers || 0,
      pendingPayments: dashboardStats.pendingPaymentsCount || 0,
      monthRevenue: dashboardStats.monthRevenue ?? 0,
      monthExpenses: dashboardStats.monthExpenses ?? 0,
      netProfit: dashboardStats.netProfit ?? 0,
      lowStockItems: totalLowStockCount
    };
  }, [dashboardStats, productCatalog.length, totalLowStockCount]);

  const recentSales = useMemo(() => {
    return (dashboardStats?.recentOrders || []).map((order) => ({
      id: order._id,
      invoice: order._id.slice(-6).toUpperCase(),
      customer: order.customerName,
      items: order.itemsCount || 0,
      amount: order.total,
      paymentMethod: (order.payment?.method || 'cod').toUpperCase(),
      status: order.payment?.status === 'paid' ? 'Paid' : (order.status || 'Pending'),
      date: order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Today'
    }));
  }, [dashboardStats]);

  const salesTrendData = useMemo(() => {
    return dashboardStats?.salesTrend || [];
  }, [dashboardStats]);

  const categorySalesData = useMemo(() => {
    return dashboardStats?.categorySales || [];
  }, [dashboardStats]);

  const COLORS = ['#1e3a5f', '#f97316', '#10b981', '#f59e0b', '#6366f1'];

  const topSellingData = useMemo(() => {
    return dashboardStats?.topSellingProducts || []; 
  }, [dashboardStats]);

  const systemActivity = useMemo(() => {
    if (!dashboardStats) return [];

    return [
      {
        activity: 'Total Users',
        count: dashboardStats.totalCustomers,
        change: '+0',
        trend: 'up'
      },
      {
        activity: 'Active Orders',
        count: (dashboardStats.statusBreakdown?.['Confirmed'] || 0) + (dashboardStats.statusBreakdown?.['Shipped'] || 0),
        change: '+0',
        trend: 'up'
      },
      {
        activity: 'Orders Today',
        count: dashboardStats.todaysOrders || 0,
        change: '+0',
        trend: 'up'
      },
      {
        activity: 'Pending Payments',
        count: dashboardStats.pendingPaymentsCount || 0,
        change: '+0',
        trend: 'down'
      }
    ];
  }, [dashboardStats]);

  useEffect(() => {
    let isMounted = true;

    const normalizePurchaseOrders = (payload) => {
      const list = Array.isArray(payload) ? payload : payload?.data || [];

      return list
        .map((order, index) => {
          const statusRaw = String(order?.status || order?.state || 'pending').toLowerCase();
          const statusLabel = statusRaw
            ? statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1)
            : 'Pending';
          const items = Array.isArray(order?.items) ? order.items : Array.isArray(order?.products) ? order.products : [];
          const itemsCount = items.reduce((sum, item) => sum + Number(item?.quantity ?? 1), 0);
          const amount = Number(order?.totalAmount ?? order?.amount ?? order?.grandTotal ?? 0);
          const expected = order?.expectedDate || order?.expectedAt || order?.expectedDelivery || order?.deliveryDate || '';
          const expectedDate = expected ? new Date(expected) : null;

          return {
            id: order?.id || order?._id || order?.poNumber || `po-${index}`,
            poNumber: order?.poNumber || order?.reference || order?.code || `PO-${new Date().getFullYear()}-${String(index + 1).padStart(3, '0')}`,
            supplier: order?.supplier?.name || order?.supplierName || order?.vendor || 'Supplier',
            items: Number.isFinite(itemsCount) ? itemsCount : 0,
            amount: Number.isFinite(amount) ? Math.round(amount) : 0,
            expectedDate: expectedDate && !Number.isNaN(expectedDate.getTime())
              ? expectedDate.toISOString().slice(0, 10)
              : 'TBD',
            status: statusLabel,
            statusRaw
          };
        })
        .filter((order) => {
          const status = order.statusRaw || '';
          return status.includes('pending') || status.includes('open') || status.includes('awaiting');
        })
        .slice(0, 5);
    };

    const loadPendingPurchaseOrders = async (silent = false) => {
      if (!silent) {
        setPendingPurchaseLoading(true);
      }
      try {
        const response = await purchaseService.getAll({ status: 'pending' });
        const normalized = normalizePurchaseOrders(response);
        if (isMounted) {
          setPendingPurchaseOrders(normalized);
          setPendingPurchaseError('');
        }
      } catch (error) {
        if (isMounted) {
          setPendingPurchaseOrders([]);
          setPendingPurchaseError('Unable to load pending purchase orders.');
        }
      } finally {
        if (isMounted && !silent) {
          setPendingPurchaseLoading(false);
        }
      }
    };

    loadPendingPurchaseOrders();
    const interval = setInterval(() => loadPendingPurchaseOrders(true), 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const branchPerformance = useMemo(() => {
    const list = branchesData.map((branch) => {
      const target = Math.max(0, Number(branch.target || 0));
      const sales = Math.max(0, Number(branch.sales || 0));
      const derivedPerformance = target > 0 ? Math.round((sales / target) * 100) : 0;
      const performance = branch.performanceOverride ? branch.performanceValue : derivedPerformance;

      return {
        branch: branch.name,
        branchId: branch.id,
        sales,
        target,
        customers: branch.customers,
        performance,
        performanceOverride: branch.performanceOverride,
        performanceValue: branch.performanceValue
      };
    });

    return list.sort((a, b) => b.sales - a.sales).slice(0, 5);
  }, [branchesData]);

  const handleTargetChange = (branchId, value) => {
    setTargetDrafts((prev) => ({ ...prev, [branchId]: value }));
  };

  const handleTargetSave = async (branch) => {
    const rawValue = targetDrafts[branch.branchId] ?? branch.target;
    const targetValue = Number(rawValue);
    if (!Number.isFinite(targetValue) || targetValue < 0) {
      setTargetDrafts((prev) => ({ ...prev, [branch.branchId]: branch.target }));
      return;
    }

    const overrideEnabled = performanceOverrideDrafts[branch.branchId] ?? branch.performanceOverride;
    const performanceRaw = performanceDrafts[branch.branchId] ?? branch.performanceValue;
    const performanceValue = Number(performanceRaw);
    if (overrideEnabled && (!Number.isFinite(performanceValue) || performanceValue < 0)) {
      setPerformanceDrafts((prev) => ({ ...prev, [branch.branchId]: branch.performanceValue }));
      return;
    }

    setTargetSaving((prev) => ({ ...prev, [branch.branchId]: true }));
    try {
      await branchService.update(branch.branchId, {
        targetSales: targetValue,
        target: targetValue,
        performanceOverride: Boolean(overrideEnabled),
        performance: overrideEnabled ? performanceValue : null
      });
      setBranchesData((prev) => prev.map((entry) => (
        entry.id === branch.branchId ? {
          ...entry,
          target: targetValue,
          performanceOverride: Boolean(overrideEnabled),
          performanceValue: overrideEnabled ? Math.round(performanceValue) : entry.performanceValue
        } : entry
      )));
    } catch (error) {
      setBranchesError('Unable to update branch targets.');
    } finally {
      setTargetSaving((prev) => ({ ...prev, [branch.branchId]: false }));
    }
  };

  // Check user role
  const isAdminOrSuper = user?.role === 'admin' || user?.role === 'superadmin';
  const isManagerOrAbove = user?.role === 'manager' || isAdminOrSuper;
  const isSuperAdmin = user?.role === 'superadmin';

  // Table columns
  const salesColumns = [
    { key: 'invoice', label: 'Invoice#' },
    { key: 'customer', label: 'Customer' },
    { key: 'items', label: 'Items' },
    { 
      key: 'amount', 
      label: 'Amount',
      render: (row) => `Rs. ${row.amount.toLocaleString()}`
    },
    { key: 'paymentMethod', label: 'Payment' },
    { 
      key: 'status', 
      label: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'Paid' ? 'success' : 'warning'}>
          {row.status}
        </Badge>
      )
    },
    { key: 'date', label: 'Date' }
  ];

  const stockColumns = [
    { key: 'product', label: 'Product' },
    { key: 'category', label: 'Category' },
    { key: 'currentStock', label: 'Current Stock' },
    { key: 'minStock', label: 'Min Stock' },
    { 
      key: 'status', 
      label: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'Critical' ? 'danger' : 'warning'}>
          {row.status}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <div className="bg-gradient-to-r from-primary to-blue-700 dark:from-blue-800 dark:to-blue-900 rounded-lg p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">
          {greeting}, {user?.name || 'User'}!
        </h1>
        <p className="text-blue-100">
          Welcome to Mian & Sons Hardware Store Dashboard
        </p>
      </div>

      {/* Top Stats Cards - For All Roles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card 
          title="Total Products" 
          value={stats.totalProducts} 
          icon={FaBoxOpen} 
          color="blue"
        />
        <Card 
          title="Today's Sales" 
          value={stats.todaysSales} 
          icon={FaShoppingCart} 
          color="green"
        />
        <Card 
          title="Total Customers" 
          value={stats.totalCustomers} 
          icon={FaUsers} 
          color="purple"
        />
        <Card 
          title="Pending Payments" 
          value={stats.pendingPayments} 
          icon={FaMoneyBill} 
          color="red"
        />
      </div>

      {/* Additional Stats for Admin/Superadmin */}
      {isAdminOrSuper && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card 
            title="This Month Revenue" 
            value={formatCurrency(stats.monthRevenue)}
            icon={FaDollarSign} 
            color="green"
            trend={12.5}
          />
          <Card 
            title="This Month Expenses" 
            value={formatCurrency(stats.monthExpenses)}
            icon={FaChartLine} 
            color="red"
            trend={-5.2}
          />
          <Card 
            title="Net Profit" 
            value={formatCurrency(stats.netProfit)}
            icon={FaArrowUp} 
            color="blue"
            trend={8.3}
          />
          <div onClick={() => navigate('/inventory/stock-alerts')} className="cursor-pointer">
            <Card 
              title="Low Stock Items" 
              value={stats.lowStockItems}
              icon={FaExclamationTriangle} 
              color="orange"
            />
          </div>
        </div>
      )}

      {/* Charts Section - For Admin/Superadmin */}
      {isAdminOrSuper && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Sales Trend Chart - 60% width */}
          <Card title="Sales Trend - Last 12 Months" className="lg:col-span-3">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `Rs. ${value.toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="sales" stroke="#1e3a5f" strokeWidth={2} name="Actual Sales" />
                <Line type="monotone" dataKey="target" stroke="#f97316" strokeWidth={2} strokeDasharray="5 5" name="Target" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Category Sales Pie Chart - 40% width */}
          <Card title="Category-wise Sales" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categorySalesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categorySalesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `Rs. ${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* Tables Section - For All Roles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales Table */}
        <Card title="Recent Sales">
          <Table 
            columns={salesColumns}
            data={recentSales}
            emptyMessage="No sales found"
          />
        </Card>

        {/* Low Stock Alerts Table */}
        <Card title="Low Stock Alerts">
          <Table 
            columns={stockColumns}
            data={lowStockAlerts}
            emptyMessage="No low stock items"
          />
        </Card>
      </div>

      {/* Top Selling Products - For Manager/Admin/Superadmin */}
      {isManagerOrAbove && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Card title="Top Selling Products - This Month" className="lg:col-span-3">
            {topSellingData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topSellingData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="product"
                    angle={-15}
                    textAnchor="end"
                    height={80}
                    tickFormatter={(value) => (value.length > 24 ? `${value.slice(0, 24)}...` : value)}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === 'Revenue (Rs.)') return `Rs. ${Number(value).toLocaleString()}`;
                      return Number(value).toLocaleString();
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="units" fill="#10b981" name="Units Sold" />
                  <Bar yAxisId="right" dataKey="revenue" fill="#1e3a5f" name="Revenue (Rs.)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                No top-selling data available for this month.
              </div>
            )}
          </Card>

          {/* Pending Purchase Orders */}
          <Card title="Pending Purchase Orders" className="lg:col-span-2">
            <div className="space-y-3">
              {pendingPurchaseLoading ? (
                <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  Loading pending purchase orders...
                </div>
              ) : pendingPurchaseError ? (
                <div className="py-10 text-center text-sm text-red-500">
                  {pendingPurchaseError}
                </div>
              ) : pendingPurchaseOrders.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  No pending purchase orders available.
                </div>
              ) : (
                pendingPurchaseOrders.map((po) => (
                  <div key={po.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{po.poNumber}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{po.supplier}</p>
                      </div>
                      <Badge variant={String(po.status || '').toLowerCase().includes('confirm') ? 'success' : 'warning'}>
                        {po.status}
                      </Badge>
                    </div>
                    <div className="text-sm space-y-1">
                      <p className="text-gray-600 dark:text-gray-400">
                        Items: <span className="font-medium text-gray-900 dark:text-white">{po.items}</span>
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        Amount: <span className="font-medium text-gray-900 dark:text-white">Rs. {Number(po.amount || 0).toLocaleString()}</span>
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        Expected: <span className="font-medium text-gray-900 dark:text-white">{po.expectedDate}</span>
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Superadmin Only Content */}
      {isSuperAdmin && (
        <>
          {/* Branch Performance */}
          <Card title="Branch Performance Comparison">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Branch</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Sales</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Target</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Customers</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Performance</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {branchesLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        Loading branch performance...
                      </td>
                    </tr>
                  ) : branchesError ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-6 text-center text-sm text-red-500">
                        {branchesError}
                      </td>
                    </tr>
                  ) : branchPerformance.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        No branch performance data available.
                      </td>
                    </tr>
                  ) : (
                    branchPerformance.map((branch) => {
                      const draftValue = targetDrafts[branch.branchId];
                      const targetDisplay = branch.target > 0 ? `Rs. ${branch.target.toLocaleString()}` : 'Not set';
                      const performanceDraft = performanceDrafts[branch.branchId];
                      const overrideValue = performanceOverrideDrafts[branch.branchId];
                      const overrideEnabled = typeof overrideValue === 'boolean' ? overrideValue : branch.performanceOverride;
                      const isSaving = Boolean(targetSaving[branch.branchId]);

                      return (
                        <tr key={branch.branchId}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <FaBuilding className="text-primary mr-2" />
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{branch.branch}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            Rs. {branch.sales.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {isAdminOrSuper ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={draftValue ?? branch.target}
                                  onChange={(event) => handleTargetChange(branch.branchId, event.target.value)}
                                  className="w-28 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleTargetSave(branch)}
                                  disabled={isSaving}
                                  className="px-3 py-1 text-xs font-semibold rounded-md bg-primary text-white hover:bg-primary/90 disabled:opacity-60"
                                >
                                  {isSaving ? 'Saving...' : 'Save'}
                                </button>
                              </div>
                            ) : (
                              targetDisplay
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {branch.customers}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isAdminOrSuper ? (
                              <div className="flex flex-col gap-2">
                                <label className="inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                  <input
                                    type="checkbox"
                                    checked={overrideEnabled}
                                    onChange={(event) => setPerformanceOverrideDrafts((prev) => ({
                                      ...prev,
                                      [branch.branchId]: event.target.checked
                                    }))}
                                  />
                                  Override performance
                                </label>
                                {overrideEnabled ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min="0"
                                      value={performanceDraft ?? branch.performanceValue}
                                      onChange={(event) => setPerformanceDrafts((prev) => ({
                                        ...prev,
                                        [branch.branchId]: event.target.value
                                      }))}
                                      className="w-24 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100"
                                    />
                                    <span className="text-xs text-gray-500">%</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center">
                                    <span className={`text-sm font-semibold ${branch.performance >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                                      {branch.performance}%
                                    </span>
                                    {branch.performance >= 100 ? (
                                      <FaArrowUp className="ml-2 text-green-600" />
                                    ) : (
                                      <FaArrowDown className="ml-2 text-orange-600" />
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <span className={`text-sm font-semibold ${branch.performance >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                                  {branch.performance}%
                                </span>
                                {branch.performance >= 100 ? (
                                  <FaArrowUp className="ml-2 text-green-600" />
                                ) : (
                                  <FaArrowDown className="ml-2 text-orange-600" />
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* System Activity Summary */}
          <Card title="System Activity Summary">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {systemActivity.map((item, index) => (
                <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{item.activity}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{item.count}</p>
                    <div className={`flex items-center ${item.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {item.trend === 'up' ? <FaArrowUp className="mr-1" /> : <FaArrowDown className="mr-1" />}
                      <span className="text-sm font-semibold">{item.change}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default Dashboard;
