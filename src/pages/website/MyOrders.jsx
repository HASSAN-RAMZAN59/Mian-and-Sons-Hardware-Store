import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderService } from '../../services/orderService';

const statusClasses = {
  Pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Confirmed: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  Dispatched: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
};

const formatStatus = (value) => {
  const raw = String(value || 'Pending').trim();
  if (!raw) return 'Pending';
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
};

const MyOrders = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const customer = JSON.parse(localStorage.getItem('customerUser') || 'null');
        const customerId = customer?.id || customer?._id || customer?.email;
        const phone = customer?.phone || '';
        if (!customerId) {
          setOrders([]);
          return;
        }

        const rows = await orderService.getByCustomer(String(customerId), phone);
        setOrders(Array.isArray(rows) ? rows : []);
      } catch {
        setOrders([]);
      }
    };

    loadOrders();

    const timer = window.setInterval(loadOrders, 10000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const sortedOrders = useMemo(() => {
    return [...orders].sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
  }, [orders]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl">
        <h1 className="text-3xl font-bold text-primary dark:text-white">My Orders</h1>
        <p className="text-gray-600 dark:text-slate-400 mt-1">View your latest order details and live tracking updates.</p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800/50 text-left text-gray-600 dark:text-slate-400 border-b border-gray-200 dark:border-slate-800">
                <th className="px-4 py-3">Order#</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {sortedOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-slate-500">No orders found yet.</td>
                </tr>
              ) : (
                sortedOrders.map((order) => {
                  const status = formatStatus(order.status);
                  const itemCount = (order.items || []).reduce((total, item) => total + Number(item.quantity || 1), 0);

                  return (
                    <tr key={order._id || order.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-4 font-semibold text-primary dark:text-blue-400">{order._id || order.id}</td>
                      <td className="px-4 py-4 text-gray-600 dark:text-slate-300">{new Date(order.createdAt || Date.now()).toLocaleDateString('en-PK')}</td>
                      <td className="px-4 py-4 text-gray-600 dark:text-slate-300">{itemCount}</td>
                      <td className="px-4 py-4 font-semibold text-secondary">Rs. {Number(order.totals?.grandTotal || order.total || 0).toLocaleString()}</td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusClasses[status] || 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300'}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Link to={`/track-order/${order._id || order.id}`} className="text-xs px-4 py-2 rounded-lg border border-primary text-primary dark:text-blue-400 dark:border-blue-400 hover:bg-primary hover:text-white dark:hover:bg-blue-400 dark:hover:text-slate-900 transition-all font-medium">
                          Track Order
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MyOrders;