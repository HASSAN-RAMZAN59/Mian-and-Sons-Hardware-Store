import React, { useEffect, useState } from 'react';
import { FaPrint, FaEdit, FaSave, FaTimes, FaMoneyBillWave, FaArrowDown, FaArrowUp } from 'react-icons/fa';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { cashbookService } from '../../services/cashbookService';
import { orderService } from '../../services/orderService';



const CashBook = () => {
  const { user } = useAuth();
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [editingBalance, setEditingBalance] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [tempBalance, setTempBalance] = useState(0);
  const [cashSummary, setCashSummary] = useState({
    transactions: [],
    totalCashIn: 0,
    totalCashOut: 0,
    closingBalance: 0
  });

  const loadCashBookData = async () => {
    try {
      // 1. Fetch Opening balance
      const ob = await cashbookService.getOpeningBalance();
      if (ob && typeof ob.amount === 'number') {
        setOpeningBalance(ob.amount);
        setTempBalance(ob.amount);
      }

      // 2. Fetch Transactions (The new unified API)
      const summary = await cashbookService.getTransactions();
      setCashSummary(summary);

      // 3. Mandatory Debug Logs (Step 9)
      console.log("Cashbook Aggregation Details:");
      console.log("All Inflow/Outflow Transactions:", summary.transactions);
      console.log("Total Cash In:", summary.totalCashIn);
      console.log("Total Cash Out:", summary.totalCashOut);
      console.log("Closing Balance:", summary.closingBalance);
      
    } catch (e) {
      console.error(e);
      toast.error('Failed to load cashbook data from server');
    }
  };

  useEffect(() => {
    loadCashBookData();
  }, []);

  // Filter transactions by date range for display
  const filteredTransactions = (cashSummary.transactions || []).filter((t) => {
    if (!t.date) return false;
    return t.date >= dateFrom && t.date <= dateTo;
  });

  // Totals for the filtered view
  const totalDebit = filteredTransactions.reduce((sum, t) => sum + (t.debit || 0), 0);
  const totalCredit = filteredTransactions.reduce((sum, t) => sum + (t.credit || 0), 0);
  
  // For the final closing balance card, we use the backend's full closing balance
  const currentClosingBalance = cashSummary.closingBalance;

  const handlePrint = () => {
    window.print();
    toast.success('Opening print dialog...');
  };

  const handleEditBalance = () => {
    if (user?.role !== 'admin' && user?.role !== 'superadmin') {
      toast.error('Only admins can edit opening balance');
      return;
    }
    setEditingBalance(true);
    setTempBalance(openingBalance);
  };

  const handleSaveBalance = async () => {
    try {
      await cashbookService.setOpeningBalance(tempBalance);
      setOpeningBalance(tempBalance);
      setEditingBalance(false);
      toast.success('Opening balance updated successfully');
    } catch (e) {
      toast.error('Failed to update opening balance');
    }
  };

  const handleCancelEdit = () => {
    setEditingBalance(false);
    setTempBalance(openingBalance);
  };

  return (
    <div id="cashbook-print-area" className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center print:hidden">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Cash Book</h1>
        <Button onClick={handlePrint}>
          <FaPrint className="mr-2" /> Print Cash Book
        </Button>
      </div>

      {/* Print Header - Only visible when printing */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Mian & Sons Hardware Store</h1>
        <h2 className="text-xl font-semibold text-gray-700 mt-2">Cash Book</h2>
        <p className="text-gray-600 mt-1">
          Period: {new Date(dateFrom).toLocaleDateString()} to {new Date(dateTo).toLocaleDateString()}
        </p>
      </div>

      {/* Opening Balance Card */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <FaMoneyBillWave className="text-2xl text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Opening Balance</p>
              {editingBalance ? (
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    value={tempBalance}
                    onChange={(e) => setTempBalance(Number(e.target.value))}
                    className="w-48"
                    min="0"
                    step="0.01"
                  />
                  <Button size="sm" onClick={handleSaveBalance}>
                    <FaSave />
                  </Button>
                  <Button size="sm" variant="secondary" onClick={handleCancelEdit}>
                    <FaTimes />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    Rs. {openingBalance.toLocaleString()}
                  </p>
                  {(user?.role === 'admin' || user?.role === 'superadmin') && (
                    <button
                      onClick={handleEditBalance}
                      className="text-primary hover:text-primary-dark print:hidden"
                    >
                      <FaEdit />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="text-right print:hidden">
            <p className="text-sm text-gray-600 dark:text-gray-400">Current Closing Balance</p>
            <p className="text-2xl font-bold text-yellow-400 dark:text-yellow-300">Rs. {currentClosingBalance.toLocaleString()}</p>
          </div>
        </div>
      </Card>

      {/* Date Range Filter */}
      <Card className="print:hidden">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input
              label="From Date"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Input
              label="To Date"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div className="flex-1 flex items-end">
            <Button
              variant="secondary"
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setDateFrom(today);
                setDateTo(today);
              }}
              className="w-full"
            >
              Today
            </Button>
          </div>
        </div>
      </Card>

      {/* Cash Book Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Description</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Voucher #</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <div className="flex items-center justify-end gap-1">
                    <FaArrowDown className="text-green-600" />
                    Debit (Cash In)
                  </div>
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <div className="flex items-center justify-end gap-1">
                    <FaArrowUp className="text-red-600" />
                    Credit (Cash Out)
                  </div>
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Balance</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction, index) => (
                <tr
                  key={transaction.id || index}
                  className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    transaction.type === 'opening_balance' ? 'bg-blue-50 dark:bg-blue-900/20 font-semibold' : ''
                  }`}
                >
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                    {transaction.date}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                    {transaction.description}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                    {transaction.voucher || '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-right">
                    {transaction.debit > 0 ? (
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        Rs. {transaction.debit.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-right">
                    {transaction.credit > 0 ? (
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        Rs. {transaction.credit.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900 dark:text-white">
                    Rs. {(transaction.balanceAfter || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-300 dark:border-gray-600">
                <td colSpan="3" className="py-4 px-4 text-sm text-gray-900 dark:text-white">
                  TOTALS
                </td>
                <td className="py-4 px-4 text-sm text-right text-green-600 dark:text-green-400">
                  Rs. {totalDebit.toLocaleString()}
                </td>
                <td className="py-4 px-4 text-sm text-right text-red-600 dark:text-red-400">
                  Rs. {totalCredit.toLocaleString()}
                </td>
                <td className="py-4 px-4 text-sm text-right text-gray-900 dark:text-white">
                  -
                </td>
              </tr>
              <tr className="bg-primary text-white font-bold">
                <td colSpan="5" className="py-4 px-4 text-sm">
                  CLOSING BALANCE
                </td>
                <td className="py-4 px-4 text-sm text-right">
                  <span className="text-yellow-400 dark:text-yellow-300">Rs. {currentClosingBalance.toLocaleString()}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Cash Received</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              Rs. {totalDebit.toLocaleString()}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Cash Paid</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              Rs. {totalCredit.toLocaleString()}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Net Cash Flow</p>
            <p className={`text-2xl font-bold ${(totalDebit - totalCredit) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              Rs. {(totalDebit - totalCredit).toLocaleString()}
            </p>
          </div>
        </Card>
      </div>

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
          
          /* Show only the cashbook print area */
          #cashbook-print-area, #cashbook-print-area * {
            visibility: visible;
          }
          
          /* Position the print area at the absolute top-left */
          #cashbook-print-area {
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
          th:nth-child(1), td:nth-child(1) { width: 10%; } /* Date */
          th:nth-child(2), td:nth-child(2) { width: 25%; } /* Description */
          th:nth-child(3), td:nth-child(3) { width: 29%; } /* Voucher */
          th:nth-child(4), td:nth-child(4) { width: 12%; } /* Debit */
          th:nth-child(5), td:nth-child(5) { width: 12%; } /* Credit */
          th:nth-child(6), td:nth-child(6) { width: 12%; } /* Balance */
          
          /* Ensure Card component doesn't add extra padding in print */
          .bg-white {
            padding: 0 !important;
            box-shadow: none !important;
          }

          /* Explicitly hide sidebar and navigation just in case */
          .sidebar, .navbar, aside, nav {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default CashBook;
