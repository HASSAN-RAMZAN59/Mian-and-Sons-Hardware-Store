import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Select from '../../components/common/Select';
import Input from '../../components/common/Input';
import { FaArrowLeft, FaFileExport, FaPrint } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { supplierService } from '../../services/supplierService';

const normalizeSupplier = (supplier) => ({
  id: supplier?.id ?? supplier?._id,
  companyName: supplier?.companyName || supplier?.name || '',
  contactPerson: supplier?.contactPerson || supplier?.contactName || '',
  phone: supplier?.phone || supplier?.contact || '',
  email: supplier?.email || '',
  address: supplier?.address || '',
  city: supplier?.city || '',
  openingBalance: Number(supplier?.openingBalance || 0),
  balancePayable: Number(supplier?.balancePayable || 0)
});

const normalizeLedgerEntry = (entry) => ({
  date: entry?.date || entry?.createdAt || entry?.transactionDate || '',
  description: entry?.description || entry?.detail || entry?.note || '',
  invoice: entry?.invoice || entry?.invoiceNo || entry?.reference || '',
  debit: Number(entry?.debit || 0),
  credit: Number(entry?.credit || 0),
  balance: entry?.balance ?? entry?.runningBalance ?? null
});

const SupplierLedger = () => {
  const { id } = useParams();
  const [ledger, setLedger] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplier, setSupplier] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [summary, setSummary] = useState({ totalDebit: 0, totalCredit: 0, balance: 0 });
  const [isLoading, setIsLoading] = useState(false);

  const loadSuppliers = useCallback(async () => {
    const data = await supplierService.getAll();
    const list = Array.isArray(data) ? data : data?.data || data?.suppliers || [];
    const normalized = list.map(normalizeSupplier).filter((item) => item.id);
    setSuppliers(normalized);
  }, []);

  const loadLedger = useCallback(async (supplierId, openingBalance = 0) => {
    if (!supplierId) {
      setLedger([]);
      setSummary({ totalDebit: 0, totalCredit: 0, balance: 0 });
      return;
    }

    setIsLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const data = await supplierService.getLedger(supplierId, params);
      
      // Mandatory Debug Logs
      console.log("SupplierId:", supplierId);
      console.log("Response Data:", data);

      const rawEntries = Array.isArray(data)
        ? data
        : data?.ledger || data?.entries || data?.data || [];

      console.log("Raw Entries:", rawEntries);

      const normalizedEntries = rawEntries.map(normalizeLedgerEntry);
      const sortedEntries = normalizedEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

      let runningBalance = Number(openingBalance || 0);
      const entriesWithBalance = sortedEntries.map((entry) => {
        if (entry.balance === null || Number.isNaN(Number(entry.balance))) {
          runningBalance = runningBalance - entry.debit + entry.credit;
          return { ...entry, balance: runningBalance };
        }
        runningBalance = Number(entry.balance);
        return { ...entry, balance: runningBalance };
      });

      setLedger(entriesWithBalance);

      const totalDebit = entriesWithBalance.reduce((s, e) => s + e.debit, 0);
      const totalCredit = entriesWithBalance.reduce((s, e) => s + e.credit, 0);
      const balance = totalCredit - totalDebit + Number(openingBalance || 0);
      setSummary({ totalDebit, totalCredit, balance });
    } catch (error) {
      toast.error('Unable to load supplier ledger.');
      setLedger([]);
      setSummary({ totalDebit: 0, totalCredit: 0, balance: 0 });
    } finally {
      setIsLoading(false);
    }
  }, [endDate, startDate]);

  useEffect(() => {
    loadSuppliers().catch(() => toast.error('Unable to load suppliers.'));
  }, [loadSuppliers]);

  useEffect(() => {
    if (id) {
      setSelectedSupplierId(String(id));
    }
  }, [id]);

  useEffect(() => {
    if (!selectedSupplierId) {
      setSupplier(null);
      setLedger([]);
      setSummary({ totalDebit: 0, totalCredit: 0, balance: 0 });
      return;
    }

    const current = suppliers.find((item) => String(item.id) === String(selectedSupplierId));
    if (current) {
      setSupplier(current);
      loadLedger(current.id, current.openingBalance);
    }
  }, [selectedSupplierId, suppliers, loadLedger]);

  useEffect(() => {
    if (!selectedSupplierId) return;
    loadLedger(selectedSupplierId, supplier?.openingBalance || 0);
  }, [startDate, endDate, selectedSupplierId, loadLedger, supplier]);

  useEffect(() => {
    const refresh = () => {
      loadSuppliers().catch(() => {});
      if (selectedSupplierId) {
        loadLedger(selectedSupplierId, supplier?.openingBalance || 0).catch(() => {});
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    const handleSuppliersUpdated = () => refresh();

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
  }, [loadSuppliers, loadLedger, selectedSupplierId, supplier]);

  const handleExport = () => {
    if (!ledger.length) {
      toast.error('No ledger entries to export');
      return;
    }

    const headers = ['Date', 'Description', 'Invoice', 'Debit', 'Credit', 'Balance'];
    const rows = ledger.map((entry) => [
      entry.date,
      entry.description,
      entry.invoice,
      entry.debit,
      entry.credit,
      entry.balance
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `supplier-ledger-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Ledger exported successfully!');
  };
  const handlePrint = () => window.print();

  const formatCurrency = (amount) => `Rs. ${Number(amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;

  const supplierOptions = useMemo(() => suppliers.map((item) => ({
    value: String(item.id),
    label: `${item.companyName || 'Supplier'}${item.phone ? ` - ${item.phone}` : ''}`
  })), [suppliers]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin/suppliers">
            <Button variant="outline" size="sm"><FaArrowLeft className="mr-2" />Back</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Supplier Ledger</h1>
            {supplier && <p className="text-gray-500">{supplier.companyName}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><FaFileExport className="mr-2" />Export</Button>
          <Button variant="outline" size="sm" onClick={handlePrint}><FaPrint className="mr-2" />Print</Button>
        </div>
      </div>

      {supplier && (
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Supplier Name</p>
              <p className="font-semibold text-gray-800 dark:text-white">{supplier.companyName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Contact</p>
              <p className="font-semibold text-gray-800 dark:text-white">{supplier.phone || supplier.contactPerson || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Current Balance (Payable)</p>
              <p className="font-semibold text-red-600">{formatCurrency(summary.balance)}</p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="min-w-[220px]">
            <Select
              label="Select Supplier"
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              options={supplierOptions}
              placeholder="Choose a supplier..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700">
                {['Date', 'Description', 'Invoice #', 'Debit', 'Credit', 'Balance'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {ledger.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">
                    {!selectedSupplierId
                      ? 'Select a supplier to view ledger'
                      : isLoading
                        ? 'Loading ledger...'
                        : 'No ledger entries found'}
                  </td>
                </tr>
              ) : ledger.map((entry, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{entry.date}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{entry.description}</td>
                  <td className="px-4 py-3 text-sm font-mono text-primary">{entry.invoice || '-'}</td>
                  <td className="px-4 py-3 text-sm text-green-600 font-medium">{entry.debit > 0 ? formatCurrency(entry.debit) : '-'}</td>
                  <td className="px-4 py-3 text-sm text-red-600 font-medium">{entry.credit > 0 ? formatCurrency(entry.credit) : '-'}</td>
                  <td className={`px-4 py-3 text-sm font-semibold ${entry.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(Math.abs(entry.balance))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 dark:bg-gray-700 font-semibold">
                <td colSpan={3} className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Totals</td>
                <td className="px-4 py-3 text-sm text-green-600">{formatCurrency(summary.totalDebit)}</td>
                <td className="px-4 py-3 text-sm text-red-600">{formatCurrency(summary.totalCredit)}</td>
                <td className={`px-4 py-3 text-sm ${summary.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(Math.abs(summary.balance))}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">Total Payments Made</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(summary.totalDebit)}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">Total Purchases</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(summary.totalCredit)}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">Outstanding Balance</p>
            <p className={`text-xl font-bold ${summary.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(Math.abs(summary.balance))}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SupplierLedger;

