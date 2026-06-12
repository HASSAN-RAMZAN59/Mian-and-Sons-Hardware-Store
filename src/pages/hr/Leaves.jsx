
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Badge from '../../components/common/Badge';
import { FaCalendarAlt, FaClock, FaCheckCircle, FaTimesCircle, FaPlus, FaChartBar } from 'react-icons/fa';
import { leaveService } from '../../services/leaveService';
import { employeeService } from '../../services/employeeService';
import { branchService } from '../../services/branchService';
import { logAudit } from '../../utils/audit';

const Leaves = () => {
    // Leave Types
    const leaveTypes = [
      { value: 'annual', label: 'Annual Leave' },
      { value: 'sick', label: 'Sick Leave' },
      { value: 'casual', label: 'Casual Leave' },
    ];

    // Calculate days between two dates (inclusive)
    function calculateDays(from, to) {
      if (!from || !to) return 0;
      const fromDate = new Date(from);
      const toDate = new Date(to);
      return Math.max(1, Math.floor((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1);
    }

    // Approve leave request
    const handleApprove = async (request) => {
      if (!checkPermission('hr', 'update')) {
        toast.error('You do not have permission to approve leaves');
        return;
      }
      try {
        const payload = { ...request, status: 'Approved', approvedBy: user?.name || 'Admin' };
        console.log('[Leaves] approve payload', payload);
        const updated = await leaveService.update(request._id, payload);
        console.log('[Leaves] approve response', updated);
        const normalizedUpdated = normalizeLeaves([updated])[0] || updated;
        setLeaveRequests((prev) => prev.map((r) => r._id === request._id ? normalizedUpdated : r));
        toast.success('Leave approved');
        logAudit({ user, action: 'Approved', module: 'Leaves', description: `Approved leave for ${request.employee?.fullName || request.employee?.name || request.employeeName}` });
      } catch (error) {
        toast.error('Failed to approve leave');
      }
    };

    // Reject leave request
    const handleReject = async (request) => {
      if (!checkPermission('hr', 'update')) {
        toast.error('You do not have permission to reject leaves');
        return;
      }
      try {
        const payload = { ...request, status: 'Rejected', rejectedBy: user?.name || 'Admin' };
        console.log('[Leaves] reject payload', payload);
        const updated = await leaveService.update(request._id, payload);
        console.log('[Leaves] reject response', updated);
        const normalizedUpdated = normalizeLeaves([updated])[0] || updated;
        setLeaveRequests((prev) => prev.map((r) => r._id === request._id ? normalizedUpdated : r));
        toast.success('Leave rejected');
        logAudit({ user, action: 'Rejected', module: 'Leaves', description: `Rejected leave for ${request.employee?.fullName || request.employee?.name || request.employeeName}` });
      } catch (error) {
        toast.error('Failed to reject leave');
      }
    };

    // Apply for leave
    const handleApplyLeave = async (e) => {
      e.preventDefault();
      if (!checkPermission('hr', 'create')) {
        toast.error('You do not have permission to apply for leave');
        return;
      }
      const days = calculateDays(leaveForm.fromDate, leaveForm.toDate);
      const newRequest = {
        ...leaveForm,
        employeeId: leaveForm.employeeId,
        branchId: selectedBranchId || undefined,
        days,
        status: 'Pending',
        appliedOn: new Date().toISOString(),
      };
      try {
        console.log('[Leaves] create payload', newRequest);
        const created = await leaveService.create(newRequest);
        console.log('[Leaves] create response', created);
        const normalizedCreated = normalizeLeaves([created])[0] || created;
        setLeaveRequests((prev) => [...prev, normalizedCreated]);
        toast.success('Leave application submitted');
        setLeaveForm({ employeeId: '', leaveType: '', fromDate: '', toDate: '', reason: '' });
        logAudit({ user, action: 'Created', module: 'Leaves', description: `Applied for leave: ${days} days` });
      } catch (error) {
        toast.error('Failed to apply for leave');
      }
    };
  const { user, checkPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('requests');
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState('');

  // Leave Requests Data
  const [leaveRequests, setLeaveRequests] = useState([]);

  const normalizeEmployees = (rows = []) =>
    (Array.isArray(rows) ? rows : []).map((emp) => ({
      _id: emp._id,
      name: emp.fullName || emp.name || ''
    }));

  const normalizeLeaves = (rows = []) =>
    (Array.isArray(rows) ? rows : []).map((req) => ({
      ...req,
      _id: req._id,
      employeeId: req.employeeId?._id || req.employeeId,
      employee: req.employeeId && typeof req.employeeId === 'object' ? req.employeeId : null,
      employeeName: req.employeeId?.fullName || req.employeeId?.name || req.employeeName || '',
      leaveType: req.leaveType || '',
      fromDate: req.fromDate || '',
      toDate: req.toDate || '',
      reason: req.reason || '',
      days: req.days || calculateDays(req.fromDate, req.toDate),
      status: req.status || 'Pending',
      appliedOn: req.appliedOn || new Date().toISOString()
    }));

  // Load leave requests from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const employeeRows = await employeeService.getAll(selectedBranchId ? { branchId: selectedBranchId } : undefined);
        const leaveRows = selectedEmployeeFilter
          ? await leaveService.getByEmployee(selectedEmployeeFilter, selectedBranchId)
          : await leaveService.getAll(selectedBranchId);
        setEmployees(normalizeEmployees(employeeRows));
        setLeaveRequests(normalizeLeaves(leaveRows));
      } catch (error) {
        toast.error('Failed to load leave requests');
      }
    };
    fetchData();
  }, [selectedEmployeeFilter, selectedBranchId]);
  
  // Load branches from backend
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

  const leaveBalances = useMemo(() => {
    return employees.map((emp) => {
      const approvedLeaves = leaveRequests.filter(
        (req) => req.employeeId === emp._id && req.status === 'Approved'
      );
      const annualUsed = approvedLeaves
        .filter((req) => req.leaveType === 'annual')
        .reduce((sum, req) => sum + Number(req.days || 0), 0);
      const sickUsed = approvedLeaves
        .filter((req) => req.leaveType === 'sick')
        .reduce((sum, req) => sum + Number(req.days || 0), 0);
      const casualUsed = approvedLeaves
        .filter((req) => req.leaveType === 'casual')
        .reduce((sum, req) => sum + Number(req.days || 0), 0);
      const annualLeave = 14;
      const sickLeave = 10;
      const casualLeave = 7;
      const used = annualUsed + sickUsed + casualUsed;
      const remaining = Math.max(0, annualLeave + sickLeave + casualLeave - used);

      return {
        employeeId: emp._id,
        employeeName: emp.name,
        annualLeave,
        sickLeave,
        casualLeave,
        used,
        remaining,
      };
    });
  }, [employees, leaveRequests]);

  // Apply Leave Form State
  const [leaveForm, setLeaveForm] = useState({
    employeeId: '',
    leaveType: '',
    fromDate: '',
    toDate: '',
    reason: '',
  });

  // Submit leave request to backend


  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return <Badge variant="success">Approved</Badge>;
      case 'Rejected':
        return <Badge variant="danger">Rejected</Badge>;
      case 'Pending':
        return <Badge variant="warning">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Calculate summary stats
  const totalRequests = leaveRequests.length;
  const pendingRequests = leaveRequests.filter((req) => req.status === 'Pending').length;
  const approvedRequests = leaveRequests.filter((req) => req.status === 'Approved').length;
  const rejectedRequests = leaveRequests.filter((req) => req.status === 'Rejected').length;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Leave Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage employee leaves and balances</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Requests</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{totalRequests}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <FaCalendarAlt className="text-2xl text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{pendingRequests}</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <FaClock className="text-2xl text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Approved</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{approvedRequests}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <FaCheckCircle className="text-2xl text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Rejected</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{rejectedRequests}</p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
              <FaTimesCircle className="text-2xl text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('requests')}
              className={`${
                activeTab === 'requests'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <FaCalendarAlt className="mr-2" />
              Leave Requests
            </button>
            <button
              onClick={() => setActiveTab('balance')}
              className={`${
                activeTab === 'balance'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <FaChartBar className="mr-2" />
              Leave Balance
            </button>
            <button
              onClick={() => setActiveTab('apply')}
              className={`${
                activeTab === 'apply'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <FaPlus className="mr-2" />
              Apply Leave
            </button>
          </nav>
        </div>
      </div>

      <Card className="mb-6">
        <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Branch</label>
                  <Select value={selectedBranchId} onChange={(e) => setSelectedBranchId(e.target.value)}>
                    <option value="">All Branches</option>
                    {branches.map(b => (
                      <option key={b._id || b.id} value={b._id || b.id}>{b.name}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Employee</label>
                  <Select
                    value={selectedEmployeeFilter}
                    onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
                  >
                    <option value="">All Employees</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>{emp.name}</option>
                    ))}
                  </Select>
                </div>
              </div>
        </div>
      </Card>

      {/* Tab 1 - Leave Requests */}
      {activeTab === 'requests' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Leave Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    From Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    To Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Days
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Applied On
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {leaveRequests.map((request) => (
                  <tr key={request._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {request.employee?.fullName || request.employee?.name || request.employeeName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{request._id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {request.leaveType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date(request.fromDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date(request.toDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {request.days}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                      {request.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(request.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(request.appliedOn).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {request.status === 'Pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApprove(request)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            title="Approve"
                          >
                            <FaCheckCircle className="text-lg" />
                          </button>
                          <button
                            onClick={() => handleReject(request)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Reject"
                          >
                            <FaTimesCircle className="text-lg" />
                          </button>
                        </div>
                      )}
                      {request.status === 'Approved' && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          by {request.approvedBy}
                        </span>
                      )}
                      {request.status === 'Rejected' && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          by {request.rejectedBy}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 2 - Leave Balance */}
      {activeTab === 'balance' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Annual Leave
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Sick Leave
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Casual Leave
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Remaining
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {leaveBalances.map((balance) => (
                  <tr key={balance.employeeId} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {balance.employeeName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {balance.annualLeave} days
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {balance.sickLeave} days
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {balance.casualLeave} days
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        {balance.used} days
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        {balance.remaining} days
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3 - Apply Leave */}
      {activeTab === 'apply' && (
        <Card>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Apply for Leave</h2>
          <form onSubmit={handleApplyLeave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Employee Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Employee <span className="text-red-500">*</span>
                </label>
                <Select
                  value={leaveForm.employeeId}
                  onChange={(e) => setLeaveForm({ ...leaveForm, employeeId: e.target.value })}
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Leave Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Leave Type <span className="text-red-500">*</span>
                </label>
                <Select
                  value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                  required
                >
                  <option value="">Select Leave Type</option>
                  {leaveTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </div>

              {/* From Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  From Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={leaveForm.fromDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, fromDate: e.target.value })}
                  required
                />
              </div>

              {/* To Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  To Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={leaveForm.toDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, toDate: e.target.value })}
                  required
                  min={leaveForm.fromDate}
                />
              </div>
            </div>

            {/* Days Calculation Display */}
            {leaveForm.fromDate && leaveForm.toDate && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Total Days:</strong> {calculateDays(leaveForm.fromDate, leaveForm.toDate)} day(s)
                </p>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Enter reason for leave..."
                required
              ></textarea>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button type="submit" className="flex items-center">
                <FaPlus className="mr-2" />
                Submit Leave Application
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
export default Leaves;
