import React, { useState, useEffect, useCallback } from 'react';
import { payrollService } from '../../services/payrollService';
import { attendanceService } from '../../services/attendanceService';
import { employeeService } from '../../services/employeeService';
import { branchService } from '../../services/branchService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import { FaMoneyCheckAlt, FaCheckCircle, FaCalendarAlt, FaTimesCircle, FaFileInvoice, FaPrint } from 'react-icons/fa';
import { logAudit } from '../../utils/audit';

const Payroll = () => {
  const { user, checkPermission } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [showSalarySlip, setShowSalarySlip] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [employees, setEmployees] = useState([]);
  const [payrollData, setPayrollData] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');

  const normalizeEmployees = (rows = []) =>
    (Array.isArray(rows) ? rows : []).map((emp) => ({
      _id: emp._id,
      employeeName: emp.fullName || emp.name || '',
      designation: emp.designation || '',
      department: emp.department || '',
      basicSalary: Number(emp.basicSalary || emp.salary || 0),
      allowances: Number(emp.allowances || 0)
    }));

  const normalizeAttendanceRecords = (rows = []) => {
    const records = {};
    (Array.isArray(rows) ? rows : []).forEach((rec) => {
      const employeeId = rec.employeeId?._id || rec.employeeId;
      if (!employeeId) return;
      if (!records[rec.date]) records[rec.date] = {};
      records[rec.date][employeeId] = {
        status: rec.status,
        timeIn: rec.timeIn || '09:00',
        timeOut: rec.timeOut || '18:00',
        notes: rec.notes || ''
      };
    });
    return records;
  };

  const normalizePayrollRows = (rows = []) =>
    (Array.isArray(rows) ? rows : []).map((row) => ({
      ...row,
      _id: row._id,
      employeeId: row.employeeId?._id || row.employeeId,
      employee: row.employeeId && typeof row.employeeId === 'object' ? row.employeeId : null,
      employeeName: row.employeeId?.fullName || row.employeeId?.name || row.employeeName || '',
      basicSalary: Number(row.basicSalary || 0),
      allowances: Number(row.allowances || 0),
      overtime: Number(row.overtime || 0),
      deductions: Number(row.deductions || 0),
      advanceDeduction: Number(row.advanceDeduction || 0),
      absenceFine: Number(row.absenceFine || 0),
      grossSalary: Number(row.grossSalary || 0),
      netSalary: Number(row.netSalary || 0)
    }));

  const dedupePayrollRows = (rows = []) => {
    const uniqueByEmployee = new Map();
    for (const row of rows) {
      const employeeKey = row.employeeId?._id || row.employeeId;
      if (!employeeKey) continue;

      const current = uniqueByEmployee.get(employeeKey);
      if (!current) {
        uniqueByEmployee.set(employeeKey, row);
        continue;
      }

      // Prefer paid entry first; otherwise keep the latest ObjectId.
      if (current.status !== 'Paid' && row.status === 'Paid') {
        uniqueByEmployee.set(employeeKey, row);
        continue;
      }
      if (String(row._id || '') > String(current._id || '')) {
        uniqueByEmployee.set(employeeKey, row);
      }
    }

    return Array.from(uniqueByEmployee.values());
  };

  const fetchPayrollData = useCallback(async () => {
    try {
      const [employeeRows, attendanceRows, payrollRows] = await Promise.all([
        employeeService.getAll(selectedBranchId ? { branchId: selectedBranchId } : undefined),
        attendanceService.getAll(selectedBranchId),
        selectedEmployeeId ? payrollService.getByEmployee(selectedEmployeeId, selectedBranchId) : payrollService.getAll(selectedBranchId)
      ]);
      setEmployees(normalizeEmployees(employeeRows));
      setAttendanceRecords(normalizeAttendanceRecords(attendanceRows));
      const rowsForMonth = (Array.isArray(payrollRows) ? payrollRows : []).filter(
        (row) => row.month === selectedMonth
      );
      setPayrollData(normalizePayrollRows(dedupePayrollRows(rowsForMonth)));
    } catch (error) {
      toast.error('Failed to load payroll data');
    }
  }, [selectedEmployeeId, selectedMonth, selectedBranchId]);

  useEffect(() => {
    fetchPayrollData();
  }, [fetchPayrollData]);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const b = await branchService.getAll();
        setBranches(b || []);
      } catch (err) {
        // ignore
      }
    };
    loadBranches();
  }, []);

  const buildAttendanceStats = useCallback((employeeId) => {
    const year = parseInt(selectedMonth.split('-')[0]);
    const month = parseInt(selectedMonth.split('-')[1]);
    const daysInMonth = new Date(year, month, 0).getDate();
    let present = 0;
    let absent = 0;
    let late = 0;
    let halfDay = 0;
    let holidays = 0;

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = `${selectedMonth}-${String(day).padStart(2, '0')}`;
      const dayRecords = attendanceRecords[dateKey] || {};
      const record =
        dayRecords[employeeId] ||
        dayRecords[String(employeeId)] ||
        dayRecords[String(employeeId)];
      if (!record?.status) continue;

      const status = record.status;
      if (status === 'Present' || status === 'P') present += 1;
      else if (status === 'Absent' || status === 'A') absent += 1;
      else if (status === 'Late' || status === 'L') late += 1;
      else if (status === 'Half Day' || status === 'HD') halfDay += 1;
      else if (status === 'Holiday' || status === 'H') holidays += 1;
    }

    const workingDays = Math.max(0, daysInMonth - holidays);
    const payableDays = present + late + (halfDay * 0.5);

    return { workingDays, presentDays: present + late + halfDay, payableDays, absent };
  }, [attendanceRecords, selectedMonth]);

  const getAbsenceFine = useCallback((employee) => {
    const stats = buildAttendanceStats(employee._id);
    if (stats.absent > 3) {
      return Math.round(Number(employee.basicSalary || 0) * 0.05);
    }
    return 0;
  }, [buildAttendanceStats]);

  const createPayrollPayload = useCallback((employee) => {
    const stats = buildAttendanceStats(employee._id);
    const basicSalary = Number(employee.basicSalary || 0);
    const allowances = Number(employee.allowances || 0);
    const overtime = 0;
    const deductions = 0;
    const advanceDeduction = 0;
    const absenceFine = Number(getAbsenceFine(employee));
    const grossSalary = basicSalary + allowances + overtime;
    const netSalary = Math.max(0, grossSalary - deductions - advanceDeduction - absenceFine);

    return {
      employeeId: employee._id,
      branchId: selectedBranchId || undefined,
      month: selectedMonth,
      amount: netSalary,
      employeeName: employee.employeeName,
      designation: employee.designation,
      department: employee.department,
      basicSalary,
      allowances,
      overtime,
      deductions,
      advanceDeduction,
      absenceFine,
      grossSalary,
      netSalary,
      status: 'Pending',
      workingDays: stats.workingDays,
      presentDays: stats.presentDays,
      payableDays: stats.payableDays,
      paidDate: null
    };
  }, [buildAttendanceStats, getAbsenceFine, selectedMonth]);

  const handleGeneratePayroll = async () => {
    if (!checkPermission('hr', 'create')) {
      toast.error('You do not have permission to generate payroll');
      return;
    }
    if (!selectedEmployeeId) {
      toast.error('Select an employee before generating payroll');
      return;
    }
    if (!employees.length) {
      toast.error('Add employees first to generate payroll');
      return;
    }
    const employee = employees.find((emp) => emp._id === selectedEmployeeId);
    if (!employee) {
      toast.error('Selected employee was not found');
      return;
    }

    try {
      const payload = createPayrollPayload(employee);
      console.log('[Payroll] create payload', payload);
      const created = await payrollService.create(payload);
      console.log('[Payroll] create response', created);
      await fetchPayrollData();
      toast.success('Payroll generated and saved to backend');
    } catch (error) {
      toast.error('Failed to generate payroll');
      return;
    }

    logAudit({
      user,
      action: 'Created',
      module: 'Payroll',
      description: `Generated payroll for ${employee.employeeName} (${selectedMonth})`
    });
  };

  const handlePayIndividual = async (employee) => {
    if (!checkPermission('hr', 'update')) {
      toast.error('You do not have permission to process payments');
      return;
    }

    try {
      const payload = {
        ...employee,
        status: 'Paid',
        paidDate: new Date().toISOString().split('T')[0]
      };
      console.log('[Payroll] update payload', payload);
      const updated = await payrollService.update(employee._id, payload);
      console.log('[Payroll] update response', updated);
      await fetchPayrollData();
    } catch (error) {
      toast.error('Failed to process payroll payment');
      return;
    }

    logAudit({
      user,
      action: 'Updated',
      module: 'Payroll',
      description: `Marked payroll paid for ${employee.employeeName}`
    });

    toast.success(`Payment processed for ${employee.employeeName}`);
  };

  const handlePayAll = async () => {
    if (!checkPermission('hr', 'update')) {
      toast.error('You do not have permission to process payments');
      return;
    }

    const pendingCount = payrollData.filter(emp => emp.status === 'Pending').length;

    try {
      const pendingRows = payrollData.filter((emp) => emp.status === 'Pending');
      for (const row of pendingRows) {
        const payload = {
          ...row,
          status: 'Paid',
          paidDate: new Date().toISOString().split('T')[0]
        };
        console.log('[Payroll] bulk update payload', payload);
        const updated = await payrollService.update(row._id, payload);
        console.log('[Payroll] bulk update response', updated);
      }
      await fetchPayrollData();
    } catch (error) {
      toast.error('Failed to process bulk payroll payment');
      return;
    }

    logAudit({
      user,
      action: 'Updated',
      module: 'Payroll',
      description: `Marked payroll paid for ${pendingCount} employees`
    });

    toast.success(`Bulk payment processed for ${pendingCount} employees!`);
  };

  const handleViewSalarySlip = (employee) => {
    setSelectedEmployee(employee);
    setShowSalarySlip(true);
  };

  const handlePrintSlip = () => {
    window.print();
    toast.success('Opening print dialog...');
  };

  // Check permission
  if (!checkPermission('hr', 'read') && user?.role !== 'admin' && user?.role !== 'superadmin') {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Only administrators can access payroll management.
          </p>
        </Card>
      </div>
    );
  }

  // Calculate totals
  const totals = payrollData.reduce(
    (acc, emp) => ({
      basicSalary: acc.basicSalary + emp.basicSalary,
      allowances: acc.allowances + emp.allowances,
      overtime: acc.overtime + emp.overtime,
      deductions: acc.deductions + emp.deductions,
      advanceDeduction: acc.advanceDeduction + emp.advanceDeduction,
      absenceFine: acc.absenceFine + Number(emp.absenceFine || 0),
      grossSalary: acc.grossSalary + emp.grossSalary,
      netSalary: acc.netSalary + emp.netSalary,
    }),
    { basicSalary: 0, allowances: 0, overtime: 0, deductions: 0, advanceDeduction: 0, absenceFine: 0, grossSalary: 0, netSalary: 0 }
  );

  const pendingCount = payrollData.filter(emp => emp.status === 'Pending').length;
  const paidCount = payrollData.filter(emp => emp.status === 'Paid').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Payroll Management</h1>
        <div className="flex gap-2">
          <Button onClick={handleGeneratePayroll} variant="secondary">
            <FaMoneyCheckAlt className="mr-2" /> Generate Payroll
          </Button>
          {pendingCount > 0 && (
            <Button onClick={handlePayAll}>
              <FaCheckCircle className="mr-2" /> Pay All ({pendingCount})
            </Button>
          )}
        </div>
      </div>

      {/* Month Selector & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <Input
            label="Select Month"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </Card>

        <Card>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Branch
          </label>
          <Select value={selectedBranchId} onChange={(e) => setSelectedBranchId(e.target.value)}>
            <option value="">All Branches</option>
            {branches.map(b => (
              <option key={b._id || b.id} value={b._id || b.id}>{b.name}</option>
            ))}
          </Select>
        </Card>

        <Card>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Employee
          </label>
          <Select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
          >
            <option value="">All Employees</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.employeeName}
              </option>
            ))}
          </Select>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <FaCalendarAlt className="text-2xl text-primary" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Employees</p>
              <p className="text-2xl font-bold text-primary">{payrollData.length}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-green-50 dark:bg-green-900/20">
          <div className="flex items-center gap-3">
            <FaCheckCircle className="text-2xl text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Paid</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{paidCount}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-orange-50 dark:bg-orange-900/20">
          <div className="flex items-center gap-3">
            <FaTimesCircle className="text-2xl text-orange-600 dark:text-orange-400" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{pendingCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Payroll Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Employee Name</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Basic Salary</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Allowances</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Overtime</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Deductions</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Advance</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Gross Salary</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Net Salary</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payrollData.map((employee) => (
                <tr
                  key={employee._id}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {employee.employeeName}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {employee.employeeId} - {employee.designation}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-gray-100">
                    Rs. {employee.basicSalary.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-gray-100">
                    Rs. {employee.allowances.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-green-600 dark:text-green-400">
                    Rs. {employee.overtime.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-red-600 dark:text-red-400">
                    Rs. {employee.deductions.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-orange-600 dark:text-orange-400">
                    Rs. {employee.advanceDeduction.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900 dark:text-white">
                    Rs. {employee.grossSalary.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-bold text-primary">
                    Rs. {employee.netSalary.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant={employee.status === 'Paid' ? 'success' : 'warning'}>
                      {employee.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleViewSalarySlip(employee)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                        title="View Salary Slip"
                      >
                        <FaFileInvoice />
                      </button>
                      {employee.status === 'Pending' && (
                        <button
                          onClick={() => handlePayIndividual(employee)}
                          className="text-green-600 hover:text-green-800 dark:text-green-400"
                          title="Mark as Paid"
                        >
                          <FaCheckCircle />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-300 dark:border-gray-600">
                <td className="py-4 px-4 text-sm text-gray-900 dark:text-white">TOTALS</td>
                <td className="py-4 px-4 text-sm text-right text-gray-900 dark:text-white">
                  Rs. {totals.basicSalary.toLocaleString()}
                </td>
                <td className="py-4 px-4 text-sm text-right text-gray-900 dark:text-white">
                  Rs. {totals.allowances.toLocaleString()}
                </td>
                <td className="py-4 px-4 text-sm text-right text-green-600 dark:text-green-400">
                  Rs. {totals.overtime.toLocaleString()}
                </td>
                <td className="py-4 px-4 text-sm text-right text-red-600 dark:text-red-400">
                  Rs. {totals.deductions.toLocaleString()}
                </td>
                <td className="py-4 px-4 text-sm text-right text-orange-600 dark:text-orange-400">
                  Rs. {totals.advanceDeduction.toLocaleString()}
                </td>
                <td className="py-4 px-4 text-sm text-right text-gray-900 dark:text-white">
                  Rs. {totals.grossSalary.toLocaleString()}
                </td>
                <td className="py-4 px-4 text-sm text-right text-primary">
                  Rs. {totals.netSalary.toLocaleString()}
                </td>
                <td colSpan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Salary Slip Modal */}
      {selectedEmployee && (
        <Modal
          isOpen={showSalarySlip}
          onClose={() => setShowSalarySlip(false)}
          title="Salary Slip"
          size="large"
        >
          <div className="space-y-6 print:p-8">
            {/* Company Header */}
            <div className="text-center border-b-2 border-gray-300 dark:border-gray-600 pb-4">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mian & Sons Hardware Store</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Main Market, Rawalpindi, Pakistan
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Phone: +92-300-1234567 | Email: info@miansons.com
              </p>
              <h2 className="text-xl font-semibold text-primary mt-3">SALARY SLIP</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Month: {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Employee Details */}
            <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Employee ID</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedEmployee.employeeId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Employee Name</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedEmployee.employeeName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Designation</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedEmployee.designation}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Department</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedEmployee.department}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Working Days</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedEmployee.workingDays}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Present Days</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedEmployee.presentDays}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Earnings Table */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 border-b border-gray-300 dark:border-gray-600 pb-2">
                  Earnings
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Basic Salary</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      Rs. {selectedEmployee.basicSalary.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">HRA (House Rent)</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      Rs. {(selectedEmployee.allowances * 0.5).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Transport Allowance</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      Rs. {(selectedEmployee.allowances * 0.3).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Other Allowances</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      Rs. {(selectedEmployee.allowances * 0.2).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Overtime Pay</span>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      Rs. {selectedEmployee.overtime.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-300 dark:border-gray-600">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Gross Salary</span>
                    <span className="text-sm font-bold text-primary">
                      Rs. {selectedEmployee.grossSalary.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Deductions Table */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 border-b border-gray-300 dark:border-gray-600 pb-2">
                  Deductions
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Income Tax</span>
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                      Rs. {(selectedEmployee.deductions * 0.5).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Provident Fund</span>
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                      Rs. {(selectedEmployee.deductions * 0.3).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Other Deductions</span>
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                      Rs. {(selectedEmployee.deductions * 0.2).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Advance Deduction</span>
                    <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                      Rs. {selectedEmployee.advanceDeduction.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Absence Fine</span>
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                      Rs. {Number(selectedEmployee.absenceFine || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-300 dark:border-gray-600">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Total Deductions</span>
                    <span className="text-sm font-bold text-red-600 dark:text-red-400">
                      Rs. {(selectedEmployee.deductions + selectedEmployee.advanceDeduction + Number(selectedEmployee.absenceFine || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Salary */}
            <div className="bg-primary text-white p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm opacity-90">Net Salary Payable</p>
                  <p className="text-3xl font-bold">
                    Rs. {selectedEmployee.netSalary.toLocaleString()}
                  </p>
                </div>
                {selectedEmployee.status === 'Paid' && (
                  <div className="text-right">
                    <Badge variant="success" className="mb-1">PAID</Badge>
                    <p className="text-xs opacity-90">
                      Paid on: {new Date(selectedEmployee.paidDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-600 dark:text-gray-400 border-t border-gray-300 dark:border-gray-600 pt-4">
              <p>This is a computer-generated salary slip and does not require a signature.</p>
              <p className="mt-1">For queries, contact HR Department: hr@miansons.com</p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 print:hidden">
              <Button variant="secondary" onClick={() => setShowSalarySlip(false)}>
                Close
              </Button>
              <Button onClick={handlePrintSlip}>
                <FaPrint className="mr-2" /> Print Slip
              </Button>
            </div>
          </div>

          {/* Print Styles */}
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              .print\\:p-8, .print\\:p-8 * {
                visibility: visible;
              }
              .print\\:hidden {
                display: none !important;
              }
              @page {
                margin: 1cm;
              }
            }
          `}</style>
        </Modal>
      )}
    </div>
  );
};

export default Payroll;
