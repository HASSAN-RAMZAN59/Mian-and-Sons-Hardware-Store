import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaShieldAlt, FaExclamationTriangle, FaCheckCircle, FaClock, FaTimesCircle, FaFileAlt, FaTrash } from 'react-icons/fa';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { logAudit } from '../../utils/audit';
import { warrantyService } from '../../services/warrantyService';

const Warranties = () => {
  const { checkPermission, user } = useAuth();
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [warranties, setWarranties] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Claim Form State
  const [claimForm, setClaimForm] = useState({
    issue: '',
    description: '',
    claimDate: new Date().toISOString().split('T')[0],
  });

  const getWarrantyId = (warranty) => warranty?.id || warranty?._id || warranty?.warranty_id;

  const getLatestClaim = (warranty) => {
    if (!Array.isArray(warranty?.claimHistory) || warranty.claimHistory.length === 0) {
      return null;
    }
    return warranty.claimHistory[warranty.claimHistory.length - 1];
  };

  const fetchWarranties = async () => {
    setIsLoading(true);
    try {
      const data = await warrantyService.getAll();
      setWarranties(Array.isArray(data) ? data : []);
      console.log("[WARRANTY] Fetched Data:", data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load warranties');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWarranties();
  }, []);

  // Calculate warranty status
  const getWarrantyStatus = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return 'Expired';
    if (daysUntilExpiry <= 30) return 'Expiring Soon';
    return 'Active';
  };

  // Get days remaining
  const getDaysRemaining = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry;
  };

  // Filter warranties
  const filteredWarranties = warranties.filter((warranty) => {
    const effectiveStatus = warranty.status === 'Active' ? getWarrantyStatus(warranty.end_date) : warranty.status;
    if (statusFilter === 'All') return true;
    return effectiveStatus === statusFilter;
  });

  // Get expiring soon warranties
  const expiringSoonWarranties = warranties.filter(
    (w) => w.status === 'Active' && getWarrantyStatus(w.end_date) === 'Expiring Soon'
  );

  // Calculate statistics (dynamic, derived from live data)
  const activeWarranties = warranties.filter(
    (w) => w.status === 'Active' && getWarrantyStatus(w.end_date) === 'Active'
  ).length;
  const expiringSoon = warranties.filter(
    (w) => w.status === 'Active' && getWarrantyStatus(w.end_date) === 'Expiring Soon'
  ).length;
  const expiredWarranties = warranties.filter(
    (w) => w.status === 'Active' && getWarrantyStatus(w.end_date) === 'Expired'
  ).length;
  const claimedWarranties = warranties.filter((warranty) => warranty.status === 'Claimed').length;
  const pendingWarranties = warranties.filter((warranty) => warranty.status === 'Pending').length;

  // Handle Claim Warranty
  const handleOpenClaimModal = (warranty) => {
    if (!checkPermission('warranties', 'update')) {
      toast.error('You do not have permission to claim warranties');
      return;
    }
    setSelectedWarranty(warranty);
    setClaimForm({
      issue: '',
      description: '',
      claimDate: new Date().toISOString().split('T')[0],
    });
    setShowClaimModal(true);
  };

  // Handle Close Claim Modal
  const handleCloseClaimModal = () => {
    setShowClaimModal(false);
    setSelectedWarranty(null);
  };

  const handleDeleteWarranty = async (warranty) => {
    if (!checkPermission('warranties', 'delete')) {
      toast.error('You do not have permission to delete warranties');
      return;
    }

    const warrantyId = getWarrantyId(warranty);
    if (!warrantyId) {
      toast.error('Warranty ID is missing. Please reload and try again.');
      return;
    }

    const confirmed = window.confirm('Delete this warranty record? This action cannot be undone.');
    if (!confirmed) return;

    try {
      await warrantyService.delete(warrantyId);

      logAudit({
        user,
        action: 'Deleted',
        module: 'Warranties',
        description: `Warranty deleted for ${warranty.product?.name || warrantyId}`
      });

      toast.success('Warranty deleted successfully!');
      if (selectedWarranty && getWarrantyId(selectedWarranty) === warrantyId) {
        handleCloseClaimModal();
      }
      fetchWarranties();
    } catch (error) {
      toast.error('Failed to delete warranty');
    }
  };

  // Handle Claim Submit
  const handleClaimSubmit = async (e) => {
    e.preventDefault();

    if (!claimForm.issue || !claimForm.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const claimEntry = {
        claimDate: claimForm.claimDate,
        issue: claimForm.issue,
        description: claimForm.description,
        status: 'Pending',
      };

      const warrantyId = getWarrantyId(selectedWarranty);
      if (!warrantyId) {
        toast.error('Warranty ID is missing. Please reload and try again.');
        return;
      }

      await warrantyService.update(warrantyId, {
        status: 'Claimed',
        claimHistory: [...(selectedWarranty.claimHistory || []), claimEntry]
      });

      logAudit({
        user,
        action: 'Updated',
        module: 'Warranties',
        description: `Warranty claim submitted for ${selectedWarranty.product?.name || warrantyId}`
      });
      
      toast.success('Warranty claim submitted successfully!');
      fetchWarranties();
      handleCloseClaimModal();
    } catch (error) {
      toast.error('Failed to submit claim');
    }
  };

  // Get status badge
  const getStatusBadge = (warranty) => {
    const status = warranty.status === 'Active' ? getWarrantyStatus(warranty.end_date) : warranty.status;
    
    switch (status) {
      case 'Pending':
        return <Badge variant="warning"><FaClock className="inline mr-1" />Pending</Badge>;
      case 'Active':
        return <Badge variant="success"><FaCheckCircle className="inline mr-1" />Active</Badge>;
      case 'Expiring Soon':
        return <Badge variant="warning"><FaClock className="inline mr-1" />Expiring Soon</Badge>;
      case 'Expired':
        return <Badge variant="danger"><FaTimesCircle className="inline mr-1" />Expired</Badge>;
      case 'Claimed':
        return <Badge variant="info"><FaFileAlt className="inline mr-1" />Claimed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Get status color class
  const getStatusColorClass = (warranty) => {
    const status = warranty.status === 'Active' ? getWarrantyStatus(warranty.end_date) : warranty.status;
    
    switch (status) {
      case 'Pending':
        return 'bg-yellow-50 dark:bg-yellow-900/20';
      case 'Active':
        return 'bg-green-50 dark:bg-green-900/20';
      case 'Expiring Soon':
        return 'bg-yellow-50 dark:bg-yellow-900/20';
      case 'Expired':
        return 'bg-red-50 dark:bg-red-900/20';
      case 'Claimed':
        return 'bg-blue-50 dark:bg-blue-900/20';
      default:
        return '';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Warranty Claims</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Only storefront-submitted claims are shown here</p>
        </div>
        <Link
          to="/warranty-claim"
          className="px-4 py-2 rounded-lg bg-secondary text-white font-semibold hover:opacity-90 transition-opacity"
        >
          Open Storefront Claim Form
        </Link>
      </div>

      {/* Alert Section - Expiring Soon */}
      {!isLoading && expiringSoonWarranties.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded-lg">
          <div className="flex items-center mb-2">
            <FaExclamationTriangle className="text-yellow-600 dark:text-yellow-400 mr-2" />
            <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
              Warranties Expiring in Next 30 Days
            </h3>
          </div>
          <div className="space-y-2">
            {expiringSoonWarranties.map((warranty) => (
              <div key={warranty.id} className="flex justify-between items-center text-sm text-yellow-700 dark:text-yellow-300">
                <span>
                  <strong>{warranty.product?.name}</strong> - Customer: {warranty.customer?.fullName}
                </span>
                <span className="font-semibold">
                  Expires in {getDaysRemaining(warranty.end_date)} days ({new Date(warranty.end_date).toLocaleDateString()})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Warranties</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{activeWarranties}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <FaCheckCircle className="text-2xl text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Expiring Soon</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{expiringSoon}</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <FaClock className="text-2xl text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Expired</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{expiredWarranties}</p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
              <FaTimesCircle className="text-2xl text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{pendingWarranties}</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <FaClock className="text-2xl text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Section */}
      <div className="mb-6">
        <Card>
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Status:</label>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-48"
            >
              <option value="All">All Warranties</option>
              <option value="Pending">Pending</option>
              <option value="Active">Active</option>
              <option value="Expiring Soon">Expiring Soon</option>
              <option value="Expired">Expired</option>
              <option value="Claimed">Claimed</option>
            </Select>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredWarranties.length} of {warranties.length} warranties
            </span>
          </div>
        </Card>
      </div>

      {/* Warranties Table */}
      <Card>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Warranty Records</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sale ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Serial No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Issue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">StartDate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expiry Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr><td colSpan="8" className="px-6 py-4 text-center">Loading...</td></tr>
              ) : filteredWarranties.length === 0 ? (
                <tr><td colSpan="8" className="px-6 py-4 text-center">No records found</td></tr>
              ) : filteredWarranties.map((warranty) => (
                <tr key={getWarrantyId(warranty)} className={`${getStatusColorClass(warranty)} hover:opacity-80 transition-opacity`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white font-mono">
                    {warranty.sale_id?.substring(0, 8) || 'Manual'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {warranty.product?.name || 'Unknown Product'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                    {warranty.serial_no || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {warranty.customer?.fullName || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{warranty.customer?.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-normal text-sm text-gray-900 dark:text-white max-w-[220px]">
                    {getLatestClaim(warranty)?.issue || warranty.details || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-normal text-sm text-gray-700 dark:text-gray-300 max-w-[320px]">
                    {getLatestClaim(warranty)?.description || warranty.details || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {new Date(warranty.start_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {new Date(warranty.end_date).toLocaleDateString()}
                    </div>
                    {warranty.status === 'Active' && getDaysRemaining(warranty.end_date) > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {getDaysRemaining(warranty.end_date)} days remaining
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(warranty)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-3">
                      {warranty.status !== 'Claimed' && getWarrantyStatus(warranty.end_date) !== 'Expired' && (
                        <button
                          onClick={() => handleOpenClaimModal(warranty)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
                          title="Claim Warranty"
                        >
                          <FaShieldAlt className="mr-1" />
                          Claim
                        </button>
                      )}
                      {warranty.status === 'Claimed' && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {warranty.claimHistory?.length || 0} claim(s)
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteWarranty(warranty)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 flex items-center"
                        title="Delete Warranty"
                      >
                        <FaTrash className="mr-1" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Claim Warranty Modal */}
      <Modal isOpen={showClaimModal} onClose={handleCloseClaimModal} title="Claim Warranty">
        {selectedWarranty && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Warranty Details</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Product:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{selectedWarranty.product?.name}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Serial No:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white font-mono">{selectedWarranty.serial_no || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Customer:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{selectedWarranty.customer?.fullName}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600 dark:text-gray-400">Issue:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {getLatestClaim(selectedWarranty)?.issue || selectedWarranty.details || 'N/A'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600 dark:text-gray-400">Description:</span>
                <div className="mt-1 text-gray-900 dark:text-white leading-relaxed">
                  {getLatestClaim(selectedWarranty)?.description || selectedWarranty.details || 'N/A'}
                </div>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Expiry:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {new Date(selectedWarranty.end_date).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleClaimSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Claim Date <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={claimForm.claimDate}
              onChange={(e) => setClaimForm({ ...claimForm, claimDate: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Issue <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={claimForm.issue}
              onChange={(e) => setClaimForm({ ...claimForm, issue: e.target.value })}
              placeholder="e.g., Motor malfunction, Power failure, etc."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={claimForm.description}
              onChange={(e) => setClaimForm({ ...claimForm, description: e.target.value })}
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Describe the issue in detail..."
              required
            ></textarea>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button type="button" variant="secondary" onClick={handleCloseClaimModal}>
              Cancel
            </Button>
            <Button type="submit">Submit Claim</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Warranties;
