import React, { useEffect, useState } from 'react';
import { FaPrint, FaShoppingCart, FaMoneyBillWave, FaReceipt, FaArrowDown, FaArrowUp, FaClock } from 'react-icons/fa';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import { toast } from 'react-toastify';
import { daybookService } from '../../services/daybookService';


const DayBook = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [daySummary, setDaySummary] = useState({
    transactions: [],
    totalIn: 0,
    totalOut: 0,
    netBalance: 0
  });

  const loadDayBookData = async (date) => {
    try {
      const summary = await daybookService.getTransactions(date);
      setDaySummary(summary);

      // Mandatory Debug Logs (Step 9)
      console.log("Daybook Analysis for Date:", date);
      console.log("Transactions Aggregated:", summary.transactions);
      console.log("Total Inflow (Cash In):", summary.totalIn);
      console.log("Total Outflow (Cash Out):", summary.totalOut);
      console.log("Net Daily Balance:", summary.netBalance);
      
    } catch (e) {
      console.error(e);
      toast.error('Failed to load day book transactions from server');
      setDaySummary({ transactions: [], totalIn: 0, totalOut: 0, netBalance: 0 });
    }
  };

  useEffect(() => {
    loadDayBookData(selectedDate);
  }, [selectedDate]);

  const filteredTransactions = daySummary.transactions || [];
  const totalIncome = daySummary.totalIn;
  const totalExpenses = daySummary.totalOut;
  const netCash = daySummary.netBalance;

  // Derived totals for specific summary cards (backward compatibility)
  const salesTotal = filteredTransactions
    .filter(t => t.module === 'Sales')
    .reduce((sum, t) => sum + t.cashIn, 0);

  const purchasesTotal = filteredTransactions
    .filter(t => t.module === 'Purchases')
    .reduce((sum, t) => sum + t.cashOut, 0);

  const expensesTotal = filteredTransactions
    .filter(t => t.module === 'Expenses')
    .reduce((sum, t) => sum + t.cashOut, 0);

  const paymentsReceived = filteredTransactions
    .filter(t => t.type?.includes('Payment Received') || (t.module === 'Accounts' && t.cashIn > 0))
    .reduce((sum, t) => sum + t.cashIn, 0);

  const paymentsMade = filteredTransactions
    .filter(t => t.type?.includes('Payment Made') || (t.module === 'Accounts' && t.cashOut > 0))
    .reduce((sum, t) => sum + t.cashOut, 0);

  const handlePrint = () => {
    window.print();
    toast.success('Opening print dialog...');
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'Sale':
        return 'success';
      case 'Purchase':
        return 'warning';
      case 'Expense':
        return 'danger';
      case 'Payment Received':
        return 'info';
      case 'Payment Made':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Sale':
        return <FaShoppingCart className="text-green-600" />;
      case 'Purchase':
        return <FaReceipt className="text-orange-600" />;
      case 'Expense':
        return <FaMoneyBillWave className="text-red-600" />;
      case 'Payment Received':
        return <FaArrowDown className="text-blue-600" />;
      case 'Payment Made':
        return <FaArrowUp className="text-gray-600" />;
      default:
        return null;
    }
  };

  return (
    <div id="daybook-print-area" className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center print:hidden">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Day Book</h1>
        <Button onClick={handlePrint}>
          <FaPrint className="mr-2" /> Print Day Report
        </Button>
      </div>

      {/* Print Header - Only visible when printing */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Mian & Sons Hardware Store</h1>
        <h2 className="text-xl font-semibold text-gray-700 mt-2">Day Book Report</h2>
        <p className="text-gray-600 mt-1">
          Date: {new Date(selectedDate).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Date Selector */}
      <Card className="print:hidden">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input
              label="Select Date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div className="flex-1 flex items-end">
            <Button
              variant="secondary"
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="w-full"
            >
              Today
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <FaShoppingCart className="text-2xl text-green-600 dark:text-green-400" />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Sales Total</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              Rs. {salesTotal.toLocaleString()}
            </p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <FaReceipt className="text-2xl text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Purchases Total</p>
            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
              Rs. {purchasesTotal.toLocaleString()}
            </p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <FaMoneyBillWave className="text-2xl text-red-600 dark:text-red-400" />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Expenses Total</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">
              Rs. {expensesTotal.toLocaleString()}
            </p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <FaArrowDown className="text-2xl text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Payments Received</p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
              Rs. {paymentsReceived.toLocaleString()}
            </p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <FaArrowUp className="text-2xl text-gray-600 dark:text-gray-400" />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Payments Made</p>
            <p className="text-lg font-bold text-gray-600 dark:text-gray-400">
              Rs. {paymentsMade.toLocaleString()}
            </p>
          </div>
        </Card>
        
        <Card className={netCash >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <FaMoneyBillWave className={`text-2xl ${netCash >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Net Cash</p>
            <p className={`text-lg font-bold ${netCash >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              Rs. {netCash.toLocaleString()}
            </p>
          </div>
        </Card>
      </div>

      {/* Detailed Transaction List */}
      <Card>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            Transaction Details
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {filteredTransactions.length} transactions on {new Date(selectedDate).toLocaleDateString()}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Time</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Description</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Voucher #</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction, index) => (
                  <tr
                    key={transaction.voucher || index}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <FaClock className="text-gray-400" />
                        {transaction.time}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(transaction.type)}
                        <Badge variant={getTypeColor(transaction.type)}>
                          {transaction.type}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                      {transaction.description}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {transaction.voucher}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-semibold">
                      <span className={transaction.cashIn > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        {transaction.cashIn > 0 ? '+' : '-'} Rs. {(transaction.cashIn > 0 ? transaction.cashIn : transaction.cashOut).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-gray-500 dark:text-gray-400">
                    No transactions found for the selected date
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-300 dark:border-gray-600">
                <td colSpan="4" className="py-4 px-4 text-sm text-gray-900 dark:text-white">
                  TOTAL INCOME
                </td>
                <td className="py-4 px-4 text-sm text-right text-green-600 dark:text-green-400">
                  Rs. {totalIncome.toLocaleString()}
                </td>
              </tr>
              <tr className="bg-gray-100 dark:bg-gray-800 font-bold">
                <td colSpan="4" className="py-4 px-4 text-sm text-gray-900 dark:text-white">
                  TOTAL EXPENSES
                </td>
                <td className="py-4 px-4 text-sm text-right text-red-600 dark:text-red-400">
                  Rs. {totalExpenses.toLocaleString()}
                </td>
              </tr>
              <tr className="bg-primary text-white font-bold">
                <td colSpan="4" className="py-4 px-4 text-sm">
                  NET CASH FLOW
                </td>
                <td className="py-4 px-4 text-sm text-right">
                  Rs. {netCash.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

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
          
          /* Show only the daybook print area */
          #daybook-print-area, #daybook-print-area * {
            visibility: visible;
          }
          
          /* Position the print area at the absolute top-left */
          #daybook-print-area {
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
          th:nth-child(1), td:nth-child(1) { width: 10%; } /* Time */
          th:nth-child(2), td:nth-child(2) { width: 15%; } /* Type */
          th:nth-child(3), td:nth-child(3) { width: 35%; } /* Description */
          th:nth-child(4), td:nth-child(4) { width: 25%; } /* Voucher */
          th:nth-child(5), td:nth-child(5) { width: 15%; } /* Amount */
          
          /* Explicitly hide sidebar and navigation just in case */
          .sidebar, .navbar, aside, nav {
            display: none !important;
          }

          /* Ensure Card component doesn't add extra padding in print */
          .bg-white {
            padding: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default DayBook;
