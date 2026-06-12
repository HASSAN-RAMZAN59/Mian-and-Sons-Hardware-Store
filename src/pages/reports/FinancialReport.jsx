import React, { useEffect, useRef, useState } from 'react';
import { FaFileExport, FaPrint, FaMoneyBillWave, FaShoppingCart, FaReceipt, FaChartLine, FaPercentage, FaExchangeAlt } from 'react-icons/fa';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { Navigate } from 'react-router-dom';
import { expenseService } from '../../services/expenseService';
import { orderService } from '../../services/orderService';
import { reportService } from '../../services/reportService';
import { purchaseService } from '../../services/purchaseService';
import { damagedStockService } from '../../services/damagedStockService';

const FinancialReport = () => {
  const { user } = useAuth();
  const printRef = useRef();

  const normalizePayload = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.expenses)) return payload.expenses;
    return [];
  };

  // Period State
  const [period, setPeriod] = useState('monthly');
  const [customDates, setCustomDates] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const [reportData, setReportData] = useState({
    totalSales: 0,
    totalPurchases: 0,
    totalExpenses: 0,
    totalCustomerPayments: 0,
    totalSupplierPayments: 0,
    totalReturns: 0,
    profit: 0
  });
  const [salesData, setSalesData] = useState([]);
  const [expenseData, setExpenseData] = useState([]);
  const [purchasesData, setPurchasesData] = useState([]);
  const [damagedData, setDamagedData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const normalizeSales = (orders = []) => {
    return (Array.isArray(orders) ? orders : []).map((order) => ({
      date: order.createdAt || order.date,
      total: Number(order.totals?.grandTotal ?? order.amount ?? 0)
    })).filter((row) => row.date);
  };

  const normalizePurchases = (purchases = []) => {
    return (Array.isArray(purchases) ? purchases : []).map((purchase) => ({
      date: purchase.date || purchase.createdAt,
      amount: Number(purchase.totalAmount ?? purchase.total ?? 0)
    })).filter((row) => row.date);
  };

  const normalizeExpenses = (expenses = []) => (
    (Array.isArray(expenses) ? expenses : []).map((expense) => ({
      date: expense.date || expense.createdAt,
      amount: Number(expense.amount ?? expense.total ?? 0),
      category: expense.category || ''
    })).filter((row) => row.date)
  );

  const normalizeDamaged = (damaged = []) => {
    return (Array.isArray(damaged) ? damaged : []).map((item) => ({
      date: item.date || item.createdAt,
      amount: Number(item.totalValue ?? (item.quantity * (item.price || 0)) ?? 0)
    })).filter((row) => row.date);
  };

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const { start: periodStart, end: periodEnd } = getPeriodRange();
      const params = {
        start_date: periodStart.toISOString().split('T')[0],
        end_date: periodEnd.toISOString().split('T')[0]
      };
      // Fetch raw data for charts first
      const [allSales, allExpenses, allPurchases, allDamaged] = await Promise.all([
        orderService.getAll(),
        expenseService.getAll(),
        purchaseService.getAll(),
        damagedStockService.getAll()
      ]);

      const salesArr = Array.isArray(allSales) ? allSales : [];
      const expensesArr = Array.isArray(allExpenses) ? allExpenses : [];
      const purchasesArr = Array.isArray(allPurchases) ? allPurchases : [];
      const damagedArr = Array.isArray(allDamaged) ? allDamaged : [];

      setSalesData(salesArr);
      setExpenseData(expensesArr);
      setPurchasesData(purchasesArr);
      setDamagedData(damagedArr);

      // Try backend summary; if backend not available or missing fields, compute fallback
      let summary = null;
      try {
        summary = await reportService.getFinancialSummary(params);
      } catch (err) {
        console.warn('reportService.getFinancialSummary failed, falling back to client-side computation', err);
        summary = null;
      }

      if (!summary || typeof summary !== 'object' || Object.keys(summary).length === 0) {
        // compute totals from fetched sales/expenses limited to period
        const inPeriodSales = salesArr.filter((s) => isWithinPeriod(s.createdAt || s.date || s));
        const inPeriodExpenses = expensesArr.filter((e) => isWithinPeriod(e.date || e.createdAt || e));
        const inPeriodPurchases = purchasesArr.filter((p) => isWithinPeriod(p.date || p.createdAt || p));
        const inPeriodDamaged = damagedArr.filter((d) => isWithinPeriod(d.date || d.createdAt || d));

        const totalSales = inPeriodSales.reduce((sum, o) => sum + Number(o.totals?.grandTotal ?? o.amount ?? o.total ?? 0), 0);
        const totalExpenses = inPeriodExpenses.reduce((sum, ex) => sum + Number(ex.amount ?? ex.total ?? 0), 0);
        const totalPurchases = inPeriodPurchases.reduce((sum, p) => sum + Number(p.totalAmount ?? p.total ?? 0), 0);
        const totalDamaged = inPeriodDamaged.reduce((sum, d) => sum + Number(d.totalValue ?? (d.quantity * (d.price || 0)) ?? 0), 0);

        summary = {
          totalSales,
          totalPurchases,
          totalExpenses,
          totalCustomerPayments: totalSales,
          totalSupplierPayments: totalPurchases,
          totalReturns: 0,
          profit: totalSales - totalExpenses - totalPurchases - totalDamaged
        };
      }

      setReportData(summary);

      // Mandatory Debug Logs (Step 8)
      console.log("Unified Financial Report Summary:", summary);

    } catch (error) {
      console.error(error);
      toast.error('Failed to load financial report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [period, customDates]);

  const getPeriodRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (period === 'daily') {
      return { start: today, end: today };
    }
    if (period === 'weekly') {
      const start = new Date(today);
      start.setDate(start.getDate() - start.getDay());
      return { start, end: today };
    }
    if (period === 'monthly') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start, end: today };
    }
    if (period === 'yearly') {
      const start = new Date(today.getFullYear(), 0, 1);
      return { start, end: today };
    }
    if (period === 'custom') {
      const start = customDates.startDate ? new Date(customDates.startDate) : today;
      const end = customDates.endDate ? new Date(customDates.endDate) : today;
      return { start, end };
    }

    return { start: today, end: today };
  };

  const { start: periodStart, end: periodEnd } = getPeriodRange();

  const isWithinPeriod = (dateValue) => {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return false;
    return date >= periodStart && date <= periodEnd;
  };

  const filteredExpenses = expenseData.filter((row) => isWithinPeriod(row.date || row.createdAt));
  const expensesTotal = filteredExpenses.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  const normalizeCategory = (value) => String(value || '').toLowerCase();

  const sumExpenseCategory = (keywords) => filteredExpenses
    .filter((row) => keywords.some((keyword) => normalizeCategory(row.category || '').includes(keyword)))
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);

  const salariesExpense = sumExpenseCategory(['salary', 'salaries', 'wage']);
  const rentExpense = sumExpenseCategory(['rent']);
  const utilitiesExpense = sumExpenseCategory(['electric', 'utility', 'water', 'gas']);
  const transportationExpense = sumExpenseCategory(['transport', 'fuel', 'delivery']);
  const marketingExpense = sumExpenseCategory(['marketing', 'advert']);
  const maintenanceExpense = sumExpenseCategory(['maintenance', 'repair']);
  const insuranceExpense = sumExpenseCategory(['insurance']);
  const classifiedExpenses =
    salariesExpense +
    rentExpense +
    utilitiesExpense +
    transportationExpense +
    marketingExpense +
    maintenanceExpense +
    insuranceExpense;
  const miscellaneousExpense = Math.max(0, expensesTotal - classifiedExpenses);

  const filteredPurchases = purchasesData.filter((row) => isWithinPeriod(row.date || row.createdAt));
  const purchasesTotal = filteredPurchases.reduce((sum, row) => sum + Number(row.totalAmount || row.total || 0), 0);

  const filteredDamaged = damagedData.filter((row) => isWithinPeriod(row.date || row.createdAt));
  const damagedTotal = filteredDamaged.reduce((sum, row) => sum + Number(row.totalValue || (row.quantity * (row.price || 0)) || 0), 0);

  const financialData = {
    revenue: {
      sales: reportData.totalSales,
      otherIncome: 0,
      total: reportData.totalSales,
    },
    cost: {
      purchases: reportData.totalPurchases || purchasesTotal,
      damagedStock: damagedTotal,
      total: (reportData.totalPurchases || purchasesTotal) + damagedTotal,
    },
    grossProfit: reportData.totalSales - ((reportData.totalPurchases || purchasesTotal) + damagedTotal),
    expenses: {
      salaries: salariesExpense,
      rent: rentExpense,
      utilities: utilitiesExpense,
      transportation: transportationExpense,
      marketing: marketingExpense,
      maintenance: maintenanceExpense,
      insurance: insuranceExpense,
      miscellaneous: miscellaneousExpense,
      total: reportData.totalExpenses,
    },
    netProfit: reportData.totalSales - ((reportData.totalPurchases || purchasesTotal) + damagedTotal) - reportData.totalExpenses,
    profitMargin: reportData.totalSales > 0 ? (((reportData.totalSales - ((reportData.totalPurchases || purchasesTotal) + damagedTotal) - reportData.totalExpenses) / reportData.totalSales) * 100).toFixed(1) : 0,
    cashFlow: {
      openingBalance: 0,
      cashInflow: reportData.totalCustomerPayments || reportData.totalSales,
      cashOutflow: (reportData.totalSupplierPayments || reportData.totalPurchases || purchasesTotal) + reportData.totalExpenses,
      closingBalance: (reportData.totalCustomerPayments || reportData.totalSales) - ((reportData.totalSupplierPayments || reportData.totalPurchases || purchasesTotal) + reportData.totalExpenses),
    },
  };

  const buildMonthlyData = () => {
    const now = new Date();
    const months = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const key = date.toISOString().slice(0, 7);
      months.push({ key, label: date.toLocaleString('en-US', { month: 'short' }) });
    }

    const monthTotals = new Map(months.map((month) => [month.key, { revenue: 0, expenses: 0, purchases: 0 }]));

    salesData.forEach((row) => {
      const key = String(row.date || row.createdAt).slice(0, 7);
      if (!monthTotals.has(key)) return;
      monthTotals.get(key).revenue += Number(row.total || row.grandTotal || row.amount || 0);
    });

    expenseData.forEach((row) => {
      const key = String(row.date || row.createdAt).slice(0, 7);
      if (!monthTotals.has(key)) return;
      monthTotals.get(key).expenses += Number(row.amount || row.total || 0);
    });

    purchasesData.forEach((row) => {
      const key = String(row.date || row.createdAt).slice(0, 7);
      if (!monthTotals.has(key)) return;
      monthTotals.get(key).purchases += Number(row.totalAmount || row.total || 0);
    });

    return months.map((month) => {
      const totals = monthTotals.get(month.key) || { revenue: 0, expenses: 0, purchases: 0 };
      return {
        month: month.label,
        revenue: totals.revenue,
        expenses: totals.expenses + totals.purchases,
        profit: totals.revenue - totals.expenses - totals.purchases
      };
    });
  };

  const monthlyData = buildMonthlyData();

  const buildRevenueExpenseData = () => {
    const rangeDays = Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24)) + 1;
    if (rangeDays > 45) {
      const buckets = new Map();
      const addToBucket = (dateValue, keyPrefix, amount) => {
        const key = String(dateValue).slice(0, 7);
        if (!buckets.has(key)) {
          const date = new Date(`${key}-01`);
          buckets.set(key, {
            date: date.toLocaleString('en-US', { month: 'short' }),
            revenue: 0,
            expenses: 0
          });
        }
        buckets.get(key)[keyPrefix] += amount;
      };

      salesData.filter((row) => isWithinPeriod(row.date || row.createdAt))
        .forEach((row) => addToBucket(row.date || row.createdAt, 'revenue', Number(row.total || row.grandTotal || row.amount || 0)));
      expenseData.filter((row) => isWithinPeriod(row.date || row.createdAt))
        .forEach((row) => addToBucket(row.date || row.createdAt, 'expenses', Number(row.amount || row.total || 0)));
      purchasesData.filter((row) => isWithinPeriod(row.date || row.createdAt))
        .forEach((row) => addToBucket(row.date || row.createdAt, 'expenses', Number(row.totalAmount || row.total || 0)));

      return Array.from(buckets.values());
    }

    const byDate = new Map();
    for (let i = 0; i < rangeDays; i += 1) {
      const current = new Date(periodStart);
      current.setDate(periodStart.getDate() + i);
      const key = current.toISOString().split('T')[0];
      byDate.set(key, {
        date: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: 0,
        expenses: 0
      });
    }

    salesData.filter((row) => isWithinPeriod(row.date || row.createdAt))
      .forEach((row) => {
        const key = String(row.date || row.createdAt).split('T')[0];
        if (!byDate.has(key)) return;
        byDate.get(key).revenue += Number(row.total || row.grandTotal || row.amount || 0);
      });

    expenseData.filter((row) => isWithinPeriod(row.date || row.createdAt))
      .forEach((row) => {
        const key = String(row.date || row.createdAt).split('T')[0];
        if (!byDate.has(key)) return;
        byDate.get(key).expenses += Number(row.amount || row.total || 0);
      });

    purchasesData.filter((row) => isWithinPeriod(row.date || row.createdAt))
      .forEach((row) => {
        const key = String(row.date || row.createdAt).split('T')[0];
        if (!byDate.has(key)) return;
        byDate.get(key).expenses += Number(row.totalAmount || row.total || 0);
      });

    return Array.from(byDate.values());
  };

  const revenueExpenseData = buildRevenueExpenseData();

  // Check if user has access (admin or superadmin only)
  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    toast.error('Access denied. This page is only accessible to administrators.');
    return <Navigate to="/dashboard" replace />;
  }

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

  // Handle Export to PDF
  const handleExportPDF = () => {
    window.print();
    toast.info("Use your browser's Print to PDF feature to save as PDF");
  };

  // Get period label
  const getPeriodLabel = () => {
    switch (period) {
      case 'daily':
        return 'Daily Report - ' + new Date().toLocaleDateString();
      case 'weekly':
        return 'Weekly Report - Week of ' + new Date().toLocaleDateString();
      case 'monthly':
        return `Monthly Report - ${periodStart.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`;
      case 'yearly':
        return `Yearly Report - ${periodStart.getFullYear()}`;
      case 'custom':
        return `Custom Period: ${customDates.startDate} to ${customDates.endDate}`;
      default:
        return 'Financial Report';
    }
  };

  return (
    <div ref={printRef}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 print:mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white print:text-black">Financial Report</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 print:text-gray-700">
            Comprehensive profit & loss and cash flow analysis
          </p>
        </div>
        <div className="flex space-x-3 print:hidden">
          <Button onClick={handlePrint} variant="secondary">
            <FaPrint className="mr-2" />
            Print
          </Button>
          <Button onClick={handleExportPDF}>
            <FaFileExport className="mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <Card className="mb-6 print:mb-4 print:border print:border-gray-300">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4 print:text-black">Report Period</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 print:text-black">
              Period Type
            </label>
            <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom Range</option>
            </Select>
          </div>

          {period === 'custom' && (
            <>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 print:text-black">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={customDates.startDate}
                  onChange={(e) => setCustomDates({ ...customDates, startDate: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 print:text-black">
                  End Date
                </label>
                <Input
                  type="date"
                  value={customDates.endDate}
                  onChange={(e) => setCustomDates({ ...customDates, endDate: e.target.value })}
                />
              </div>
            </>
          )}
        </div>
        <div className="mt-4 text-lg font-semibold text-blue-600 dark:text-blue-400 print:text-black">
          {getPeriodLabel()}
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6 print:mb-4">
        <Card className="print:border print:border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-700">Total Revenue</p>
              <p className="text-xl font-bold text-gray-800 dark:text-white mt-1 print:text-black">
                {formatCurrency(financialData.revenue.total)}
              </p>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg print:bg-green-100">
              <FaMoneyBillWave className="text-xl text-green-600 dark:text-green-400 print:text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="print:border print:border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-700">Total Purchases</p>
              <p className="text-xl font-bold text-gray-800 dark:text-white mt-1 print:text-black">
                {formatCurrency(financialData.cost.total)}
              </p>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg print:bg-blue-100">
              <FaShoppingCart className="text-xl text-blue-600 dark:text-blue-400 print:text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="print:border print:border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-700">Total Expenses</p>
              <p className="text-xl font-bold text-gray-800 dark:text-white mt-1 print:text-black">
                {formatCurrency(financialData.expenses.total)}
              </p>
            </div>
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg print:bg-red-100">
              <FaReceipt className="text-xl text-red-600 dark:text-red-400 print:text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="print:border print:border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-700">Gross Profit</p>
              <p className="text-xl font-bold text-gray-800 dark:text-white mt-1 print:text-black">
                {formatCurrency(financialData.grossProfit)}
              </p>
            </div>
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg print:bg-purple-100">
              <FaChartLine className="text-xl text-purple-600 dark:text-purple-400 print:text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="print:border print:border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-700">Net Profit</p>
              <p className="text-xl font-bold text-gray-800 dark:text-white mt-1 print:text-black">
                {formatCurrency(financialData.netProfit)}
              </p>
            </div>
            <div className="p-2 bg-teal-100 dark:bg-teal-900 rounded-lg print:bg-teal-100">
              <FaMoneyBillWave className="text-xl text-teal-600 dark:text-teal-400 print:text-teal-600" />
            </div>
          </div>
        </Card>

        <Card className="print:border print:border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-700">Profit Margin</p>
              <p className="text-xl font-bold text-gray-800 dark:text-white mt-1 print:text-black">
                {financialData.profitMargin}%
              </p>
            </div>
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg print:bg-yellow-100">
              <FaPercentage className="text-xl text-yellow-600 dark:text-yellow-400 print:text-yellow-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 print:grid-cols-1 print:mb-4">
        {/* Revenue vs Expense Line Chart */}
        <Card className="print:border print:border-gray-300 print:page-break-inside-avoid">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 print:text-black">
            Revenue vs Expense Trend
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueExpenseData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} name="Revenue" />
              <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} name="Expenses" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Monthly Profit Bar Chart */}
        <Card className="print:border print:border-gray-300 print:page-break-inside-avoid">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 print:text-black">
            Monthly Profit Comparison
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="profit" fill="#3B82F6" name="Profit" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Profit & Loss Statement */}
      <Card className="mb-6 print:mb-4 print:border print:border-gray-300 print:page-break-inside-avoid">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 print:text-black text-center">
          PROFIT & LOSS STATEMENT
        </h2>
        <div className="text-center text-gray-600 dark:text-gray-400 mb-6 print:text-gray-700">
          Mian & Sons Hardware Store
          <br />
          {getPeriodLabel()}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 print:divide-gray-300">
              {/* Revenue Section */}
              <tr className="bg-green-50 dark:bg-green-900/20 print:bg-green-50">
                <td colSpan="2" className="px-6 py-3 text-left font-bold text-gray-900 dark:text-white print:text-black">
                  REVENUE
                </td>
              </tr>
              <tr>
                <td className="px-6 py-3 text-left text-gray-700 dark:text-gray-300 print:text-black">
                  Sales Revenue
                </td>
                <td className="px-6 py-3 text-right font-medium text-gray-900 dark:text-white print:text-black">
                  {formatCurrency(financialData.revenue.sales)}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-3 text-left text-gray-700 dark:text-gray-300 print:text-black">
                  Other Income
                </td>
                <td className="px-6 py-3 text-right font-medium text-gray-900 dark:text-white print:text-black">
                  {formatCurrency(financialData.revenue.otherIncome)}
                </td>
              </tr>
              <tr className="bg-gray-50 dark:bg-gray-800 print:bg-gray-50">
                <td className="px-6 py-3 text-left font-bold text-gray-900 dark:text-white print:text-black">
                  Total Revenue
                </td>
                <td className="px-6 py-3 text-right font-bold text-gray-900 dark:text-white print:text-black">
                  {formatCurrency(financialData.revenue.total)}
                </td>
              </tr>

              {/* Cost Section */}
              <tr className="bg-blue-50 dark:bg-blue-900/20 print:bg-blue-50">
                <td colSpan="2" className="px-6 py-3 text-left font-bold text-gray-900 dark:text-white print:text-black">
                  COST OF GOODS SOLD
                </td>
              </tr>
              <tr>
                <td className="px-6 py-3 text-left text-gray-700 dark:text-gray-300 print:text-black">
                  Purchases
                </td>
                <td className="px-6 py-3 text-right font-medium text-gray-900 dark:text-white print:text-black">
                  {formatCurrency(financialData.cost.purchases)}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-3 text-left text-gray-700 dark:text-gray-300 print:text-black">
                  Damaged Stock
                </td>
                <td className="px-6 py-3 text-right font-medium text-gray-900 dark:text-white print:text-black">
                  {formatCurrency(financialData.cost.damagedStock)}
                </td>
              </tr>
              <tr className="bg-gray-50 dark:bg-gray-800 print:bg-gray-50">
                <td className="px-6 py-3 text-left font-bold text-gray-900 dark:text-white print:text-black">
                  Total Cost of Goods Sold
                </td>
                <td className="px-6 py-3 text-right font-bold text-gray-900 dark:text-white print:text-black">
                  {formatCurrency(financialData.cost.total)}
                </td>
              </tr>

              {/* Gross Profit */}
              <tr className="bg-purple-50 dark:bg-purple-900/20 print:bg-purple-50">
                <td className="px-6 py-4 text-left font-bold text-lg text-gray-900 dark:text-white print:text-black">
                  GROSS PROFIT
                </td>
                <td className="px-6 py-4 text-right font-bold text-lg text-gray-900 dark:text-white print:text-black">
                  {formatCurrency(financialData.grossProfit)}
                </td>
              </tr>

              {/* Expenses Section */}
              <tr className="bg-red-50 dark:bg-red-900/20 print:bg-red-50">
                <td colSpan="2" className="px-6 py-3 text-left font-bold text-gray-900 dark:text-white print:text-black">
                  OPERATING EXPENSES
                </td>
              </tr>
              <tr>
                <td className="px-6 py-3 text-left text-gray-700 dark:text-gray-300 print:text-black">
                  Salaries & Wages
                </td>
                <td className="px-6 py-3 text-right font-medium text-gray-900 dark:text-white print:text-black">
                  {formatCurrency(financialData.expenses.salaries)}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-3 text-left text-gray-700 dark:text-gray-300 print:text-black">
                  Rent
                </td>
                <td className="px-6 py-3 text-right font-medium text-gray-900 dark:text-white print:text-black">
                  {formatCurrency(financialData.expenses.rent)}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-3 text-left text-gray-700 dark:text-gray-300 print:text-black">
                  Utilities (Electricity, Water, Gas)
                </td>
                <td className="px-6 py-3 text-right font-medium text-gray-900 dark:text-white print:text-black">
                  {formatCurrency(financialData.expenses.utilities)}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-3 text-left text-gray-700 dark:text-gray-300 print:text-black">
                  Transportation
                </td>
                <td className="px-6 py-3 text-right font-medium text-gray-900 dark:text-white print:text-black">
                  {formatCurrency(financialData.expenses.transportation)}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-3 text-left text-gray-700 dark:text-gray-300 print:text-black">
                  Marketing & Advertising
                </td>
                <td className="px-6 py-3 text-right font-medium text-gray-900 dark:text-white print:text-black">
                  {formatCurrency(financialData.expenses.marketing)}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-3 text-left text-gray-700 dark:text-gray-300 print:text-black">
                  Maintenance & Repairs
                </td>
                <td className="px-6 py-3 text-right font-medium text-gray-900 dark:text-white print:text-black">
                  {formatCurrency(financialData.expenses.maintenance)}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-3 text-left text-gray-700 dark:text-gray-300 print:text-black">
                  Insurance
                </td>
                <td className="px-6 py-3 text-right font-medium text-gray-900 dark:text-white print:text-black">
                  {formatCurrency(financialData.expenses.insurance)}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-3 text-left text-gray-700 dark:text-gray-300 print:text-black">
                  Miscellaneous
                </td>
                <td className="px-6 py-3 text-right font-medium text-gray-900 dark:text-white print:text-black">
                  {formatCurrency(financialData.expenses.miscellaneous)}
                </td>
              </tr>
              <tr className="bg-gray-50 dark:bg-gray-800 print:bg-gray-50">
                <td className="px-6 py-3 text-left font-bold text-gray-900 dark:text-white print:text-black">
                  Total Operating Expenses
                </td>
                <td className="px-6 py-3 text-right font-bold text-gray-900 dark:text-white print:text-black">
                  {formatCurrency(financialData.expenses.total)}
                </td>
              </tr>

              {/* Net Profit */}
              <tr className="bg-green-100 dark:bg-green-900/30 print:bg-green-100 border-t-2 border-gray-800">
                <td className="px-6 py-4 text-left font-bold text-xl text-gray-900 dark:text-white print:text-black">
                  NET PROFIT
                </td>
                <td className="px-6 py-4 text-right font-bold text-xl text-green-600 dark:text-green-400 print:text-green-700">
                  {formatCurrency(financialData.netProfit)}
                </td>
              </tr>

              {/* Profit Margin */}
              <tr className="bg-yellow-50 dark:bg-yellow-900/20 print:bg-yellow-50">
                <td className="px-6 py-3 text-left font-bold text-gray-900 dark:text-white print:text-black">
                  Profit Margin
                </td>
                <td className="px-6 py-3 text-right font-bold text-gray-900 dark:text-white print:text-black">
                  {financialData.profitMargin}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Cash Flow Summary */}
      <Card className="mb-6 print:mb-4 print:border print:border-gray-300 print:page-break-inside-avoid">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 print:text-black text-center flex items-center justify-center">
          <FaExchangeAlt className="mr-2" />
          CASH FLOW SUMMARY
        </h2>
        <div className="text-center text-gray-600 dark:text-gray-400 mb-6 print:text-gray-700">
          {getPeriodLabel()}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 print:divide-gray-300">
              <tr className="bg-blue-50 dark:bg-blue-900/20 print:bg-blue-50">
                <td className="px-6 py-3 text-left font-bold text-gray-900 dark:text-white print:text-black">
                  Opening Cash Balance
                </td>
                <td className="px-6 py-3 text-right font-bold text-gray-900 dark:text-white print:text-black">
                  {formatCurrency(financialData.cashFlow.openingBalance)}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-3 text-left text-gray-700 dark:text-gray-300 print:text-black">
                  Cash Inflow (Sales & Receipts)
                </td>
                <td className="px-6 py-3 text-right font-medium text-green-600 dark:text-green-400 print:text-green-700">
                  +{formatCurrency(financialData.cashFlow.cashInflow)}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-3 text-left text-gray-700 dark:text-gray-300 print:text-black">
                  Cash Outflow (Purchases & Expenses)
                </td>
                <td className="px-6 py-3 text-right font-medium text-red-600 dark:text-red-400 print:text-red-700">
                  -{formatCurrency(financialData.cashFlow.cashOutflow)}
                </td>
              </tr>
              <tr className="bg-green-50 dark:bg-green-900/20 print:bg-green-50 border-t-2 border-gray-800">
                <td className="px-6 py-4 text-left font-bold text-xl text-gray-900 dark:text-white print:text-black">
                  Closing Cash Balance
                </td>
                <td className="px-6 py-4 text-right font-bold text-xl text-green-600 dark:text-green-400 print:text-green-700">
                  {formatCurrency(financialData.cashFlow.closingBalance)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Footer for Print */}
      <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-center text-sm text-gray-600">
        <p>Generated by Mian & Sons Hardware Management System</p>
        <p>Report Date: {new Date().toLocaleString()}</p>
      </div>

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
          .print\\:block {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};

export default FinancialReport;
