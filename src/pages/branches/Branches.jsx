import React, { useEffect, useState } from 'react';
import { FaStore, FaPlus, FaEdit, FaChartLine, FaUsers, FaBoxes, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { branchService } from '../../services/branchService';
import { employeeService } from '../../services/employeeService';



const Branches = () => {
  const { checkPermission } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);

  // Branch Data
  const [branches, setBranches] = useState([]);

  // Employee list for Manager dropdown
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const data = await branchService.getAll();
        setBranches(data);
      } catch (error) {
        toast.error('Failed to load branches');
      }
    };
    const fetchEmployees = async () => {
      try {
        const data = await employeeService.getAll();
        setEmployees(data);
      } catch (error) {
        console.error('Failed to load employees for managers', error);
      }
    };
    fetchBranches();
    fetchEmployees();
  }, []);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    openingDate: '',
    status: 'Active',
    manager_employee_id: '',
  });

  // Handle Open Modal for Add
  const handleOpenAddModal = () => {
    if (!checkPermission('branches', 'create')) {
      toast.error('You do not have permission to add branches');
      return;
    }
    setEditingBranch(null);
    setFormData({
      name: '',
      address: '',
      city: '',
      phone: '',
      email: '',
      openingDate: '',
      status: 'Active',
      manager_employee_id: '',
    });
    setShowModal(true);
  };

  // Handle Open Modal for Edit
  const handleOpenEditModal = (branch) => {
    if (!checkPermission('branches', 'update')) {
      toast.error('You do not have permission to edit branches');
      return;
    }
    setEditingBranch(branch);
    setFormData({
      name: branch.name || '',
      address: branch.address || '',
      city: branch.city || '',
      phone: branch.phone || '',
      email: branch.email || '',
      openingDate: branch.openingDate || '',
      status: branch.status || 'Active',
      manager_employee_id: branch.manager_employee_id || '',
    });
    setShowModal(true);
  };

  // Handle Close Modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBranch(null);
    setFormData({
      name: '',
      address: '',
      city: '',
      phone: '',
      email: '',
      openingDate: '',
      status: 'Active',
      manager_employee_id: '',
    });
  };

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.address || !formData.city || !formData.phone || !formData.email || !formData.openingDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      if (editingBranch) {
        // Update existing branch (backend)
        await branchService.update(editingBranch.id, formData);
        toast.success('Branch updated successfully!');
      } else {
        // Add new branch (backend)
        await branchService.create(formData);
        toast.success('Branch added successfully!');
      }
      // Refresh branch list
      const data = await branchService.getAll();
      setBranches(data);
      handleCloseModal();
    } catch (error) {
      toast.error('Failed to save branch');
    }
  };

  // Handle Input Change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Calculate totals (coerce to numbers and default to 0 to avoid NaN)
  const totalSales = branches.reduce((sum, branch) => sum + (Number(branch?.totalSales) || 0), 0);
  const totalStockValue = branches.reduce((sum, branch) => sum + (Number(branch?.stockValue) || 0), 0);
  const totalEmployees = branches.reduce((sum, branch) => sum + (Number(branch?.employeeCount) || 0), 0);

  // Format currency
  const formatCurrency = (amount) => {
    const safeAmount = Number(amount) || 0;
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(safeAmount);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Branch Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage all branch locations and performance</p>
        </div>
        <Button onClick={handleOpenAddModal} className="flex items-center">
          <FaPlus className="mr-2" />
          Add New Branch
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Branches</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{branches.length}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <FaStore className="text-2xl text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Sales</p>
              <p className="text-xl font-bold text-gray-800 dark:text-white mt-1">
                {formatCurrency(totalSales)}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <FaChartLine className="text-2xl text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Stock Value</p>
              <p className="text-xl font-bold text-gray-800 dark:text-white mt-1">
                {formatCurrency(totalStockValue)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <FaBoxes className="text-2xl text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Employees</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{totalEmployees}</p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <FaUsers className="text-2xl text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Branch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {branches.map((branch) => (
          <Card key={branch.id}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg mr-3">
                  <FaStore className="text-2xl text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">{branch.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{branch.id}</p>
                </div>
              </div>
              {branch.status === 'Active' ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Badge variant="danger">Inactive</Badge>
              )}
            </div>

            <div className="space-y-2 mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Address:</strong> {branch.address}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>City:</strong> {branch.city}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Manager:</strong> {branch.manager}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Phone:</strong> {branch.phone}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Email:</strong> {branch.email}
              </p>
            </div>

            {/* Branch Performance */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Performance</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Sales</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">
                    {formatCurrency(Number(branch?.totalSales) || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Stock</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">
                    {formatCurrency(Number(branch?.stockValue) || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Staff</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">
                    {Number(branch?.employeeCount) || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Edit Button */}
            <div className="mt-4">
              <button
                onClick={() => handleOpenEditModal(branch)}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <FaEdit className="mr-2" />
                Edit Branch
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Branch Table */}
      <Card>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">All Branches</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Branch ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  City
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Manager
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {branches.map((branch) => (
                <tr key={branch.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {branch.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{branch.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Opened: {branch.openingDate ? new Date(branch.openingDate).toLocaleDateString() : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                    {branch.address}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {branch.city}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {branch.manager}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {branch.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {branch.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {branch.status === 'Active' ? (
                      <Badge variant="success">
                        <FaCheckCircle className="inline mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="danger">
                        <FaTimesCircle className="inline mr-1" />
                        Inactive
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleOpenEditModal(branch)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Edit"
                    >
                      <FaEdit className="text-lg" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add/Edit Branch Modal */}
      <Modal isOpen={showModal} onClose={handleCloseModal} title={editingBranch ? 'Edit Branch' : 'Add New Branch'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Branch Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Branch Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter branch name"
                required
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="Enter city"
                required
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Address <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Enter complete address"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone <span className="text-red-500">*</span>
              </label>
              <Input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+92 300 1234567"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="branch@mianhardware.com"
                required
              />
            </div>

            {/* Opening Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Opening Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                name="openingDate"
                value={formData.openingDate}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status <span className="text-red-500">*</span>
              </label>
              <Select name="status" value={formData.status} onChange={handleInputChange} required>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Select>
            </div>

            {/* Manager */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Manager
              </label>
              <Select name="manager_employee_id" value={formData.manager_employee_id} onChange={handleInputChange}>
                <option value="">Select Manager...</option>
                {employees.map(emp => (
                  <option key={emp._id || emp.id} value={emp._id || emp.id}>{emp.name || emp.fullName}</option>
                ))}
              </Select>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 mt-6">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit">{editingBranch ? 'Update Branch' : 'Add Branch'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Branches;
