import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { FaPhoneAlt, FaUser, FaTruck, FaWarehouse, FaHome, FaMapMarkerAlt } from 'react-icons/fa';
import { orderService } from '../../services/orderService';



const statusSteps = [
  { key: 'placed', label: 'Order Placed', icon: '' },
  { key: 'processing', label: 'Processing', icon: '' },
  { key: 'confirmed', label: 'Confirmed', icon: '' },
  { key: 'dispatched', label: 'Dispatched', icon: '' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: '' },
  { key: 'delivered', label: 'Delivered', icon: '' }
];

const normalizeOrderId = (value = '') => String(value).replace('#', '').trim().toUpperCase();

const normalizeStatusKey = (status) => {
  const raw = String(status || '').trim().toLowerCase().replace(/[-\s]+/g, '_');
  const map = {
    pending: 'placed',
    placed: 'placed',
    order_placed: 'placed',
    processing: 'processing',
    confirmed: 'confirmed',
    dispatched: 'dispatched',
    shipped: 'dispatched',
    out_for_delivery: 'out_for_delivery',
    delivered: 'delivered',
    completed: 'delivered'
  };
  return map[raw] || 'placed';
};

const formatTimelineDate = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const OrderTracking = () => {
  const { orderId: routeOrderId } = useParams();
  const [orderData, setOrderData] = useState(null);
  const [trackedOrderId, setTrackedOrderId] = useState(() => normalizeOrderId(routeOrderId));
  const [trackingInput, setTrackingInput] = useState(() => normalizeOrderId(routeOrderId));
  const [trackingStarted, setTrackingStarted] = useState(() => Boolean(normalizeOrderId(routeOrderId)));
  const [lastSyncedAt, setLastSyncedAt] = useState(() => Date.now());
  const [trackingError, setTrackingError] = useState('');

  useEffect(() => {
    const loadOrder = async () => {
      if (!trackingStarted || !trackedOrderId) {
        setOrderData(null);
        return;
      }

      try {
        const order = await orderService.getById(trackedOrderId);
        setOrderData(order || null);
      } catch {
        setOrderData(null);
      }

      setLastSyncedAt(Date.now());
    };

    loadOrder();
    const syncTimer = window.setInterval(loadOrder, 5000);

    return () => {
      window.clearInterval(syncTimer);
    };
  }, [trackedOrderId, trackingStarted]);

  useEffect(() => {
    const normalizedRouteOrderId = normalizeOrderId(routeOrderId);
    if (normalizedRouteOrderId) {
      setTrackedOrderId(normalizedRouteOrderId);
      setTrackingInput(normalizedRouteOrderId);
      setTrackingStarted(true);
    } else {
      setTrackedOrderId('');
      setTrackingInput('');
      setTrackingStarted(false);
    }
  }, [routeOrderId]);

  const currentStatusKey = normalizeStatusKey(orderData?.status);
  const currentStatusIndex = Math.max(statusSteps.findIndex((step) => step.key === currentStatusKey), 0);

  const orderId = orderData?._id || orderData?.id || trackedOrderId || '--';
  const orderItems = orderData?.items || [];

  const timelineWithTime = statusSteps.map((status, index) => ({
    ...status,
    dateTime: (() => {
      const historyDate = (orderData?.trackingHistory || []).find((entry) => normalizeStatusKey(entry?.status) === status.key)?.timestamp;
      if (historyDate) return formatTimelineDate(historyDate);
      if (index === 0) return formatTimelineDate(orderData?.createdAt);
      if (index === currentStatusIndex) return formatTimelineDate(orderData?.statusUpdatedAt || orderData?.updatedAt || orderData?.createdAt);
      if (index < currentStatusIndex) return formatTimelineDate(orderData?.createdAt);
      return '--';
    })()
  }));

  const handleTrackOrder = () => {
    const normalized = normalizeOrderId(trackingInput);
    if (!normalized) {
      setTrackingError('Please enter a valid order ID.');
      setTrackingStarted(false);
      setTrackedOrderId('');
      return;
    }

    setTrackingError('');
    setTrackedOrderId(normalized);
    setTrackingInput(normalized);
    setTrackingStarted(Boolean(normalized));
  };

  const handleTrackSubmit = (event) => {
    event.preventDefault();
    handleTrackOrder();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h1 className="text-3xl font-bold text-primary">Track Your Order</h1>
        <p className="text-gray-600 mt-1">{trackingStarted ? `Order: #${orderId}` : 'Enter your order ID to start tracking.'}</p>

        <div className="mt-5 rounded-xl border border-gray-200 p-4 bg-gray-50">
          <label className="text-sm font-medium text-gray-700">Enter Order Number</label>
          <form onSubmit={handleTrackSubmit} className="mt-2 flex gap-2">
            <input
              type="text"
              value={trackingInput}
              onChange={(event) => {
                setTrackingInput(event.target.value);
                if (trackingError) setTrackingError('');
              }}
              placeholder="e.g. ORD-2024-001"
              className="flex-1 rounded-md border border-gray-300"
            />
            <button
              type="submit"
              disabled={!trackingInput.trim()}
              className={`px-4 py-2 rounded-md font-semibold ${trackingInput.trim() ? 'bg-primary text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            >
              Track
            </button>
          </form>
          {trackingError && <p className="mt-2 text-xs text-red-600">{trackingError}</p>}
          {trackingStarted && (
            <p className="mt-2 text-xs text-gray-500">Real-time updates active • Last sync: {new Date(lastSyncedAt).toLocaleTimeString('en-PK')}</p>
          )}
        </div>

        {trackingStarted && !orderData && (
          <div className="mt-5 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
            No order found for this tracking ID.
          </div>
        )}

        {trackingStarted && orderData && (
          <div className="mt-6 max-w-2xl mx-auto">
            <section>
              <h2 className="text-xl font-bold text-primary mb-3">Order Status Timeline</h2>
              <div className="space-y-3">
                {timelineWithTime.map((step, index) => {
                  const isDone = index <= currentStatusIndex;
                  const isCurrent = index === currentStatusIndex;

                  let cardClasses = '';
                  let textClasses = '';
                  let dateClasses = '';

                  if (isCurrent) {
                    cardClasses = 'border-amber-500/40 bg-amber-500/10';
                    textClasses = 'text-amber-600 dark:text-amber-400';
                    dateClasses = 'text-amber-600/80 dark:text-amber-400/80';
                  } else if (isDone) {
                    cardClasses = 'border-green-500/30 bg-green-500/10';
                    textClasses = 'text-green-600 dark:text-green-400';
                    dateClasses = 'text-green-600/80 dark:text-green-400/80';
                  } else {
                    cardClasses = 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/30';
                    textClasses = 'text-gray-400 dark:text-slate-500';
                    dateClasses = 'text-gray-400 dark:text-slate-500';
                  }

                  return (
                    <motion.div
                      key={step.key}
                      initial={{ opacity: 0, x: -14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25, delay: index * 0.05 }}
                      className={`rounded-lg border p-3 ${cardClasses}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span>{step.icon}</span>
                          <p className={`font-semibold ${textClasses}`}>{step.label}</p>
                        </div>
                        <span className={`text-xs ${dateClasses}`}>{step.dateTime}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-bold text-primary mb-2">Order Items</h3>
                {orderItems.length ? (
                  <div className="space-y-2">
                    {orderItems.map((item) => {
                      const unitPrice = Number(item.salePrice ?? item.price ?? 0);
                      const qty = Number(item.quantity ?? 1);
                      return (
                        <div key={item.id} className="rounded-md border border-gray-200 px-3 py-2 text-sm flex justify-between">
                          <span>{item.name} × {qty}</span>
                          <span className="font-semibold">Rs. {Number(unitPrice * qty).toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No items available for this order.</p>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTracking;