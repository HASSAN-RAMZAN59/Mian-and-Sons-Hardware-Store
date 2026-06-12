import React, { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { FaEye, FaCheck, FaTimes, FaPlus, FaSearch } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { returnsService } from '../../services/returnsService';
import { orderService } from '../../services/orderService';
import { supplierService } from '../../services/supplierService';

const Returns = () => {
  const [activeTab, setActiveTab] = useState('customer');
  const [returns, setReturns] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // State for new return
  const [isFetchingOrder, setIsFetchingOrder] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  
  const [newReturn, setNewReturn] = useState({
    orderId: '',
    productId: '',
    productName: '',
    price: 0,
    quantity: 1,
    reason: '',
    refundAmount: 0,
    status: 'requested',
    customerId: '',
    supplierId: ''
  });

  const [supplierReturn, setSupplierReturn] = useState({
    supplierId: '',
    supplierName: '',
    productName: '',
    quantity: 1,
    reason: '',
    status: 'requested'
  });

  const loadReturns = async () => {
    setIsLoading(true);
    try {
      const data = await returnsService.getAll();
      setReturns(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to load returns');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const data = await supplierService.getAll();
      const mapped = (Array.isArray(data) ? data : [])
        .filter((sup) => sup.status !== 'Inactive' && sup.status !== 'Deleted')
        .map((sup) => ({
          value: String(sup._id || sup.id),
          label: sup.company || sup.name || sup.contactPerson || 'Supplier',
          raw: sup
        }));
      setSuppliers(mapped);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
      toast.error('Failed to load suppliers');
      setSuppliers([]);
    }
  };

  useEffect(() => {
    loadReturns();
    loadSuppliers();
  }, []);

  const handleFetchOrder = async () => {
    if (!newReturn.orderId) {
      toast.warning('Please enter an Order ID first');
      return;
    }

    setIsFetchingOrder(true);
    setSelectedOrderDetails(null);
    setOrderItems([]);
    
    try {
      const order = await orderService.getById(newReturn.orderId);
      if (order) {
        setSelectedOrderDetails(order);
        setOrderItems(order.items || []);
        setNewReturn(prev => ({
          ...prev,
          customerId: order.customer_id || '',
          productId: '',
          productName: '',
          price: 0
        }));
        toast.success('Order found! Select a product for return.');
      } else {
        toast.error('Order not found');
      }
    } catch (error) {
      toast.error('Failed to fetch order details');
      console.error(error);
    } finally {
      setIsFetchingOrder(false);
    }
  };

  const handleProductSelect = (productId) => {
    const item = orderItems.find(i => String(i.product_id || i.productId) === productId);
    if (item) {
      setNewReturn(prev => ({
        ...prev,
        productId,
        productName: item.name || item.productName || 'Unknown Product',
        price: item.price || item.unitPrice || 0,
        refundAmount: (item.price || item.unitPrice || 0) * (prev.quantity || 1)
      }));
    } else {
      setNewReturn(prev => ({ ...prev, productId: '', productName: '', price: 0 }));
    }
  };

  const handleAddReturn = async (e) => {
    e.preventDefault();
    
    if (!newReturn.productId) {
      toast.error('Please select a product from the order');
      return;
    }

    try {
      await returnsService.create(newReturn);
      toast.success('Return request created successfully');
      setIsAddModalOpen(false);
      loadReturns();
      
      // Reset form
      setNewReturn({
        orderId: '',
        productId: '',
        productName: '',
        price: 0,
        quantity: 1,
        reason: '',
        refundAmount: 0,
        status: 'requested',
        customerId: ''
      });
      setSelectedOrderDetails(null);
      setOrderItems([]);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create return request');
    }
  };

  const handleAddSupplierReturn = async (e) => {
    e.preventDefault();

    if (!supplierReturn.supplierId || !supplierReturn.productName || !supplierReturn.quantity) {
      toast.error('Please fill all supplier return fields');
      return;
    }

    try {
      await returnsService.create({
        supplierId: supplierReturn.supplierId,
        supplierName: supplierReturn.supplierName,
        productName: supplierReturn.productName,
        quantity: Number(supplierReturn.quantity),
        reason: supplierReturn.reason,
        status: supplierReturn.status,
        returnType: 'supplier'
      });
      toast.success('Supplier return created successfully');
      setIsAddModalOpen(false);
      loadReturns();
      setSupplierReturn({
        supplierId: '',
        supplierName: '',
        productName: '',
        quantity: 1,
        reason: '',
        status: 'requested'
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create supplier return');
    }
  };

  const updateReturnStatus = async (id, newStatus) => {
    try {
      await returnsService.update(id, { status: newStatus });
      toast.info(`Return ${newStatus}`);
      loadReturns();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'requested' || s === 'pending') return <Badge variant="warning">Pending</Badge>;
    if (s === 'approved') return <Badge variant="success">Approved</Badge>;
    if (s === 'rejected') return <Badge variant="danger">Rejected</Badge>;
    if (s === 'completed') return <Badge variant="info">Completed</Badge>;
    return <Badge variant="default">{status}</Badge>;
  };

  const customerReturns = returns.filter((ret) => String(ret.returnType || ret.type || 'customer').toLowerCase() !== 'supplier');
  const supplierReturns = returns.filter((ret) => String(ret.returnType || ret.type || '').toLowerCase() === 'supplier');

  const columns = [
    { key: 'orderId', label: 'Order ID' },
    { key: 'productName', label: 'Product' },
    { key: 'price', label: 'Unit Price', render: (row) => `Rs. ${row.price || 0}` },
    { key: 'quantity', label: 'Qty' },
    { key: 'refundAmount', label: 'Refund', render: (row) => `Rs. ${row.refundAmount || 0}` },
    { key: 'status', label: 'Status', render: (row) => getStatusBadge(row.status) },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex space-x-2">
          <button onClick={() => { setSelectedReturn(row); setIsViewModalOpen(true); }} className="text-blue-600 dark:text-blue-400 hover:opacity-80"><FaEye /></button>
          {(row.status === 'requested' || row.status === 'Pending') && (
            <>
              <button onClick={() => updateReturnStatus(row._id || row.id, 'Approved')} title="Approve" className="text-green-600 dark:text-green-400 hover:opacity-80"><FaCheck /></button>
              <button onClick={() => updateReturnStatus(row._id || row.id, 'Rejected')} title="Reject" className="text-red-600 dark:text-red-400 hover:opacity-80"><FaTimes /></button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Returns Management</h1>
        <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
          <FaPlus /> New Return
        </Button>
      </div>

      <div className="mb-6 flex space-x-4">
        <button
          onClick={() => setActiveTab('customer')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'customer' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400'}`}
        >
          Customer Returns
        </button>
        <button
          onClick={() => setActiveTab('supplier')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'supplier' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400'}`}
        >
          Supplier Returns
        </button>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center bg-gray-50 dark:bg-gray-700/30 rounded-lg px-3 py-2 w-full max-w-md border border-gray-200 dark:border-gray-700">
            <FaSearch className="text-gray-400" />
            <input
              type="text"
              placeholder="Search by Order or Product..."
              className="bg-transparent border-none focus:ring-0 ml-2 w-full text-sm dark:text-gray-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        {activeTab === 'customer' ? (
          <Table
            columns={columns}
            data={customerReturns.filter(ret => 
              (ret.orderId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
              (ret.productName || '').toLowerCase().includes(searchTerm.toLowerCase())
            )}
            loading={isLoading}
          />
        ) : (
          <Table
            columns={[
              { key: 'supplierName', label: 'Supplier' },
              { key: 'productName', label: 'Product' },
              { key: 'quantity', label: 'Qty' },
              { key: 'reason', label: 'Reason' },
              { key: 'status', label: 'Status', render: (row) => getStatusBadge(row.status) },
            ]}
            data={supplierReturns.filter(ret => 
              (ret.supplierName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
              (ret.productName || '').toLowerCase().includes(searchTerm.toLowerCase())
            )}
            loading={isLoading}
          />
        )}
      </Card>

      {/* View Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Return Request Details"
      >
        {selectedReturn && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm text-gray-500 dark:text-gray-400">Order ID</p><p className="font-medium dark:text-white">{selectedReturn.orderId}</p></div>
              <div><p className="text-sm text-gray-500 dark:text-gray-400">Date</p><p className="font-medium dark:text-white">{new Date(selectedReturn.createdAt).toLocaleDateString()}</p></div>
              <div><p className="text-sm text-gray-500 dark:text-gray-400">Customer ID</p><p className="font-medium dark:text-white">{selectedReturn.customerId || 'Guest'}</p></div>
              <div><p className="text-sm text-gray-500 dark:text-gray-400">Product</p><p className="font-medium dark:text-white">{selectedReturn.productName}</p></div>
              <div><p className="text-sm text-gray-500 dark:text-gray-400">Unit Price</p><p className="font-medium dark:text-white">Rs. {selectedReturn.price}</p></div>
              <div><p className="text-sm text-gray-500 dark:text-gray-400">Quantity</p><p className="font-medium dark:text-white">{selectedReturn.quantity}</p></div>
              <div><p className="text-sm text-gray-500 dark:text-gray-400">Refund</p><p className="font-medium text-green-600 dark:text-green-400 font-bold">Rs. {selectedReturn.refundAmount}</p></div>
              <div><p className="text-sm text-gray-500 dark:text-gray-400">Status</p><p className="font-medium">{getStatusBadge(selectedReturn.status)}</p></div>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Reason</p>
              <p className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg mt-1 dark:text-gray-300">{selectedReturn.reason}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Return Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create New Return Request"
      >
        {activeTab === 'customer' ? (
          <form onSubmit={handleAddReturn} className="space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Order ID</label>
              <input 
                required 
                type="text" 
                className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" 
                value={newReturn.orderId} 
                onChange={(e) => setNewReturn({...newReturn, orderId: e.target.value})}
                placeholder="Enter valid Order ID"
              />
            </div>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleFetchOrder}
              loading={isFetchingOrder}
            >
              Verify Order
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Select Product from Order</label>
              <select
                required
                disabled={!selectedOrderDetails}
                className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
                value={newReturn.productId}
                onChange={(e) => handleProductSelect(e.target.value)}
              >
                <option value="">{selectedOrderDetails ? '-- Select Item --' : '-- Verify Order First --'}</option>
                {orderItems.map((item, idx) => (
                  <option key={idx} value={item.product_id || item.productId}>
                    {item.name || item.productName} (Rs. {item.price || item.unitPrice})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Quantity</label>
              <input 
                required 
                type="number" 
                min="1"
                className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" 
                value={newReturn.quantity} 
                onChange={(e) => {
                  const qty = parseInt(e.target.value) || 1;
                  setNewReturn({...newReturn, quantity: qty, refundAmount: qty * newReturn.price});
                }} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Refund Amount</label>
              <input 
                readOnly
                type="number" 
                className="w-full rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-transparent cursor-not-allowed" 
                value={newReturn.refundAmount} 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Reason for Return</label>
            <textarea 
              required 
              className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" 
              value={newReturn.reason} 
              onChange={(e) => setNewReturn({...newReturn, reason: e.target.value})} 
              rows={3}
              placeholder="Explain why the item is being returned..."
            ></textarea>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!newReturn.productId}>Submit Return</Button>
          </div>
          </form>
        ) : (
          <form onSubmit={handleAddSupplierReturn} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Supplier</label>
              <select
                required
                className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                value={supplierReturn.supplierId}
                onChange={(e) => {
                  const selected = suppliers.find((s) => s.value === e.target.value);
                  setSupplierReturn((prev) => ({
                    ...prev,
                    supplierId: e.target.value,
                    supplierName: selected?.label || ''
                  }));
                }}
              >
                <option value="">Select supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.value} value={supplier.value}>{supplier.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Product Name</label>
              <input
                required
                type="text"
                className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                value={supplierReturn.productName}
                onChange={(e) => setSupplierReturn((prev) => ({ ...prev, productName: e.target.value }))}
                placeholder="Returned product name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Quantity</label>
                <input
                  required
                  type="number"
                  min="1"
                  className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  value={supplierReturn.quantity}
                  onChange={(e) => setSupplierReturn((prev) => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Status</label>
                <select
                  className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  value={supplierReturn.status}
                  onChange={(e) => setSupplierReturn((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="requested">Requested</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Reason</label>
              <textarea
                className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                value={supplierReturn.reason}
                onChange={(e) => setSupplierReturn((prev) => ({ ...prev, reason: e.target.value }))}
                rows={3}
                placeholder="Why is this being returned to supplier?"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
              <Button type="submit">Submit Supplier Return</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Returns;
