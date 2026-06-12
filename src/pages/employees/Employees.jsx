
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { employeeService } from '../../services/employeeService';
import { branchService } from '../../services/branchService';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import TextArea from '../../components/common/TextArea';
import { FaPlus, FaSearch, FaEye, FaEdit, FaFileInvoice, FaTrash } from 'react-icons/fa';
import { showPremiumConfirm } from '../../utils/premiumDialogs';

const Employees = () => {
  const { user, checkPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showSalarySlipModal, setShowSalarySlipModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [salarySlip, setSalarySlip] = useState(null);
  const [salarySlipMonth, setSalarySlipMonth] = useState(() => new Date().getMonth() + 1);
  const [salarySlipYear, setSalarySlipYear] = useState(() => new Date().getFullYear());
  const [isSlipLoading, setIsSlipLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    fatherName: '',
    cnic: '',
    dateOfBirth: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    designation: '',
    department: '',
    basicSalary: '',
    allowances: '',
    joinDate: '',
    branch: '',
    bankName: '',
    accountNumber: '',
    emergencyContact: '',
    emergencyPhone: '',
    status: 'Active',
  });

  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);

  const designations = ['Manager', 'Cashier', 'Sales Staff', 'Accountant', 'Guard', 'Cleaner'];
  const departments = ['Sales', 'Accounts', 'Inventory', 'Security', 'Maintenance', 'HR'];

  const monthOptions = useMemo(() => (
    Array.from({ length: 12 }, (_, index) => ({
      value: index + 1,
      label: new Date(2000, index, 1).toLocaleString('en-US', { month: 'long' })
    }))
  ), []);

  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, index) => ({
      value: now - index,
      label: String(now - index)
    }));
  }, []);


  // Load employees from backend
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await employeeService.getAll();
        setEmployees(data);
      } catch (error) {
        toast.error('Failed to load employees from backend');
      }
    };
    fetchEmployees();
  }, []);

  // Load branches for branch dropdowns
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const data = await branchService.getAll();
        setBranches(data || []);
      } catch (err) {
        toast.error('Failed to load branches');
      }
    };
    fetchBranches();
  }, []);

  // Check permission
  if (!checkPermission('employees', 'read') && user?.role !== 'admin' && user?.role !== 'superadmin') {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Only administrators can access employee management.
          </p>
        </Card>
      </div>
    );
  }

  // Filter employees
  const filteredEmployees = employees.filter((emp) => {
    const query = searchTerm.toLowerCase();
    const name = String(emp.fullName || '').toLowerCase();
    const id = String(emp._id || emp.id || '').toLowerCase();
    const designation = String(emp.designation || '').toLowerCase();
    const department = String(emp.department || '');
    const status = String(emp.status || '');

    const matchesSearch = name.includes(query) || id.includes(query) || designation.includes(query);
    const matchesDepartment = !filterDepartment || department === filterDepartment;
    const matchesStatus = !filterStatus || status === filterStatus;
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddEmployee = () => {
    if (!checkPermission('employees', 'create')) {
      toast.error('You do not have permission to add employees');
      return;
    }
    setFormData({
      fullName: '',
      fatherName: '',
      cnic: '',
      dateOfBirth: '',
      phone: '',
      whatsapp: '',
      email: '',
      address: '',
      designation: '',
      department: '',
      basicSalary: '',
      allowances: '',
      joinDate: '',
      branch: '',
      bankName: '',
      accountNumber: '',
      emergencyContact: '',
      emergencyPhone: '',
      status: 'Active',
    });
    setShowAddModal(true);
  };

  const handleEditEmployee = (employee) => {
    if (!checkPermission('employees', 'update')) {
      toast.error('You do not have permission to edit employees');
      return;
    }
    setSelectedEmployee(employee);
    setFormData({
      fullName: employee.fullName,
      fatherName: employee.fatherName,
      cnic: employee.cnic,
      dateOfBirth: employee.dateOfBirth,
      phone: employee.phone,
      whatsapp: employee.whatsapp,
      email: employee.email,
      address: employee.address,
      designation: employee.designation,
      department: employee.department,
      basicSalary: employee.basicSalary,
      allowances: employee.allowances,
      joinDate: employee.joinDate,
      branch: employee.branchId?._id || employee.branch || '',
      bankName: employee.bankName,
      accountNumber: employee.accountNumber,
      emergencyContact: employee.emergencyContact,
      emergencyPhone: employee.emergencyPhone,
      status: employee.status,
    });
    setShowEditModal(true);
  };

  const handleViewEmployee = (employee) => {
    setSelectedEmployee(employee);
    setShowViewModal(true);
  };


  const handleDeleteEmployee = async (id) => {
    if (!checkPermission('employees', 'delete')) {
      toast.error('You do not have permission to delete employees');
      return;
    }
    const confirmed = await showPremiumConfirm({
      title: 'Delete Employee',
      text: 'Are you sure you want to delete this employee?',
      confirmText: 'Delete Employee',
      cancelText: 'Cancel',
      icon: 'warning'
    });

    if (!confirmed) {
      return;
    }

    try {
      await employeeService.delete(id);
      setEmployees((prev) => prev.filter(emp => emp._id !== id && emp.id !== id));
      toast.success('Employee deleted successfully');
    } catch (error) {
      toast.error('Failed to delete employee');
    }
  };


  const handleSaveEmployee = async () => {
    const basicSalary = formData.basicSalary === '' ? undefined : Number(formData.basicSalary);
    const allowances = formData.allowances === '' ? undefined : Number(formData.allowances);
    const totalSalary = (basicSalary || 0) + (allowances || 0);
    const newEmployee = {
      ...formData,
      basicSalary,
      allowances,
      salary: totalSalary,
      branchId: formData.branch || undefined,
    };
    console.log('[Employees] create payload', newEmployee);
    try {
      const created = await employeeService.create(newEmployee);
      console.log('[Employees] create response (data)', created);
      setEmployees((prev) => [...prev, created]);
      setShowAddModal(false);
      toast.success('Employee added successfully');
    } catch (error) {
      console.error('[Employees] create error', error);
      if (error?.response) {
        console.error('[Employees] create error response', {
          status: error.response.status,
          data: error.response.data,
        });
      }
      toast.error('Failed to add employee');
    }
  };


  const handleUpdateEmployee = async () => {
    const basicSalary = formData.basicSalary === '' ? undefined : Number(formData.basicSalary);
    const allowances = formData.allowances === '' ? undefined : Number(formData.allowances);
    const totalSalary = (basicSalary || 0) + (allowances || 0);
    const updated = {
      ...formData,
      basicSalary,
      allowances,
      salary: totalSalary,
      branchId: formData.branch || undefined,
    };
    try {
      const result = await employeeService.update(selectedEmployee._id, updated);
      setEmployees((prev) => prev.map(emp => (emp._id === result._id ? result : emp)));
      setShowEditModal(false);
      toast.success('Employee updated successfully');
    } catch (error) {
      toast.error('Failed to update employee');
    }
  };

  const handleGenerateSalarySlip = async (employee) => {
    const employeeId = employee?._id || employee?.id;
    if (!employeeId) {
      toast.error('Unable to generate salary slip. Missing employee ID.');
      return;
    }

    setIsSlipLoading(true);
    try {
      const data = await employeeService.getSalarySlip(employeeId, salarySlipMonth, salarySlipYear);
      setSalarySlip({
        employee,
        slip: data
      });
      setShowSalarySlipModal(true);
    } catch (error) {
      toast.error('Unable to load salary slip.');
    } finally {
      setIsSlipLoading(false);
    }
  };

  const handlePrintSalarySlip = () => {
    window.print();
  };

  const getInitials = (name) => {
    if (!name) return 'NA';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getInitialColor = (name) => {
    if (!name) return 'bg-gray-500';
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Employee Management</h1>
        <Button onClick={handleAddEmployee}>
          <FaPlus className="mr-2" /> Add Employee
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by name, ID, or designation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </Select>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </Select>
        </div>
      </Card>

      {/* Employees Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Emp ID</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Photo</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Name</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Designation</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Department</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Phone</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Salary (Rs.)</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Branch</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Join Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee) => {
                const employeeId = employee._id || employee.id;
                return (
                  <tr
                    key={employeeId}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {employeeId}
                    </td>
                  <td className="py-3 px-4">
                    <div className={`w-10 h-10 rounded-full ${getInitialColor(employee.fullName || employee.name || '')} flex items-center justify-center text-white font-semibold`}>
                      {getInitials(employee.fullName || employee.name || '')}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                    {employee.fullName}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                    {employee.designation}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                    {employee.department}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                    {employee.phone}
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900 dark:text-white">
                    Rs. {Number(employee.salary || 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                    {employee.branchId?.name || employee.branch || ''}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                    {employee.joinDate ? new Date(employee.joinDate).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <Badge variant={employee.status === 'Active' ? 'success' : 'secondary'}>
                      {employee.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewEmployee(employee)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                        title="View Details"
                      >
                        <FaEye />
                      </button>
                      <button
                        onClick={() => handleEditEmployee(employee)}
                        className="text-green-600 hover:text-green-800 dark:text-green-400"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleGenerateSalarySlip(employee)}
                        className="text-purple-600 hover:text-purple-800 dark:text-purple-400"
                        title="Salary Slip"
                        disabled={isSlipLoading}
                      >
                        <FaFileInvoice />
                      </button>
                      <button
                        onClick={() => handleDeleteEmployee(employeeId)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No employees found
            </div>
          )}
        </div>
      </Card>

      {/* Add Employee Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Employee"
        size="large"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name *"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              placeholder="Enter full name"
            />
            <Input
              label="Father Name *"
              name="fatherName"
              value={formData.fatherName}
              onChange={handleInputChange}
              placeholder="Enter father name"
            />
            <Input
              label="CNIC *"
              name="cnic"
              value={formData.cnic}
              onChange={handleInputChange}
              placeholder="35202-1234567-1"
            />
            <Input
              label="Date of Birth *"
              name="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={handleInputChange}
            />
            <Input
              label="Phone *"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="0300-1234567"
            />
            <Input
              label="WhatsApp"
              name="whatsapp"
              value={formData.whatsapp}
              onChange={handleInputChange}
              placeholder="0300-1234567"
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="employee@miansons.com"
            />
            <Select
              label="Designation *"
              name="designation"
              value={formData.designation}
              onChange={handleInputChange}
            >
              <option value="">Select Designation</option>
              {designations.map(des => (
                <option key={des} value={des}>{des}</option>
              ))}
            </Select>
            <Select
              label="Department *"
              name="department"
              value={formData.department}
              onChange={handleInputChange}
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </Select>
            <Input
              label="Basic Salary (Rs.) *"
              name="basicSalary"
              type="number"
              value={formData.basicSalary}
              onChange={handleInputChange}
              placeholder="50000"
            />
            <Input
              label="Allowances (Rs.)"
              name="allowances"
              type="number"
              value={formData.allowances}
              onChange={handleInputChange}
              placeholder="10000"
            />
            <Input
              label="Join Date *"
              name="joinDate"
              type="date"
              value={formData.joinDate}
              onChange={handleInputChange}
            />
            <Select
              label="Branch *"
              name="branch"
              value={formData.branch}
              onChange={handleInputChange}
            >
              <option value="">Select Branch</option>
              {branches.map(b => (
                <option key={b._id || b.id} value={b._id || b.id}>{b.name}</option>
              ))}
            </Select>
            <Input
              label="Bank Name"
              name="bankName"
              value={formData.bankName}
              onChange={handleInputChange}
              placeholder="HBL, UBL, etc."
            />
            <Input
              label="Account Number"
              name="accountNumber"
              value={formData.accountNumber}
              onChange={handleInputChange}
              placeholder="1234567890"
            />
            <Input
              label="Emergency Contact Name"
              name="emergencyContact"
              value={formData.emergencyContact}
              onChange={handleInputChange}
              placeholder="Contact person name"
            />
            <Input
              label="Emergency Phone"
              name="emergencyPhone"
              value={formData.emergencyPhone}
              onChange={handleInputChange}
              placeholder="0300-1234567"
            />
            <Select
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </Select>
          </div>
          <TextArea
            label="Address *"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            placeholder="Enter complete address"
            rows={3}
          />
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEmployee}>
              Save Employee
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Employee"
        size="large"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name *"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              placeholder="Enter full name"
            />
            <Input
              label="Father Name *"
              name="fatherName"
              value={formData.fatherName}
              onChange={handleInputChange}
              placeholder="Enter father name"
            />
            <Input
              label="CNIC *"
              name="cnic"
              value={formData.cnic}
              onChange={handleInputChange}
              placeholder="35202-1234567-1"
            />
            <Input
              label="Date of Birth *"
              name="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={handleInputChange}
            />
            <Input
              label="Phone *"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="0300-1234567"
            />
            <Input
              label="WhatsApp"
              name="whatsapp"
              value={formData.whatsapp}
              onChange={handleInputChange}
              placeholder="0300-1234567"
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="employee@miansons.com"
            />
            <Select
              label="Designation *"
              name="designation"
              value={formData.designation}
              onChange={handleInputChange}
            >
              <option value="">Select Designation</option>
              {designations.map(des => (
                <option key={des} value={des}>{des}</option>
              ))}
            </Select>
            <Select
              label="Department *"
              name="department"
              value={formData.department}
              onChange={handleInputChange}
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </Select>
            <Input
              label="Basic Salary (Rs.) *"
              name="basicSalary"
              type="number"
              value={formData.basicSalary}
              onChange={handleInputChange}
              placeholder="50000"
            />
            <Input
              label="Allowances (Rs.)"
              name="allowances"
              type="number"
              value={formData.allowances}
              onChange={handleInputChange}
              placeholder="10000"
            />
            <Input
              label="Join Date *"
              name="joinDate"
              type="date"
              value={formData.joinDate}
              onChange={handleInputChange}
            />
            <Select
              label="Branch *"
              name="branch"
              value={formData.branch}
              onChange={handleInputChange}
            >
              <option value="">Select Branch</option>
              {branches.map(branch => (
                <option key={branch._id || branch.id} value={branch._id || branch.id}>{branch.name}</option>
              ))}
            </Select>
            <Input
              label="Bank Name"
              name="bankName"
              value={formData.bankName}
              onChange={handleInputChange}
              placeholder="HBL, UBL, etc."
            />
            <Input
              label="Account Number"
              name="accountNumber"
              value={formData.accountNumber}
              onChange={handleInputChange}
              placeholder="1234567890"
            />
            <Input
              label="Emergency Contact Name"
              name="emergencyContact"
              value={formData.emergencyContact}
              onChange={handleInputChange}
              placeholder="Contact person name"
            />
            <Input
              label="Emergency Phone"
              name="emergencyPhone"
              value={formData.emergencyPhone}
              onChange={handleInputChange}
              placeholder="0300-1234567"
            />
            <Select
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </Select>
          </div>
          <TextArea
            label="Address *"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            placeholder="Enter complete address"
            rows={3}
          />
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateEmployee}>
              Update Employee
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Employee Modal */}
      {selectedEmployee && (
        <Modal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          title="Employee Details"
          size="large"
        >
          <div className="space-y-6">
            {/* Header with Photo */}
            <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className={`w-20 h-20 rounded-full ${getInitialColor(selectedEmployee.fullName)} flex items-center justify-center text-white text-2xl font-bold`}>
                {getInitials(selectedEmployee.fullName)}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedEmployee.fullName}</h3>
                <p className="text-gray-600 dark:text-gray-400">{selectedEmployee.designation} - {selectedEmployee.department}</p>
                <Badge variant={selectedEmployee.status === 'Active' ? 'success' : 'secondary'} className="mt-1">
                  {selectedEmployee.status}
                </Badge>
              </div>
            </div>

            {/* Personal Information */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Personal Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Employee ID</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedEmployee.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Father Name</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedEmployee.fatherName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">CNIC</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedEmployee.cnic}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Date of Birth</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {new Date(selectedEmployee.dateOfBirth).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Contact Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedEmployee.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">WhatsApp</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedEmployee.whatsapp}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedEmployee.email}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Address</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedEmployee.address}</p>
                </div>
              </div>
            </div>

            {/* Employment Details */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Employment Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Department</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedEmployee.department}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Branch</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedEmployee.branch}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Join Date</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {new Date(selectedEmployee.joinDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Basic Salary</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    Rs. {Number(selectedEmployee.basicSalary || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Allowances</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    Rs. {Number(selectedEmployee.allowances || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Salary</p>
                  <p className="font-semibold text-primary text-lg">
                    Rs. {Number(selectedEmployee.salary || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Bank Account Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Bank Name</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedEmployee.bankName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Account Number</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedEmployee.accountNumber}</p>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Emergency Contact</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Contact Person</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedEmployee.emergencyContact}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Phone Number</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedEmployee.emergencyPhone}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button variant="secondary" onClick={() => setShowViewModal(false)}>
                Close
              </Button>
              <Button onClick={() => handleGenerateSalarySlip(selectedEmployee)}>
                <FaFileInvoice className="mr-2" /> Generate Salary Slip
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showSalarySlipModal && salarySlip && (
        <Modal
          isOpen={showSalarySlipModal}
          onClose={() => {
            setShowSalarySlipModal(false);
            setSalarySlip(null);
          }}
          title="Salary Slip"
          size="large"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Select
                label="Month"
                value={String(salarySlipMonth)}
                onChange={(e) => setSalarySlipMonth(Number(e.target.value))}
                options={monthOptions.map((option) => ({
                  value: String(option.value),
                  label: option.label
                }))}
              />
              <Select
                label="Year"
                value={String(salarySlipYear)}
                onChange={(e) => setSalarySlipYear(Number(e.target.value))}
                options={yearOptions.map((option) => ({
                  value: String(option.value),
                  label: option.label
                }))}
              />
              <Button
                variant="secondary"
                onClick={() => handleGenerateSalarySlip(salarySlip.employee)}
                disabled={isSlipLoading}
              >
                Refresh
              </Button>
              <Button onClick={handlePrintSalarySlip}>Print / PDF</Button>
            </div>

            <Card>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Mian & Sons Hardware Store</h2>
                <p className="text-gray-600 dark:text-gray-400">Salary Slip</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{monthOptions.find((m) => m.value === salarySlipMonth)?.label} {salarySlipYear}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-b border-gray-200 dark:border-gray-700 py-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Employee</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{salarySlip.employee.fullName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Designation</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{salarySlip.employee.designation}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Department</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{salarySlip.employee.department}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Employee ID</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{salarySlip.employee.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Earnings</h4>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex justify-between">
                      <span>Basic Salary</span>
                      <span className="font-medium text-gray-900 dark:text-white">Rs. {Number(salarySlip.slip?.basicSalary ?? salarySlip.employee.basicSalary ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Allowances</span>
                      <span className="font-medium text-gray-900 dark:text-white">Rs. {Number(salarySlip.slip?.allowances ?? salarySlip.employee.allowances ?? 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Deductions</h4>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex justify-between">
                      <span>Deductions</span>
                      <span className="font-medium text-gray-900 dark:text-white">Rs. {Number(salarySlip.slip?.deductions ?? 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4 flex justify-between font-semibold text-gray-900 dark:text-white">
                <span>Net Pay</span>
                <span className="text-lg text-primary-500 dark:text-primary-400 font-bold">
                  Rs. {Number(salarySlip.slip?.netPay ?? salarySlip.slip?.netSalary ?? salarySlip.employee.salary ?? 0).toLocaleString()}
                </span>
              </div>
            </Card>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Employees;
