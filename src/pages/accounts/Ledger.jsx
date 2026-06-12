import React, { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Input from '../../components/common/Input';
import { ledgerService } from '../../services/ledgerService';
import { toast } from 'react-toastify';

const Ledger = () => {
  const [ledger, setLedger] = useState([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const loadLedger = async () => {
    try {
      const data = await ledgerService.getAll(fromDate, toDate);
      setLedger(data);
    } catch (e) {
      toast.error('Failed to load ledger entries from server');
      setLedger([]);
    }
  };

  useEffect(() => {
    loadLedger();
    // eslint-disable-next-line
  }, [fromDate, toDate]);

  const columns = [
    { label: 'Date', key: 'date' },
    { label: 'Account', key: 'account' },
    { label: 'Description', key: 'description' },
    { label: 'Debit', key: 'debit', render: (row) => row.debit > 0 ? `Rs. ${Number(row.debit).toLocaleString()}` : '-' },
    { label: 'Credit', key: 'credit', render: (row) => row.credit > 0 ? `Rs. ${Number(row.credit).toLocaleString()}` : '-' },
    { label: 'Balance', key: 'balance', render: (row) => `Rs. ${Number(row.balance).toLocaleString()}` },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Ledger</h1>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Input type="date" label="From Date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          <Input type="date" label="To Date" value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
        <Table columns={columns} data={ledger} />
      </Card>
    </div>
  );
};

export default Ledger;
