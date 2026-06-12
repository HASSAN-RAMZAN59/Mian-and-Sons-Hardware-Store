import React, { useEffect, useState, useCallback } from 'react';
import { FaPlus, FaEdit, FaTrash, FaFileExcel, FaFilePdf, FaSearch, FaMoneyBillWave, FaCalendarAlt, FaFilter, FaEye } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import TextArea from '../../components/common/TextArea';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { logAudit } from '../../utils/audit';
import { expenseService } from '../../services/expenseService';
import { showPremiumConfirm } from '../../utils/premiumDialogs';

const normalizePayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.expenses)) return payload.expenses;
  return [];
};

const normalizeExpense = (expense) => ({
  id: expense?.id ?? expense?._id ?? expense?.expenseId,
  date: expense?.date || expense?.createdAt || new Date().toISOString().split('T')[0],
  category: expense?.category || '',
  description: expense?.description || expense?.detail || '',
  amount: Number(expense?.amount ?? expense?.total ?? 0),
  paymentMethod: expense?.paymentMethod || 'Cash',
  paidBy: expense?.paidBy || expense?.createdBy || '',
  reference: expense?.reference || expense?.referenceNo || '',
  notes: expense?.notes || ''
});

const Expenses = () => {
  const { checkPermission, user } = useAuth();
  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [editingExpense, setEditingExpense] = useState(null);
  const [viewingExpense, setViewingExpense] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Expense categories
  const categories = [
    'Rent',
    'Electricity',
    'Salaries',
    'Fuel',
    'Repair & Maintenance',
    'Stationery',
    'Miscellaneous',
    'Marketing',
    'Transport'
  ];

  const loadExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const [expensesResponse, trendResponse] = await Promise.all([
        expenseService.getAll(),
        expenseService.getMonthlyTrend()
      ]);
      
      const list = normalizePayload(expensesResponse).map(normalizeExpense).filter((expense) => expense.id);
      setExpenses(list);
      setMonthlyTrend(trendResponse || []);

      // Mandatory Debug Logs (Step 9)
      console.log("Expenses Aggregation (Monthly Trend):", trendResponse);
      
    } catch (error) {
      console.error(error);
      toast.error('Unable to load expenses.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExpenses().catch(() => {});
  }, [loadExpenses]);

  useEffect(() => {
    const refresh = () => loadExpenses().catch(() => {});
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    const interval = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('expenses-updated', refresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('expenses-updated', refresh);
    };
  }, [loadExpenses]);

  // Calculate summary statistics
  const today = new Date().toISOString().split('T')[0];
  const todayExpenses = expenses.filter(e => e.date === today).reduce((sum, e) => sum + e.amount, 0);
  
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const weekExpenses = expenses.filter(e => new Date(e.date) >= startOfWeek).reduce((sum, e) => sum + e.amount, 0);
  
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const monthExpenses = expenses.filter(e => new Date(e.date) >= startOfMonth).reduce((sum, e) => sum + e.amount, 0);

  const monthlyData = monthlyTrend;

  // Category-wise expenses for current month
  const categoryExpenses = categories.map(cat => ({
    category: cat,
    amount: expenses.filter(e => e.category === cat && new Date(e.date) >= startOfMonth).reduce((sum, e) => sum + e.amount, 0)
  })).filter(c => c.amount > 0);

  // Table columns
  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'date', label: 'Date' },
    { key: 'category', label: 'Category' },
    { key: 'description', label: 'Description' },
    { 
      key: 'amount', 
      label: 'Amount',
      render: (row) => <span className="font-semibold text-gray-900 dark:text-white">Rs. {row.amount.toLocaleString()}</span>
    },
    { 
      key: 'paymentMethod', 
      label: 'Payment Method',
      render: (row) => {
        const variants = {
          'Cash': 'success',
          'Bank Transfer': 'primary',
          'Credit Card': 'warning',
          'Cheque': 'secondary'
        };
        return <Badge variant={variants[row.paymentMethod] || 'secondary'}>{row.paymentMethod}</Badge>;
      }
    },
    { key: 'paidBy', label: 'Paid By' },
    { key: 'reference', label: 'Reference' },
    { 
      key: 'notes', 
      label: 'Notes',
      render: (row) => <span className="text-sm text-gray-500">{row.notes || '-'}</span>
    },
    { 
      key: 'actions', 
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleView(row)}>
            <FaEye />
          </Button>
          {checkPermission('expenses', 'update') && (
            <Button size="sm" variant="secondary" onClick={() => handleEdit(row)}>
              <FaEdit />
            </Button>
          )}
          {checkPermission('expenses', 'delete') && (
            <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)}>
              <FaTrash />
            </Button>
          )}
        </div>
      )
    },
  ];

  // Filter expenses
  const filteredExpenses = expenses.filter(expense => {
    const descriptionText = String(expense.description || '').toLowerCase();
    const categoryText = String(expense.category || '').toLowerCase();
    const idText = String(expense.id || '').toLowerCase();
    const matchesSearch = descriptionText.includes(searchTerm.toLowerCase()) ||
                         categoryText.includes(searchTerm.toLowerCase()) ||
                         idText.includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || expense.category === selectedCategory;
    
    const matchesMonth = !selectedMonth || expense.date.startsWith(selectedMonth);
    
    const matchesDateRange = (!dateFrom || expense.date >= dateFrom) && (!dateTo || expense.date <= dateTo);
    
    return matchesSearch && matchesCategory && matchesMonth && matchesDateRange;
  });

  const handleView = (expense) => {
    setViewingExpense(expense);
    setShowViewModal(true);
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      date: expense.date || new Date().toISOString().split('T')[0],
      category: expense.category || '',
      description: expense.description || '',
      amount: expense.amount || '',
      paymentMethod: expense.paymentMethod || 'Cash',
      reference: expense.reference || '',
      notes: expense.notes || ''
    });
    setShowFormModal(true);
  };

  const handleDelete = async (id) => {
    if (!checkPermission('expenses', 'delete')) {
      toast.error('You do not have permission to delete expenses');
      return;
    }

    const confirmed = await showPremiumConfirm({
      title: 'Delete Expense',
      text: 'Are you sure you want to delete this expense?',
      confirmText: 'Delete Expense',
      cancelText: 'Cancel',
      icon: 'warning'
    });
    if (!confirmed) return;

    try {
      await expenseService.delete(id);
      logAudit({
        user,
        action: 'Deleted',
        module: 'Expenses',
        description: `Deleted expense ${id}`
      });
      toast.success('Expense deleted successfully');
      loadExpenses().catch(() => {});
      window.dispatchEvent(new CustomEvent('expenses-updated'));
    } catch (error) {
      toast.error('Unable to delete expense.');
    }
  };

  const handleExportPDF = () => {
    if (!checkPermission('expenses', 'export')) {
      toast.error('You do not have permission to export');
      return;
    }
    if (!filteredExpenses.length) {
      toast.error('No expense data to export');
      return;
    }
    toast.info('Preparing PDF preview...');
    window.print();
  };

  const handleExportExcel = () => {
    if (!checkPermission('expenses', 'export')) {
      toast.error('You do not have permission to export');
      return;
    }
    if (!filteredExpenses.length) {
      toast.error('No expense data to export');
      return;
    }

    const headers = [
      'Expense ID',
      'Date',
      'Category',
      'Description',
      'Amount',
      'Payment Method',
      'Paid By',
      'Reference',
      'Notes'
    ];

    const rows = filteredExpenses.map((expense) => [
      expense.id,
      expense.date,
      expense.category,
      expense.description,
      Number(expense.amount || 0),
      expense.paymentMethod,
      expense.paidBy,
      expense.reference || '',
      expense.notes || ''
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Expenses exported successfully!');
  };

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    amount: '',
    paymentMethod: 'Cash',
    reference: '',
    notes: ''
  });

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      category: '',
      description: '',
      amount: '',
      paymentMethod: 'Cash',
      reference: '',
      notes: ''
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isEditing = Boolean(editingExpense);

    if (!checkPermission('expenses', isEditing ? 'update' : 'create')) {
      toast.error(`You do not have permission to ${isEditing ? 'update' : 'add'} expenses`);
      return;
    }

    const payload = {
      date: formData.date,
      category: formData.category,
      description: formData.description,
      amount: Number(formData.amount || 0),
      paymentMethod: formData.paymentMethod,
      paidBy: user?.name || '',
      reference: formData.reference || '',
      notes: formData.notes || ''
    };

    // Mandatory Debug Logs (Step 3 & 9)
    console.log("Expense Transaction Payload:", payload);

    try {
      if (isEditing) {
        await expenseService.update(editingExpense.id, payload);
        logAudit({
          user,
          action: 'Updated',
          module: 'Expenses',
          description: `Updated expense ${editingExpense.id}`
        });
        toast.success('Expense updated successfully!');
      } else {
        const created = await expenseService.create(payload);
        const createdExpense = normalizeExpense(created);
        logAudit({
          user,
          action: 'Created',
          module: 'Expenses',
          description: `Added expense ${createdExpense.id || ''} (${payload.category})`
        });
        toast.success('Expense added successfully!');
      }

      setShowFormModal(false);
      setEditingExpense(null);
      resetForm();
      loadExpenses().catch(() => {});
      window.dispatchEvent(new CustomEvent('expenses-updated'));
    } catch (error) {
      toast.error('Unable to save expense.');
    }
  };

  return (
    <div id="print-expenses" className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Expenses</h1>
        <div className="flex gap-3">
          {(user?.role === 'admin' || user?.role === 'superadmin') && (
            <>
              <Button variant="secondary" onClick={handleExportExcel}>
                <FaFileExcel className="mr-2" /> Excel
              </Button>
              <Button variant="secondary" onClick={handleExportPDF}>
                <FaFilePdf className="mr-2" /> PDF
              </Button>
            </>
          )}
          {checkPermission('expenses', 'create') && (
            <Button onClick={() => {
              setEditingExpense(null);
              resetForm();
              setShowFormModal(true);
            }}>
              <FaPlus className="mr-2" /> Add Expense
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card 
          title="Today's Expenses" 
          value={`Rs. ${todayExpenses.toLocaleString()}`}
          icon={FaMoneyBillWave} 
          color="red" 
        />
        <Card 
          title="This Week" 
          value={`Rs. ${weekExpenses.toLocaleString()}`}
          icon={FaCalendarAlt} 
          color="orange" 
        />
        <Card 
          title="This Month" 
          value={`Rs. ${monthExpenses.toLocaleString()}`}
          icon={FaMoneyBillWave} 
          color="purple" 
        />
      </div>

      {/* Monthly Expense Chart */}
      <Card title="Monthly Expenses Trend">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => `Rs. ${value.toLocaleString()}`} />
            <Legend />
            <Bar dataKey="amount" fill="#ef4444" name="Expenses (Rs.)" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Category-wise Expenses */}
      <Card title="Category-wise Expenses (This Month)">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {categoryExpenses.map((cat) => (
            <div key={cat.category} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{cat.category}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                Rs. {cat.amount.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Filters */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <FaFilter className="text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Input
            icon={FaSearch}
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </Select>
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            placeholder="Select month"
          />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From date"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To date"
          />
        </div>
      </Card>

      {/* Expenses Table */}
      <Card>
        <Table
          columns={columns}
          data={filteredExpenses}
          emptyMessage={isLoading ? 'Loading expenses...' : 'No expenses found'}
        />
      </Card>

      {/* Add/Edit Expense Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                  {editingExpense ? 'Update Expense' : 'Add New Expense'}
                </h2>
                <button
                  onClick={() => {
                    setShowFormModal(false);
                    setEditingExpense(null);
                    resetForm();
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Date"
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                  />
                  <Select
                    label="Category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </Select>
                </div>

                <Input
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter expense description"
                  required
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Amount (Rs.)"
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="0.00"
                    required
                    min="0"
                    step="0.01"
                  />
                  <Select
                    label="Payment Method"
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleChange}
                    required
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Cheque">Cheque</option>
                  </Select>
                </div>

                <Input
                  label="Reference Number"
                  name="reference"
                  value={formData.reference}
                  onChange={handleChange}
                  placeholder="Invoice/Reference number (optional)"
                />

                <TextArea
                  label="Notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Additional notes (optional)"
                  rows={3}
                />

                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingExpense ? 'Update Expense' : 'Add Expense'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowFormModal(false);
                      setEditingExpense(null);
                      resetForm();
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Expense Modal */}
      {showViewModal && viewingExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Expense Details</h2>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setViewingExpense(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Expense ID</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{viewingExpense.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{viewingExpense.date}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{viewingExpense.category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Method</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{viewingExpense.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Paid By</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{viewingExpense.paidBy || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Reference</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{viewingExpense.reference || '-'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p className="font-semibold text-gray-900 dark:text-white">{viewingExpense.description}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">Rs. {Number(viewingExpense.amount || 0).toLocaleString()}</p>
              </div>
              {viewingExpense.notes && (
                <div>
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="text-gray-700 dark:text-gray-300">{viewingExpense.notes}</p>
                </div>
              )}
              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowViewModal(false);
                    setViewingExpense(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          
          /* Hide everything first */
          body * {
            visibility: hidden;
          }
          
          /* Show only the expenses print area */
          #print-expenses, #print-expenses * {
            visibility: visible;
          }
          
          /* Position the print area at the absolute top-left */
          #print-expenses {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }

          body {
            background-color: white !important;
            -webkit-print-color-adjust: exact;
          }
          
          .print\\:hidden {
            display: none !important;
            visibility: hidden !important;
          }
          
          table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }
          th, td {
            font-size: 10px !important;
            padding: 6px 4px !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            border: 1px solid #e5e7eb !important;
          }
          
          /* Distribute column widths to fit A4 Landscape */
          th:nth-child(1), td:nth-child(1) { width: 8%; }  /* ID */
          th:nth-child(2), td:nth-child(2) { width: 10%; } /* Date */
          th:nth-child(3), td:nth-child(3) { width: 12%; } /* Category */
          th:nth-child(4), td:nth-child(4) { width: 25%; } /* Description */
          th:nth-child(5), td:nth-child(5) { width: 12%; } /* Amount */
          th:nth-child(6), td:nth-child(6) { width: 12%; } /* Method */
          th:nth-child(7), td:nth-child(7) { width: 10%; } /* Paid By */
          th:nth-child(8), td:nth-child(8) { width: 11%; } /* Ref */
          
          /* Hide action columns in print */
          th:nth-last-child(1), td:nth-last-child(1) {
             display: none !important;
          }

          /* Explicitly hide sidebar and navigation just in case */
          .sidebar, .navbar, aside, nav, .menu, .admin-panel {
            display: none !important;
          }

          /* Ensure Card component doesn't add extra padding in print */
          .bg-white {
            padding: 0 !important;
            box-shadow: none !important;
          }

          /* Scale charts to save space */
          .recharts-responsive-container {
             max-height: 200px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Expenses;
