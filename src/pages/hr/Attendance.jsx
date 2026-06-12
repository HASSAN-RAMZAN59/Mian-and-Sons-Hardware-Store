import React, { useState, useEffect } from 'react';
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
import { FaFileExcel, FaFilePdf, FaSave, FaCalendarAlt, FaCheck, FaTimes, FaClock, FaChevronDown } from 'react-icons/fa';

const STATUS_TO_CODE = {
  Present: 'P',
  Absent: 'A',
  Late: 'L',
  'Half Day': 'HD',
  Holiday: 'H'
};

const Attendance = () => {
  const { checkPermission, user } = useAuth();
  const [activeTab, setActiveTab] = useState('mark');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState({});

  const normalizeEmployees = (rows = []) =>
    (Array.isArray(rows) ? rows : []).map((emp) => ({
      _id: emp._id,
      name: emp.fullName || emp.name || '',
      designation: emp.designation || '',
      basicSalary: Number(emp.basicSalary || emp.salary || 0)
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

  // Today's attendance state
  const [todayAttendance, setTodayAttendance] = useState([]);

  const fetchAttendanceData = async () => {
    if (!selectedBranchId) {
      setEmployees([]);
      setAttendanceRecords({});
      return;
    }
    try {
      const [employeeRows, attendanceRows] = await Promise.all([
        employeeService.getAll({ branchId: selectedBranchId }),
        attendanceService.getAll(selectedBranchId)
      ]);
      setEmployees(normalizeEmployees(employeeRows));
      setAttendanceRecords(normalizeAttendanceRecords(attendanceRows));
    } catch (error) {
      toast.error('Failed to load attendance data');
    }
  };

  const buildDailyAttendance = (date, staff, records) => {
    const daily = records[date] || {};
    const selectedStaff = selectedEmployeeId
      ? staff.filter((emp) => emp._id === selectedEmployeeId)
      : staff;

    return selectedStaff.map((emp) => {
      const record = daily[emp._id] || {};
      return {
        employeeId: emp._id,
        employeeName: emp.name,
        designation: emp.designation,
        status: record.status || 'Present',
        timeIn: record.timeIn || '09:00',
        timeOut: record.timeOut || '18:00',
        notes: record.notes || ''
      };
    });
  };

  const buildMonthAttendance = () => {
    const year = parseInt(selectedMonth.split('-')[0]);
    const month = parseInt(selectedMonth.split('-')[1]);
    const daysInMonth = new Date(year, month, 0).getDate();
    const attendance = {};

    employees.forEach((emp) => {
      attendance[emp._id] = {};
      for (let day = 1; day <= daysInMonth; day += 1) {
        const dateKey = `${selectedMonth}-${String(day).padStart(2, '0')}`;
        const daily = attendanceRecords[dateKey] || {};
        const record = daily[emp._id];

        if (record?.status) {
          attendance[emp._id][day] = STATUS_TO_CODE[record.status] || 'P';
        } else {
          attendance[emp._id][day] = '';
        }
      }
    });

    return attendance;
  };

  const monthAttendance = buildMonthAttendance();

  // Calculate monthly stats
  const calculateMonthlyStats = (employeeId) => {
    const year = parseInt(selectedMonth.split('-')[0]);
    const month = parseInt(selectedMonth.split('-')[1]);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    let present = 0, absent = 0, late = 0, halfDay = 0, holidays = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const status = monthAttendance[employeeId][day];
      if (status === 'P') present++;
      else if (status === 'A') absent++;
      else if (status === 'L') late++;
      else if (status === 'HD') halfDay++;
      else if (status === 'H') holidays++;
    }
    
    const workingDays = present + absent + late + halfDay;
    
    return { workingDays, present, absent, late, halfDay, holidays };
  };

  const handleAttendanceChange = (index, field, value) => {
    const updated = [...todayAttendance];
    updated[index][field] = value;
    setTodayAttendance(updated);
  };

  const handleSaveAttendance = async () => {
    if (!checkPermission('hr', 'create')) {
      toast.error('You do not have permission to mark attendance');
      return;
    }
    if (!todayAttendance.length) {
      toast.error('No attendance row available to save');
      return;
    }
    try {
      for (const att of todayAttendance) {
        const payload = {
          employeeId: att.employeeId,
          branchId: selectedBranchId || undefined,
          date: selectedDate,
          status: att.status,
          timeIn: att.timeIn,
          timeOut: att.timeOut,
          notes: att.notes
        };
        console.log('[Attendance] create payload', payload);
        const created = await attendanceService.create(payload);
        console.log('[Attendance] create response', created);
      }
      toast.success(`Attendance for ${new Date(selectedDate).toLocaleDateString()} saved successfully!`);
      await fetchAttendanceData();
    } catch (error) {
      toast.error('Failed to save attendance');
    }
  };

  const handleExportPDF = () => {
    if (!checkPermission('hr', 'export')) {
      toast.error('You do not have permission to export');
      return;
    }
    toast.info('Preparing PDF preview...');
    window.print();
  };

  const handleExportExcel = () => {
    if (!checkPermission('hr', 'export')) {
      toast.error('You do not have permission to export');
      return;
    }
    if (!todayAttendance.length) {
      toast.error('No attendance data to export');
      return;
    }

    const headers = ['Employee ID', 'Name', 'Designation', 'Status', 'Time In', 'Time Out', 'Notes', 'Date'];
    const rows = todayAttendance.map((att) => [
      att.employeeId,
      att.employeeName,
      att.designation,
      att.status,
      att.timeIn,
      att.timeOut,
      att.notes || '',
      selectedDate
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${selectedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Attendance exported successfully!');
  };

  const getStatusBadge = (status) => {
    const variants = {
      '': 'secondary',
      'P': 'success',
      'A': 'danger',
      'L': 'warning',
      'HD': 'info',
      'H': 'secondary',
      'Present': 'success',
      'Absent': 'danger',
      'Late': 'warning',
      'Half Day': 'info',
      'Holiday': 'secondary',
    };
    return variants[status] || 'default';
  };

  const getDaysInMonth = () => {
    const year = parseInt(selectedMonth.split('-')[0]);
    const month = parseInt(selectedMonth.split('-')[1]);
    return new Date(year, month, 0).getDate();
  };

  const getAbsenceFine = (employee) => {
    const stats = calculateMonthlyStats(employee._id);
    if (stats.absent > 3) {
      return Math.round(Number(employee.basicSalary || 0) * 0.05);
    }
    return 0;
  };

  useEffect(() => {
    const load = async () => {
      try {
        const b = await branchService.getAll();
        setBranches(b || []);
      } catch (err) {
        // ignore branch load error
      }
    };
    load();
  }, []);

  useEffect(() => {
    // refetch when branch filter changes
    setSelectedEmployeeId('');
    fetchAttendanceData();
  }, [selectedBranchId]);

  useEffect(() => {
    if (!employees.length) {
      setTodayAttendance([]);
      return;
    }
    setTodayAttendance(buildDailyAttendance(selectedDate, employees, attendanceRecords));
  }, [selectedDate, employees, attendanceRecords, selectedEmployeeId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Attendance Management</h1>
        <div className="flex gap-2">
          <Button onClick={handleExportExcel} variant="secondary">
            <FaFileExcel className="mr-2" /> Export Excel
          </Button>
          <Button onClick={handleExportPDF} variant="secondary">
            <FaFilePdf className="mr-2" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Card>
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('mark')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'mark'
                ? 'text-yellow-400 dark:text-yellow-300 border-b-2 border-yellow-400 dark:border-yellow-300'
                : 'text-gray-600 dark:text-gray-400 hover:text-yellow-400 dark:hover:text-yellow-300'
            }`}
          >
            Mark Attendance
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'report'
                ? 'text-yellow-400 dark:text-yellow-300 border-b-2 border-yellow-400 dark:border-yellow-300'
                : 'text-gray-600 dark:text-gray-400 hover:text-yellow-400 dark:hover:text-yellow-300'
            }`}
          >
            Attendance Report
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'summary'
                ? 'text-yellow-400 dark:text-yellow-300 border-b-2 border-yellow-400 dark:border-yellow-300'
                : 'text-gray-600 dark:text-gray-400 hover:text-yellow-400 dark:hover:text-yellow-300'
            }`}
          >
            Summary
          </button>
        </div>
      </Card>

      {/* Tab 1: Mark Attendance */}
      {activeTab === 'mark' && (
        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Input
                  label="Select Date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Branch</label>
                <Select value={selectedBranchId} onChange={(e) => { setSelectedBranchId(e.target.value); }}>
                  <option value="">Select Branch</option>
                  {branches.map(b => (
                    <option key={b._id || b.id} value={b._id || b.id}>{b.name}</option>
                  ))}
                </Select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Employee
                </label>
                <Select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                >
                  <option value="">Choose employee</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleSaveAttendance}>
                  <FaSave className="mr-2" /> Save All Attendance
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Employee ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Designation</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Time In</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Time Out</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {todayAttendance.map((att, index) => (
                    <tr
                      key={att.employeeId}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td className="py-3 px-4 text-sm font-medium text-yellow-400 dark:text-yellow-300">
                        {att.employeeId}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                        {att.employeeName}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {att.designation}
                      </td>
                      <td className="py-3 px-4">
                        <div className="relative inline-block w-full">
                          <select
                            value={att.status}
                            onChange={(e) => handleAttendanceChange(index, 'status', e.target.value)}
                            className="w-full min-w-[140px] px-3 pr-10 py-1.5 text-sm text-left border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-400 dark:focus:ring-yellow-300 appearance-none"
                          >
                            <option value="Present">Present</option>
                            <option value="Absent">Absent</option>
                            <option value="Late">Late</option>
                            <option value="Half Day">Half Day</option>
                            <option value="Holiday">Holiday</option>
                          </select>
                          <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                          <input
                            type="time"
                            value={att.timeIn}
                            onChange={(e) => handleAttendanceChange(index, 'timeIn', e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-400 dark:focus:ring-yellow-300"
                            disabled={att.status === 'Absent' || att.status === 'Holiday'}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="time"
                          value={att.timeOut}
                          onChange={(e) => handleAttendanceChange(index, 'timeOut', e.target.value)}
                          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-400 dark:focus:ring-yellow-300"
                          disabled={att.status === 'Absent' || att.status === 'Holiday'}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <textarea
                          value={att.notes}
                          onChange={(e) => handleAttendanceChange(index, 'notes', e.target.value)}
                          placeholder="Add notes... (up to ~30 words)"
                          rows={2}
                          maxLength={400}
                          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-400 dark:focus:ring-yellow-300 w-full resize-y min-w-[180px]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Attendance Report */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Input
                  label="Select Month"
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="success">P</Badge>
                  <span className="text-gray-600 dark:text-gray-400">Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="danger">A</Badge>
                  <span className="text-gray-600 dark:text-gray-400">Absent</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="warning">L</Badge>
                  <span className="text-gray-600 dark:text-gray-400">Late</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="info">HD</Badge>
                  <span className="text-gray-600 dark:text-gray-400">Half Day</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">H</Badge>
                  <span className="text-gray-600 dark:text-gray-400">Holiday</span>
                </div>
              </div>
            </div>
          </Card>

          {employees.map((emp) => {
            const stats = calculateMonthlyStats(emp._id);
            return (
              <Card key={emp._id}>
                <div className="mb-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{emp.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{emp.designation} - {emp._id}</p>
                  </div>
                  <div className="flex gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-gray-600 dark:text-gray-400">Working Days</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.workingDays}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600 dark:text-gray-400">Present</p>
                      <p className="text-lg font-bold text-green-600">{stats.present}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600 dark:text-gray-400">Absent</p>
                      <p className="text-lg font-bold text-red-600">{stats.absent}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600 dark:text-gray-400">Late</p>
                      <p className="text-lg font-bold text-orange-600">{stats.late}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600 dark:text-gray-400">Half Days</p>
                      <p className="text-lg font-bold text-blue-600">{stats.halfDay}</p>
                    </div>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: getDaysInMonth() }, (_, i) => i + 1).map((day) => {
                    const status = monthAttendance[emp._id][day];
                    return (
                      <div
                        key={day}
                        className="aspect-square border border-gray-200 dark:border-gray-700 rounded-lg p-2 flex flex-col items-center justify-center hover:shadow-md transition-shadow"
                      >
                        <span className="text-xs text-gray-600 dark:text-gray-400 mb-1">{day}</span>
                        <Badge variant={getStatusBadge(status)} className="text-xs">
                          {status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tab 3: Summary Table */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-4 mb-4">
              <FaCalendarAlt className="text-2xl text-primary" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Monthly Attendance Summary
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="ml-auto">
                <Input
                  label="Select Month"
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>
            </div>
          </Card>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Employee ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Designation</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Working Days</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Present</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Absent</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Late</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Half Days</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Fine (Rs.)</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Attendance %</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => {
                    const stats = calculateMonthlyStats(emp._id);
                    const attendancePercentage =
                      stats.workingDays > 0 ? ((stats.present / stats.workingDays) * 100).toFixed(1) : '0.0';
                    const fineAmount = getAbsenceFine(emp);
                    return (
                      <tr
                        key={emp._id}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                          {emp._id}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                          {emp.name}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {emp.designation}
                        </td>
                        <td className="py-3 px-4 text-sm text-center font-semibold text-gray-900 dark:text-white">
                          {stats.workingDays}
                        </td>
                        <td className="py-3 px-4 text-sm text-center">
                          <Badge variant="success">{stats.present}</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-center">
                          <Badge variant="danger">{stats.absent}</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-center">
                          <Badge variant="warning">{stats.late}</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-center">
                          <Badge variant="info">{stats.halfDay}</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-center font-semibold text-red-600">
                          {fineAmount > 0 ? `Rs. ${fineAmount.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  attendancePercentage >= 90 ? 'bg-green-600' :
                                  attendancePercentage >= 75 ? 'bg-yellow-600' : 'bg-red-600'
                                }`}
                                style={{ width: `${attendancePercentage}%` }}
                              ></div>
                            </div>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {attendancePercentage}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Summary Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                  <FaCheck className="text-2xl text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg. Attendance</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {employees.length > 0
                      ? (employees.reduce((sum, emp) => {
                          const stats = calculateMonthlyStats(emp._id);
                          const pct = stats.workingDays > 0 ? (stats.present / stats.workingDays) * 100 : 0;
                          return sum + pct;
                        }, 0) / employees.length).toFixed(1)
                      : '0.0'}%
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <FaCalendarAlt className="text-2xl text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Employees</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {employees.length}
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
                  <FaTimes className="text-2xl text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Absences</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {employees.reduce((sum, emp) => sum + calculateMonthlyStats(emp._id).absent, 0)}
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full">
                  <FaClock className="text-2xl text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Late</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {employees.reduce((sum, emp) => sum + calculateMonthlyStats(emp._id).late, 0)}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
