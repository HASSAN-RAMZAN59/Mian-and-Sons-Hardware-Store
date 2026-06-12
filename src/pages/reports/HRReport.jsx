import React, { useEffect, useRef, useState } from 'react';
import { FaFileExport, FaPrint, FaUsers, FaCalendarCheck, FaMoneyBillWave, FaUmbrellaBeach, FaChartPie, FaChartBar } from 'react-icons/fa';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { Navigate } from 'react-router-dom';
import { reportService } from '../../services/reportService';

const HRReport = () => {
  const { user } = useAuth();
  const printRef = useRef();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState({
    totalEmployees: 0,
    present: 0,
    absent: 0,
    totalSalary: 0,
    totalLeaves: 0,
    employeeWiseReport: [],
    history: []
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [allocations, setAllocations] = useState({
    Annual: 15,
    Sick: 10,
    Casual: 10,
    Other: 0
  });
  const [editForm, setEditForm] = useState({
    Annual: 15,
    Sick: 10,
    Casual: 10,
    Other: 0
  });

  const fetchHRData = async () => {
    setIsLoading(true);
    try {
      const data = await reportService.getHRSummary({ month: selectedMonth });
      setReportData(data);
      console.log("[HR REPORT] Fetched Data:", data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load HR report data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllocations = async () => {
    try {
      const data = await reportService.getLeaveAllocations();
      if (data) {
        setAllocations(data);
        setEditForm(data);
      }
    } catch (error) {
      console.error("Failed to fetch leave allocations:", error);
    }
  };

  useEffect(() => {
    fetchHRData();
    fetchAllocations();
  }, [selectedMonth]);

  const handleOpenAllocationsModal = () => {
    setEditForm({ ...allocations });
    setIsModalOpen(true);
  };

  const handleSaveAllocations = async (e) => {
    e.preventDefault();
    try {
      const data = await reportService.updateLeaveAllocations(editForm);
      if (data && data.success) {
        setAllocations(data.allocations);
        toast.success("Leave allocations updated successfully!");
        setIsModalOpen(false);
      } else {
        toast.error("Failed to update leave allocations");
      }
    } catch (error) {
      console.error("Error updating leave allocations:", error);
      toast.error("An error occurred while updating leave allocations");
    }
  };

  const getDaysInMonth = (monthKey) => {
    const [year, month] = monthKey.split('-').map((part) => parseInt(part));
    return new Date(year, month, 0).getDate();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const attendanceDistribution = [
    { name: 'Present', value: reportData.present, color: '#10B981' },
    { name: 'Absent', value: reportData.absent, color: '#EF4444' },
    { name: 'On Leave', value: reportData.totalLeaves, color: '#F59E0B' },
  ];

  // Handle Print
  const handlePrint = () => {
    window.print();
  };

  const totalWorkingDays = 26; // Default standard
  const averageAttendance = reportData.totalEmployees > 0 
    ? ((reportData.present / (reportData.totalEmployees * totalWorkingDays)) * 100).toFixed(1)
    : '0.0';

  // Handle Export to Excel
  const handleExportExcel = () => {
    const headers = ['Employee ID', 'Name', 'Designation', 'Department', 'Salary', 'Present', 'Absent', 'Leave'];
    const rows = reportData.employeeWiseReport.map((emp) => [
      emp.employeeId,
      emp.name,
      emp.designation,
      emp.department,
      emp.salary,
      emp.present,
      emp.absent,
      emp.leaves,
    ]);

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += headers.join(',') + '\n';
    rows.forEach((row) => {
      csvContent += row.map((cell) => `"${cell}"`).join(',') + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hr_report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('HR report exported successfully!');
  };

  // Handle Export to PDF
  const handleExportPDF = () => {
    window.print();
    toast.info("Use your browser's Print to PDF feature to save as PDF");
  };

  const totalEmployees = reportData.totalEmployees;
  const totalSalaryPaid = reportData.totalSalary;
  const totalLeaveDays = reportData.totalLeaves;

  const leaveSummaryData = [
    { type: 'Annual Leave', taken: reportData.leavesByType?.Annual || 0, allocated: allocations.Annual },
    { type: 'Sick Leave', taken: reportData.leavesByType?.Sick || 0, allocated: allocations.Sick },
    { type: 'Casual Leave', taken: reportData.leavesByType?.Casual || 0, allocated: allocations.Casual },
    { type: 'Other', taken: reportData.leavesByType?.Other || 0, allocated: allocations.Other }
  ].map(l => ({
    ...l,
    total: l.allocated,
    remaining: Math.max(0, l.allocated - l.taken)
  }));

  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    toast.error('Access denied. This page is only accessible to administrators.');
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div ref={printRef}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 print:mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white print:text-black">HR Report</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 print:text-gray-700">
            Real-time workforce analytics and payroll tracking
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
          <Button onClick={handleExportPDF} variant="secondary">
            <FaFileExport className="mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Month Selector */}
      <Card className="mb-6 print:mb-4 print:border print:border-gray-300">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white print:text-black">Report Period</h2>
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 print:text-black">
              Select Month:
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white print:hidden"
            />
            <span className="hidden print:inline font-semibold">
              {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 print:mb-4">
        <Card className="print:border print:border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-700">Total Employees</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1 print:text-black">{totalEmployees}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg print:bg-blue-100">
              <FaUsers className="text-2xl text-blue-600 dark:text-blue-400 print:text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="print:border print:border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-700">Attendance Index</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1 print:text-black">{averageAttendance}%</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg print:bg-green-100">
              <FaCalendarCheck className="text-2xl text-green-600 dark:text-green-400 print:text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="print:border print:border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-700">Total Salary PAID</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1 print:text-black">
                {formatCurrency(totalSalaryPaid)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg print:bg-purple-100">
              <FaMoneyBillWave className="text-2xl text-purple-600 dark:text-purple-400 print:text-purple-700" />
            </div>
          </div>
        </Card>

        <Card className="print:border print:border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-700">Leaves Taken</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1 print:text-black">{totalLeaveDays}</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg print:bg-yellow-100">
              <FaUmbrellaBeach className="text-2xl text-yellow-600 dark:text-yellow-400 print:text-yellow-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 print:grid-cols-1 print:mb-4">
        {/* Attendance Pie Chart */}
        <Card className="print:border print:border-gray-300 print:page-break-inside-avoid">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 print:text-black flex items-center">
            <FaChartPie className="mr-2" />
            Attendance Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={attendanceDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {attendanceDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Monthly Salary Bar Chart */}
        <Card className="print:border print:border-gray-300 print:page-break-inside-avoid">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 print:text-black flex items-center">
            <FaChartBar className="mr-2" />
            Monthly Payroll Trend
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.history}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="totalSalary" fill="#8B5CF6" name="Total Salary" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Employee-wise Report */}
      <Card className="mb-6 print:mb-4 print:border print:border-gray-300 print:page-break-inside-avoid">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 print:text-black">
          Employee Performance Breakdown
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 print:divide-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-800 print:bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">Designation</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">Present</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">Absent</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">Leaves</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">Net Salary</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700 print:bg-white print:divide-gray-300">
              {reportData.employeeWiseReport.map((emp) => (
                <tr key={emp.employeeId} className="hover:bg-gray-50 dark:hover:bg-gray-800 print:hover:bg-white">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white print:text-black">{emp.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 print:text-black">{emp.designation}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-green-600 dark:text-green-400 print:text-green-700">{emp.present}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-red-600 dark:text-red-400 print:text-red-700">{emp.absent}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-yellow-600 dark:text-yellow-400 print:text-yellow-700">{emp.leaves}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-gray-900 dark:text-white print:text-black">{formatCurrency(emp.salary)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Leave Breakdown */}
      <Card className="mb-6 print:mb-4 print:border print:border-gray-300 print:page-break-inside-avoid">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white print:text-black">Leave Analysis</h2>
          <Button onClick={handleOpenAllocationsModal} variant="secondary" size="sm" className="print:hidden">
            Edit Allocations
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 print:divide-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-800 print:bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">Leave Category</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">Allocated</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">Taken</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">Remaining</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700 print:bg-white print:divide-gray-300">
              {leaveSummaryData.map((leave) => (
                <tr key={leave.type} className="hover:bg-gray-50 dark:hover:bg-gray-800 print:hover:bg-white">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white print:text-black">{leave.type}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white print:text-black">{leave.total}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-red-600 dark:text-red-400 print:text-red-700">{leave.taken}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-green-600 dark:text-green-400 print:text-green-700">{leave.remaining}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Leave Allocations Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Edit Allocated Leaves"
        size="sm"
        footer={
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveAllocations}>
              Save Changes
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Annual Leave
            </label>
            <Input
              type="number"
              value={editForm.Annual}
              onChange={(e) => setEditForm({ ...editForm, Annual: Math.max(0, parseInt(e.target.value) || 0) })}
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sick Leave
            </label>
            <Input
              type="number"
              value={editForm.Sick}
              onChange={(e) => setEditForm({ ...editForm, Sick: Math.max(0, parseInt(e.target.value) || 0) })}
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Casual Leave
            </label>
            <Input
              type="number"
              value={editForm.Casual}
              onChange={(e) => setEditForm({ ...editForm, Casual: Math.max(0, parseInt(e.target.value) || 0) })}
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Other Leave
            </label>
            <Input
              type="number"
              value={editForm.Other}
              onChange={(e) => setEditForm({ ...editForm, Other: Math.max(0, parseInt(e.target.value) || 0) })}
              min="0"
            />
          </div>
        </div>
      </Modal>

      {/* Footer for Print */}
      <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-center text-sm text-gray-600">
        <p>Generated by Mian & Sons Hardware Management System</p>
        <p>Report Date: {new Date().toLocaleString()}</p>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #root, #root * { visibility: visible; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </div>
  );
};

export default HRReport;
