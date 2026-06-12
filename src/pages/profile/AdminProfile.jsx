import React, { useState } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/userService';
import { toast } from 'react-toastify';
import { FaSave } from 'react-icons/fa';

const AdminProfile = () => {
  const { user } = useAuth();

  const displayName = user?.name || user?.fullName || 'Super Admin';
  const email = user?.email || 'Not set';
  const role = user?.role || 'superadmin';
  const phone = user?.phone || 'Not set';
  const address = user?.address || 'Not set';

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill in all password fields!');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New password and confirm password do not match!');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long!');
      return;
    }

    setLoading(true);
    try {
      await userService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      toast.success('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">My Profile</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Profile and security details</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Profile Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Full Name</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{displayName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Role</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">{role}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{phone}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">Address</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{address}</p>
              </div>
            </div>
          </Card>
        </div>

        <div>
          <Card>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Change Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                required
              />
              <Input
                label="New Password"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                required
                helper="Must be at least 8 characters"
              />
              <Input
                label="Confirm New Password"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                required
              />
              <div className="pt-2">
                <Button type="submit" className="w-full flex justify-center items-center" disabled={loading}>
                  <FaSave className="mr-2" />
                  {loading ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
