import React, { useEffect, useState } from 'react';
import { FaFileExport, FaTrash, FaFilter, FaExclamationTriangle } from 'react-icons/fa';
import { Navigate } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { auditService } from '../../services/auditService';

const AuditLog = () => {
  const { user: currentUser } = useAuth();
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter States
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    user: 'All',
    actionType: 'All',
    module: 'All',
  });

  useEffect(() => {
    const fetchAuditLogs = async () => {
      setLoading(true);
      try {
        const logs = await auditService.getAll();
        setAuditLogs(logs);
      } catch (error) {
        toast.error('Failed to fetch audit logs from server.');
      } finally {
        setLoading(false);
      }
    };
    fetchAuditLogs();
  }, []);

  // Check if user has access (superadmin only)
  if (currentUser?.role !== 'superadmin') {
    toast.error('Access denied. This page is only accessible to superadmins.');
    return <Navigate to="/dashboard" replace />;
  }

  // Get action badge variant
  const getActionBadgeVariant = (action) => {
    switch (action) {
      case 'Created':
        return 'success';
      case 'Updated':
        return 'primary';
      case 'Deleted':
        return 'danger';
      case 'Viewed':
        return 'secondary';
      case 'Login':
        return 'purple';
      case 'Logout':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  // Get role badge variant
  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'superadmin':
        return 'purple';
      case 'admin':
        return 'primary';
      case 'manager':
        return 'success';
      case 'cashier':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Filter logs
  const filteredLogs = auditLogs.filter((log) => {
    // Date range filter
    if (filters.startDate) {
      const logDate = new Date(log.timestamp).toISOString().split('T')[0];
      if (logDate < filters.startDate) return false;
    }
    if (filters.endDate) {
      const logDate = new Date(log.timestamp).toISOString().split('T')[0];
      if (logDate > filters.endDate) return false;
    }

    // User filter
    if (filters.user !== 'All' && log.userName !== filters.user) return false;

    // Action type filter
    if (filters.actionType !== 'All' && log.action !== filters.actionType) return false;

    // Module filter
    if (filters.module !== 'All' && log.module !== filters.module) return false;

    return true;
  });

  // Get unique users for filter dropdown
  const uniqueUsers = ['All', ...new Set(auditLogs.map((log) => log.userName || 'N/A'))];

  // Get unique modules for filter dropdown
  const uniqueModules = ['All', ...new Set(auditLogs.map((log) => log.module || 'N/A'))];

  // Handle Export to Excel
  const handleExportExcel = () => {
    const headers = [
      'Log ID',
      'Timestamp',
      'User',
      'Role',
      'Action',
      'Module',
      'Description',
      'IP Address',
      'Device',
      'Suspicious',
    ];
    const rows = filteredLogs.map((log) => [
      log.id,
      formatTimestamp(log.timestamp),
      log.userName,
      log.userRole,
      log.action,
      log.module,
      log.description,
      log.ipAddress,
      log.device,
      log.isSuspicious ? 'Yes' : 'No',
    ]);

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += headers.join(',') + '\n';
    rows.forEach((row) => {
      csvContent += row.map((cell) => `"${cell}"`).join(',') + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit_log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Audit log exported successfully!');
  };

  // Clear all logs
  const handleClearOldLogs = async () => {
    if (window.confirm("Are you sure you want to clear all audit logs? This action cannot be undone.")) {
      try {
        setLoading(true);
        await auditService.clearAll();
        setAuditLogs([]);
        toast.success('All audit logs cleared successfully!');
      } catch (error) {
        toast.error('Failed to clear audit logs.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      user: 'All',
      actionType: 'All',
      module: 'All',
    });
    toast.info('Filters reset');
  };

  // Calculate statistics
  const totalLogs = auditLogs.length;
  const suspiciousLogs = auditLogs.filter((log) => log.isSuspicious).length;
  const todayLogs = auditLogs.filter((log) => {
    const logDate = new Date(log.timestamp).toDateString();
    const today = new Date().toDateString();
    return logDate === today;
  }).length;
  const failedLogins = auditLogs.filter(
    (log) => log.action === 'Login' && log.description.includes('Failed')
  ).length;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Audit Log</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            System activity tracking and monitoring
          </p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={handleClearOldLogs} variant="danger">
            <FaTrash className="mr-2" />
            Clear Old Logs
          </Button>
          <Button onClick={handleExportExcel}>
            <FaFileExport className="mr-2" />
            Export to Excel
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Logs</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{totalLogs}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">Today's Activity</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{todayLogs}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">Suspicious Activity</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
              {suspiciousLogs}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">Failed Logins</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
              {failedLogins}
            </p>
          </div>
        </Card>
      </div>

      {/* Filters Section */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center">
            <FaFilter className="mr-2" />
            Filters
          </h2>
          <Button variant="secondary" size="sm" onClick={handleResetFilters}>
            Reset Filters
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Input
            type="date"
            label="Start Date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          />
          <Input
            type="date"
            label="End Date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          />
          <Select
            label="User"
            value={filters.user}
            onChange={(e) => setFilters({ ...filters, user: e.target.value })}
            options={uniqueUsers.map((user) => ({ value: user, label: user }))}
          />
          <Select
            label="Action Type"
            value={filters.actionType}
            onChange={(e) => setFilters({ ...filters, actionType: e.target.value })}
            options={[
              { value: 'All', label: 'All Actions' },
              { value: 'Created', label: 'Created' },
              { value: 'Updated', label: 'Updated' },
              { value: 'Deleted', label: 'Deleted' },
              { value: 'Viewed', label: 'Viewed' },
              { value: 'Login', label: 'Login' },
              { value: 'Logout', label: 'Logout' },
            ]}
          />
          <Select
            label="Module"
            value={filters.module}
            onChange={(e) => setFilters({ ...filters, module: e.target.value })}
            options={uniqueModules.map((module) => ({ value: module, label: module }))}
          />
        </div>
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredLogs.length} of {totalLogs} log entries
        </div>
      </Card>

      {/* Audit Log Table */}
      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading audit logs...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Log ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Module
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Device/Browser
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <tr
                      key={log.id || log._id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        log.isSuspicious ? 'bg-red-50 dark:bg-red-900/20' : ''
                      }`}
                    >
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {log.isSuspicious && (
                          <FaExclamationTriangle className="inline-block mr-2 text-red-600" />
                        )}
                        {log.id || log._id}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        <div>{formatTimestamp(log.timestamp).split(', ')[0]}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTimestamp(log.timestamp).split(', ')[1]}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {log.userName}
                        </div>
                        {log.userRole && log.userRole !== 'N/A' && (
                          <Badge variant={getRoleBadgeVariant(log.userRole)} size="sm">
                            {log.userRole}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Badge variant={getActionBadgeVariant(log.action)}>{log.action}</Badge>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {log.module}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {log.description}
                        {log.isSuspicious && (
                          <div className="text-xs text-red-600 dark:text-red-400 mt-1 font-semibold">
                            Suspicious Activity
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {log.ipAddress}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {log.device}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      No audit logs found matching the selected filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Info */}
        {filteredLogs.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Displaying <span className="font-semibold">{filteredLogs.length}</span> log entries
              </div>
              {suspiciousLogs > 0 && (
                <div className="text-sm text-red-600 dark:text-red-400 font-semibold">
                  <FaExclamationTriangle className="inline-block mr-1" />
                  {suspiciousLogs} suspicious activities detected
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AuditLog;
