import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaBoxOpen, FaClipboardCheck, FaFilePdf, FaTruckFast, FaWhatsapp } from 'react-icons/fa6';
import { jsPDF } from 'jspdf';
import { orderService } from '../../services/orderService';

const OrderSuccess = () => {
  const [latestOrder, setLatestOrder] = useState(null);

  useEffect(() => {
    const loadLatestOrder = async () => {
      const latestOrderId = sessionStorage.getItem('latest_order_id');
      if (!latestOrderId) return;

      try {
        const order = await orderService.getById(latestOrderId);
        setLatestOrder(order || null);
      } catch {
        setLatestOrder(null);
      }
    };

    loadLatestOrder();
  }, []);

  const customerName = latestOrder?.customer?.fullName || 'Customer';
  const orderId = latestOrder?._id || latestOrder?.id || 'ORDER';
  const orderNumber = orderId.startsWith('#') ? orderId : `#${orderId}`;
  const itemCount = latestOrder?.items?.length || 0;
  const total = latestOrder?.totals?.grandTotal || latestOrder?.total || 0;
  const estimatedDelivery = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const handleDownloadInvoice = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Mian & Sons Hardware Store - Invoice', 14, 20);
    doc.setFontSize(11);
    doc.text(`Order Number: ${orderNumber}`, 14, 32);
    doc.text(`Customer: ${customerName}`, 14, 40);
    doc.text(`Items: ${itemCount}`, 14, 48);
    doc.text(`Total: Rs. ${Number(total).toLocaleString()}`, 14, 56);
    doc.text(`Estimated Delivery: ${estimatedDelivery}`, 14, 64);
    doc.text('Thank you for shopping with Mian & Sons Hardware Store!', 14, 78);
    doc.save(`invoice-${orderId}.pdf`);
  };

  const handleShareWhatsApp = () => {
    const message = `My order ${orderNumber} has been placed successfully from Mian & Sons Hardware Store. Total: Rs. ${Number(total).toLocaleString()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white border border-gray-200 rounded-2xl p-6 md:p-10"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: [0.2, 1.06, 1], opacity: 1 }}
            transition={{ duration: 0.7 }}
            className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white shadow-md"
          >
            <FaClipboardCheck className="text-3xl" />
          </motion.div>

          <h1 className="text-3xl font-bold text-primary mt-5">Order Placed Successfully!</h1>
          <p className="text-secondary font-semibold mt-2">Order number: {orderNumber}</p>
          <p className="text-gray-600 mt-2">Thank you {customerName}, your order has been received and is being processed.</p>
        </div>

          <div className="mt-6 grid md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg bg-gray-50 border border-gray-100 p-4">
            <p className="text-gray-500">Items</p>
            <p className="text-xl font-bold text-primary">{itemCount}</p>
          </div>
          <div className="rounded-lg bg-gray-50 border border-gray-100 p-4">
            <p className="text-gray-500">Total</p>
            <p className="text-xl font-bold text-yellow-400 dark:text-yellow-300">Rs. {Number(total).toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-gray-50 border border-gray-100 p-4">
            <p className="text-gray-500">Estimated Delivery</p>
            <p className="text-xl font-bold text-primary">{estimatedDelivery}</p>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-bold text-primary mb-3">What&apos;s Next?</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-gray-200 p-4">
              <FaClipboardCheck className="text-primary mb-2" />
              <p className="font-semibold text-gray-800">Order Verification</p>
              <p className="text-sm text-gray-500">Our team will verify your order shortly.</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <FaBoxOpen className="text-primary mb-2" />
              <p className="font-semibold text-gray-800">Packing</p>
              <p className="text-sm text-gray-500">Items will be packed with proper safety checks.</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <FaTruckFast className="text-primary mb-2" />
              <p className="font-semibold text-gray-800">Delivery</p>
              <p className="text-sm text-gray-500">You will receive updates until delivery is completed.</p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to={`/track-order/${orderId}`} className="px-5 py-3 rounded-md bg-primary text-white font-semibold hover:bg-primary/90">
            Track Your Order
          </Link>
          <Link to="/shop" className="px-5 py-3 rounded-md border border-primary text-primary font-semibold hover:bg-primary hover:text-white">
            Continue Shopping
          </Link>
          <button
            type="button"
            onClick={handleDownloadInvoice}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-md border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
          >
            <FaFilePdf />
            Download Invoice
          </button>
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-green-600 text-white font-semibold hover:bg-green-700"
          >
            <FaWhatsapp />
            Share order on WhatsApp
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default OrderSuccess;