import React, { useEffect, useState } from 'react';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Modal from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { showPremiumConfirm } from '../../utils/premiumDialogs';

import { userService } from '../../services/userService';

const ACCESS_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

// Default short access code length for admin-created users (4-5 chars requested)
const DEFAULT_ACCESS_CODE_LENGTH = 5;

const generateAccessCode = (length = DEFAULT_ACCESS_CODE_LENGTH) => {
  let values;
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    values = window.crypto.getRandomValues(new Uint32Array(length));
  } else {
    values = new Uint32Array(length);
    for (let i = 0; i < length; i += 1) {
      values[i] = Math.floor(Math.random() * ACCESS_CODE_ALPHABET.length);
    }
  }
  return Array.from(values, (value) => ACCESS_CODE_ALPHABET[value % ACCESS_CODE_ALPHABET.length]).join('');
};

const Users = () => {
  const { user, checkPermission } = useAuth();
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'manager'
  });

  const refreshUsers = async () => {
    const data = await userService.getAll();
    setUsers(data.map((row) => ({ ...row, id: row._id || row.id })));
  };

  useEffect(() => {
    refreshUsers().catch(() => toast.error('Failed to fetch users from backend'));
  }, []);

  if (!checkPermission('users', 'read') && user?.role !== 'admin' && user?.role !== 'superadmin') {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Only administrators can access user management.
          </p>
        </Card>
      </div>
    );
  }

  const canCreate = checkPermission('users', 'create');
  const canEdit = checkPermission('users', 'update');
  const canDelete = checkPermission('users', 'delete');

  const roleOptions = [
    { value: 'superadmin', label: 'Super Admin' },
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'cashier', label: 'Cashier' }
  ];

  const filteredUsers = users.filter((row) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      String(row.username || '').toLowerCase().includes(query) ||
      String(row._id || row.id || '').toLowerCase().includes(query);
    const matchesRole = !roleFilter || row.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleOpenAdd = () => {
    if (!canCreate) {
      toast.error('You do not have permission to add users');
      return;
    }
    setEditingUser(null);
    setFormData({ username: '', password: generateAccessCode(), role: 'manager' });
    setShowModal(true);
  };

  const handleOpenEdit = (row) => {
    if (!canEdit) {
      toast.error('You do not have permission to edit users');
      return;
    }
    setEditingUser(row);
    setFormData({
      username: row.username || '',
      password: '',
      role: row.role || 'manager'
    });
    setShowModal(true);
  };

  const handleDelete = async (row) => {
    if (!canDelete) {
      toast.error('You do not have permission to delete users');
      return;
    }
    const displayName = row.username || row._id || row.id;
    const confirmed = await showPremiumConfirm({
      title: 'Delete User',
      text: `Delete user ${displayName}?`,
      confirmText: 'Delete User',
      cancelText: 'Cancel',
      icon: 'warning'
    });

    if (!confirmed) {
      return;
    }
    try {
      await userService.delete(row._id || row.id);
      await refreshUsers();
      toast.success('User deleted successfully');
    } catch (error) {
      console.error('[Users] delete error', error);
      toast.error('Failed to delete user');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.role || (!editingUser && !formData.password)) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      if (editingUser) {
        const updatePayload = {
          username: formData.username,
          role: formData.role
        };
        if (formData.password) {
          updatePayload.password = formData.password;
        }
        console.log('[Users] update payload', updatePayload);
        await userService.update(editingUser._id || editingUser.id, updatePayload);
        toast.success('User updated successfully');
      } else {
        console.log('[Users] create payload', {
          username: formData.username,
          role: formData.role,
          passwordLength: formData.password?.length
        });
        await userService.create({
          username: formData.username,
          password: formData.password,
          role: formData.role
        });
        toast.success('User added successfully');
      }
      await refreshUsers();
      setShowModal(false);
      setEditingUser(null);
    } catch (error) {
      console.error('[Users] save error', error);
      const detail = error?.response?.data?.detail;
      if (detail) {
        const message = Array.isArray(detail)
          ? detail.map((item) => item?.msg || item?.message || String(item)).join(', ')
          : String(detail);
        toast.error(message);
      } else {
        toast.error('Failed to save user');
      }
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRegenerateAccessCode = () => {
    setFormData((prev) => ({
      ...prev,
      password: generateAccessCode()
    }));
  };

  const columns = [
    {
      label: 'ID',
      key: 'id',
      render: (row) => row._id || row.id
    },
    {
      label: 'Username',
      key: 'username'
    },
    {
      label: 'Role',
      key: 'role',
      render: (row) => (
        <span className="capitalize text-gray-900 dark:text-gray-100">{row.role}</span>
      )
    },
    {
      label: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="flex gap-2">
          {canEdit && (
            <Button size="sm" variant="secondary" onClick={() => handleOpenEdit(row)}>
              Edit
            </Button>
          )}
          {canDelete && row.username !== user?.username && (
            <Button size="sm" variant="danger" onClick={() => handleDelete(row)}>
              Delete
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Users</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage system users and access roles</p>
        </div>
        <Button onClick={handleOpenAdd} disabled={!canCreate}>
          Add User
        </Button>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            placeholder="Search by username or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            {roleOptions.map((role) => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </Select>
        </div>
      </Card>

      <Card>
        <Table columns={columns} data={filteredUsers} emptyMessage="No users found" />
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingUser ? 'Edit User' : 'Add User'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Username *"
            name="username"
            value={formData.username}
            onChange={handleFormChange}
            placeholder="Enter username"
            required
          />
          <div className="flex items-end gap-2">
            <Input
              label={editingUser ? "New Access Code (leave blank to keep current)" : "Access Code *"}
              name="password"
              value={formData.password}
              onChange={handleFormChange}
              placeholder={editingUser ? "Leave blank to keep current code" : "Auto-generated"}
              helperText="Share this access code with the user."
              readOnly
              required={!editingUser}
              className="flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleRegenerateAccessCode}
            >
              Generate
            </Button>
          </div>
          <Select
            label="Role *"
            name="role"
            value={formData.role}
            onChange={handleFormChange}
            required
          >
            {roleOptions.map((role) => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </Select>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingUser ? 'Update User' : 'Add User'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Users;
