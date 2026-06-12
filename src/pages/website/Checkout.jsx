import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useCart } from '../../context/CartContext';
import { showActionToast } from '../../utils/toastActions';
import { checkoutConfigService } from '../../services/checkoutConfigService';
import { orderService } from '../../services/orderService';

import { FaMoneyBillWave, FaUniversity } from 'react-icons/fa';
import JazzCashLogo from '../../components/icons/JazzCashLogo';
import EasypaisaLogo from '../../components/icons/EasypaisaLogo';

const steps = ['Customer Info', 'Delivery Info', 'Shipping & Payment', 'Confirmation'];
const fallbackCities = [
  'Lahore',
  'Karachi',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Sahiwal',
  'Vehari',
  'Bahawalpur',
  'Rahim Yar Khan',
  'Dera Ghazi Khan',
  'Muzaffargarh',
  'Sargodha',
  'Gujranwala',
  'Gujrat',
  'Sialkot',
  'Narowal',
  'Kasur',
  'Okara',
  'Pakpattan',
  'Jhang',
  'Chiniot',
  'Toba Tek Singh',
  'Sheikhupura',
  'Nankana Sahib',
  'Mianwali',
  'Bhakkar',
  'Khushab',
  'Attock',
  'Jhelum',
  'Chakwal',
  'Hafizabad',
  'Mandi Bahauddin',
  'Layyah',
  'Lodhran',
  'Khanewal'
];
const dynamicPaymentMethods = [
  { id: 'cod', label: 'Cash on Delivery', details: 'Pay in cash when your order arrives.', icon: <FaMoneyBillWave className="text-xl text-green-600" />, type: 'cod' },
  { id: 'bank', label: 'Bank Transfer', details: 'Transfer payment directly to our local bank account.', icon: <FaUniversity className="text-xl text-blue-600" />, type: 'bank' },
  { id: 'jazzcash', label: 'JazzCash', details: 'Securely pay via your JazzCash mobile application.', icon: <JazzCashLogo className="w-8 h-8" />, type: 'jazzcash' },
  { id: 'easypaisa', label: 'Easypaisa', details: 'Securely pay via your Easypaisa mobile application.', icon: <EasypaisaLogo className="w-8 h-8" />, type: 'easypaisa' }
];

const Checkout = () => {
  const navigate = useNavigate();
  const { cartItems, cartTotal, cartDiscount, couponCode, clearCart } = useCart();

  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [deliveryOptions, setDeliveryOptions] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [cities, setCities] = useState([]);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    area: '',
    postalCode: '',
    notes: '',
    deliveryType: 'standard',
    payment: {
      method: 'cod',
      bankName: '',
      accountTitle: '',
      accountNumber: '',
      transactionId: '',
      mobileNumber: ''
    }
  });

  useEffect(() => {
    const customer = JSON.parse(localStorage.getItem('customerUser') || 'null');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const profile = customer || user;

    if (profile) {
      setForm((prev) => ({
        ...prev,
        fullName: profile.fullName || profile.name || prev.fullName,
        email: profile.email || prev.email,
        phone: profile.phone || prev.phone,
        address: profile.address || prev.address,
        city: profile.city || prev.city,
        area: profile.area || prev.area
      }));
    }
  }, []);

  useEffect(() => {
    const loadCheckoutConfig = async () => {
      try {
        const [deliveryRows, paymentRows, cityRows] = await Promise.all([
          checkoutConfigService.getDeliveryOptions(),
          checkoutConfigService.getPaymentMethods(),
          checkoutConfigService.getCities()
        ]);

        const activeDelivery = (Array.isArray(deliveryRows) ? deliveryRows : [])
          .filter((row) => row?.active !== false)
          .map((row, index) => ({
            ...row,
            id: row.id || row._id || row.code || `delivery_${index}`,
            label: row.label || row.name || row.title || 'Delivery'
          }));
        const activePayment = (Array.isArray(paymentRows) ? paymentRows : [])
          .filter((row) => row?.active !== false)
          .map((row, index) => ({
            ...row,
            id: row.id || row._id || row.code || `payment_${index}`,
            label: row.label || row.name || row.title || 'Payment'
          }));
        const activeCities = (Array.isArray(cityRows) ? cityRows : []).filter((row) => row?.active !== false);

        setDeliveryOptions(activeDelivery);
        setPaymentMethods(dynamicPaymentMethods);
        const cityNames = activeCities.map((city) => city.name).filter(Boolean);
        const mergedCities = [...new Set([...(cityNames.length ? cityNames : []), ...fallbackCities])];
        setCities(mergedCities);

        if (activeDelivery.length > 0) {
          setForm((prev) => {
            const currentExists = activeDelivery.some((row) => row.id === prev.deliveryType);
            return { ...prev, deliveryType: currentExists ? prev.deliveryType : (activeDelivery[0].id || '') };
          });
        }
      } catch (error) {
        toast.error('Unable to load checkout configuration.');
        setCities(fallbackCities);
        setPaymentMethods(dynamicPaymentMethods);
      }
    };

    loadCheckoutConfig();
  }, []);

  const selectedDelivery = deliveryOptions.find((item) => item.id === form.deliveryType) || deliveryOptions[0] || null;
  const fallbackDeliveryCharge = cartTotal > 5000 || cartTotal === 0 ? 0 : 250;
  const parsedDeliveryCharge = Number(selectedDelivery?.charge);
  const deliveryCharge = Number.isFinite(parsedDeliveryCharge) ? parsedDeliveryCharge : fallbackDeliveryCharge;
  const grandTotal = Math.max(cartTotal + deliveryCharge, 0);

  const isCustomerLoggedIn = Boolean(localStorage.getItem('customerUser'));

  const validateStep = (stepNumber) => {
    const nextErrors = {};

    if (stepNumber === 1) {
      if (!form.fullName.trim()) nextErrors.fullName = 'Full name is required.';
      if (!form.email.trim()) nextErrors.email = 'Email is required.';
      else if (!/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = 'Enter a valid email.';
      
      const phoneClean = form.phone.trim();
      if (!phoneClean) {
        nextErrors.phone = 'Phone number is required.';
      } else if (!/^03[0-9]{9}$/.test(phoneClean)) {
        nextErrors.phone = 'Invalid format. Must be 03XXXXXXXXX (11 digits).';
      }
    }

    if (stepNumber === 2) {
      if (!form.address.trim()) nextErrors.address = 'Full address is required.';
      if (!form.city) nextErrors.city = 'City is required.';
      if (!form.area.trim()) nextErrors.area = 'Area/Locality is required.';
    }

    if (stepNumber === 3) {
      if (!form.deliveryType) nextErrors.deliveryType = 'Please select a shipping method.';
      if (!form.payment.method) nextErrors.paymentMethod = 'Please select a payment method.';

      if (form.payment.method === 'bank') {
        if (!form.payment.bankName.trim()) nextErrors.bankName = 'Bank name required.';
        if (!form.payment.accountTitle.trim()) nextErrors.accountTitle = 'Account title required.';
        if (!form.payment.accountNumber.trim()) nextErrors.accountNumber = 'Account number required.';
      }

      if (['jazzcash', 'easypaisa'].includes(form.payment.method)) {
        const pMobile = form.payment.mobileNumber.trim();
        if (!pMobile || !/^03[0-9]{9}$/.test(pMobile)) {
          nextErrors.mobileNumber = 'Valid 11-digit mobile number required (03XXXXXXXXX).';
        }
        if (!form.payment.transactionId.trim()) nextErrors.transactionId = 'Transaction ID is required to match payment proof.';
      }
    }



    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const nextStep = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const prevStep = () => {
    setErrors({});
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const placeOrder = async () => {
    if (!validateStep(4)) return;

    const customer = JSON.parse(localStorage.getItem('customerUser') || 'null');
    const customerId = customer?.id || customer?._id || customer?.email || null;

    const order = {
      createdAt: new Date().toISOString(),
      status: 'Pending',
      customer: {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone
      },
      shipping: {
        address: form.address,
        city: form.city,
        area: form.area,
        notes: form.notes,
        postalCode: form.postalCode,
        deliveryType: form.deliveryType,
        deliveryCharge
      },
      payment: {
        method: form.payment.method,
        details: {
          bankName: form.payment.bankName,
          accountTitle: form.payment.accountTitle,
          accountNumber: form.payment.accountNumber,
          transactionId: form.payment.transactionId,
          mobileNumber: form.payment.mobileNumber
        },
        status: 'pending'
      },
      customer_id: customerId,
      items: cartItems.map(item => ({
        product_id: item.id || item._id,
        productId: item.id || item._id,
        quantity: item.quantity,
        unitPrice: item.salePrice ?? item.price,
        price: item.salePrice ?? item.price
      })),
      total: grandTotal,
      totals: {
        subtotal: cartTotal + cartDiscount,
        discount: cartDiscount,
        discountId: couponCode?.id || null,
        delivery: deliveryCharge,
        grandTotal
      },
      source: 'website'
    };

    try {
      console.log('==== SENDING ORDER TO BACKEND ====');
      console.log(JSON.stringify(order, null, 2));
      const createdOrder = await orderService.create(order);
      console.log('==== ORDER CREATED SUCCESSFULLY ====', createdOrder);
      clearCart();
      sessionStorage.setItem('latest_order_id', createdOrder?._id || createdOrder?.id || '');
      // Try to fetch any newly created notifications for this customer immediately
      try {
        const notifyParams = {};
        if (createdOrder?.customer_id) notifyParams.customer_id = createdOrder.customer_id;
        if (createdOrder?.customer?.email) notifyParams.customer_email = String(createdOrder.customer.email).trim().toLowerCase();
        if (createdOrder?.customer?.phone) notifyParams.customer_phone = String(createdOrder.customer.phone).trim();
        const newNotes = await (await import('../../services/notificationService')).notificationService.list(notifyParams);
        window.dispatchEvent(new CustomEvent('notification:new', { detail: { items: newNotes } }));
      } catch (e) {
        // ignore
      }

      // Tell frontend to refresh product catalog/inventory for the ordered products
      try {
        const changedIds = (createdOrder?.items || []).map((it) => it.product_id || it.productId || it.productId);
        window.dispatchEvent(new CustomEvent('products:refresh', { detail: { productIds: changedIds } }));
        // also write to localStorage so other tabs/windows receive a storage event
        try {
          localStorage.setItem('products:refresh', JSON.stringify({ ts: Date.now(), ids: changedIds }));
        } catch (e) {
          // ignore localStorage errors
        }
      } catch (e) {
        // ignore
      }

      // notify other components to refresh as a fallback
      window.dispatchEvent(new Event('notification:refresh'));
      showActionToast('success', 'Order placed successfully.', { path: `/track-order/${createdOrder?._id || createdOrder?.id || ''}` });
      navigate('/order-success');
    } catch (error) {
      console.error('==== FRONTEND ORDER ERROR ====');
      console.error('Error Object:', error);
      console.error('Error Response:', error.response);
      console.error('Error Response Data:', error.response?.data);
      toast.error('Unable to place order. Please try again.');
    }
  };

  const renderStepContent = () => {
    if (currentStep === 1) {
      return (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Full Name</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300"
              />
              {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300"
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Phone Number</label>
            <input
              type="text"
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              placeholder="03XXXXXXXXX"
              className="mt-1 w-full rounded-md border border-gray-300"
            />
            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            <p className="text-xs text-gray-500 mt-1">Must be an 11-digit Pakistani number starting with 03.</p>
          </div>

        </div>
      );
    }

    if (currentStep === 2) {
      return (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Full Address</label>
            <textarea
              rows={3}
              value={form.address}
              onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
              className="mt-1 w-full rounded-md border border-gray-300"
            />
            {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">City</label>
              <select
                value={form.city}
                onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300"
              >
                <option value="">Select City</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Area/Locality</label>
              <input
                type="text"
                value={form.area}
                onChange={(event) => setForm((prev) => ({ ...prev, area: event.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300"
              />
              {errors.area && <p className="text-xs text-red-500 mt-1">{errors.area}</p>}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Postal Code (Optional)</label>
              <input
                type="text"
                value={form.postalCode}
                onChange={(event) => setForm((prev) => ({ ...prev, postalCode: event.target.value }))}
                placeholder="e.g. 54000"
                className="mt-1 w-full rounded-md border border-gray-300"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Delivery Notes (Optional)</label>
              <textarea
                rows={1}
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="Any special instructions?"
                className="mt-1 w-full rounded-md border border-gray-300"
              />
            </div>
          </div>
        </div>
      );
    }

    if (currentStep === 3) {
      return (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-[#0f141b] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <label className="text-sm font-semibold text-slate-200">Shipping Method</label>
                <p className="text-xs text-slate-400 mt-1">Choose a delivery option that fits your timeline and budget.</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#facc15] text-black">Fast checkout ready</span>
            </div>

            <div className="mt-4 grid gap-3">
              {deliveryOptions.map((option) => {
                const isSelected = form.deliveryType === option.id;

                return (
                  <label
                    key={option.id}
                    className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#facc15] bg-[#facc15]/10 shadow-[0_0_0_1px_rgba(250,204,21,0.25)]'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                    }`}
                  >
                    <span className="flex items-center gap-3 text-sm text-slate-200">
                      <input
                        type="radio"
                        name="deliveryType"
                        checked={isSelected}
                        onChange={() => setForm((prev) => ({ ...prev, deliveryType: option.id }))}
                        className="w-4 h-4 text-[#facc15] focus:ring-[#facc15]"
                      />
                      <span className="font-medium text-white">{option.label}</span>
                    </span>
                    <span className={`text-sm font-bold ${isSelected ? 'text-[#facc15]' : 'text-slate-300'}`}>
                      {option.charge === 0 ? 'Free' : `Rs. ${option.charge.toLocaleString()}`}
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.deliveryType && <p className="text-xs text-red-400 mt-2">{errors.deliveryType}</p>}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0f141b] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <label className="text-sm font-semibold text-slate-200">Payment Method</label>
                <p className="text-xs text-slate-400 mt-1">Select a payment method and fill the required details below.</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/5 text-slate-200 border border-white/10">Secure payments</span>
            </div>

            <div className="mt-4 space-y-3">
              {paymentMethods.map((method) => {
                const isSelected = form.payment.method === method.id;

                return (
                  <label
                    key={method.id}
                    className={`block rounded-2xl border p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#facc15] bg-[#facc15]/10 shadow-[0_0_0_1px_rgba(250,204,21,0.18)]'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={isSelected}
                        onChange={() => setForm((prev) => ({ ...prev, payment: { ...prev.payment, method: method.id } }))}
                        className="mt-1 w-4 h-4 text-[#facc15] focus:ring-[#facc15]"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10">
                            {method.icon}
                          </span>
                          <p className="font-semibold text-white">{method.label}</p>
                          {method.id === 'cod' && (
                            <span className="text-[11px] font-semibold bg-[#facc15] text-black px-2.5 py-1 rounded-full">Recommended</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 mt-2">{method.details}</p>

                        {form.payment.method === method.id && method.id === 'bank' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-4 rounded-2xl border border-white/10 bg-[#0b0f14] p-4"
                          >
                            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                              <h4 className="text-xs font-bold text-[#facc15] uppercase tracking-[0.18em]">Our Bank Details</h4>
                              <button type="button" onClick={() => { navigator.clipboard.writeText('0011223344556677'); toast.success('Account number copied!'); }} className="text-xs font-semibold text-[#facc15] hover:text-white transition-colors">Copy Account</button>
                            </div>
                            <div className="text-sm text-slate-300 space-y-2 bg-white/5 p-4 rounded-xl border border-white/10">
                              <p><span className="text-slate-500">Bank:</span> Meezan Bank Limited</p>
                              <p><span className="text-slate-500">Title:</span> Mian & Sons Hardware</p>
                              <p className="font-mono font-medium text-white"><span className="text-slate-500 font-sans">Account:</span> 0011223344556677</p>
                            </div>

                            <h4 className="text-xs font-bold text-[#facc15] uppercase tracking-[0.18em] mb-2 mt-4">Enter Your Transfer Info</h4>
                            <div className="grid gap-3 sm:grid-cols-2 mt-2">
                              <div>
                                <input type="text" placeholder="Your Bank Name" value={form.payment.bankName} onChange={(e) => setForm(prev => ({...prev, payment: {...prev.payment, bankName: e.target.value}}))} className="w-full text-sm rounded-md border-white/10 bg-[#0f141b] text-white placeholder:text-slate-500 focus:border-[#facc15] focus:ring-[#facc15]"/>
                                {errors.bankName && <p className="text-xs text-red-400 mt-1">{errors.bankName}</p>}
                              </div>
                              <div>
                                <input type="text" placeholder="Your Account Title" value={form.payment.accountTitle} onChange={(e) => setForm(prev => ({...prev, payment: {...prev.payment, accountTitle: e.target.value}}))} className="w-full text-sm rounded-md border-white/10 bg-[#0f141b] text-white placeholder:text-slate-500 focus:border-[#facc15] focus:ring-[#facc15]"/>
                                {errors.accountTitle && <p className="text-xs text-red-400 mt-1">{errors.accountTitle}</p>}
                              </div>
                              <div className="sm:col-span-2">
                                <input type="text" placeholder="Your Account Number" value={form.payment.accountNumber} onChange={(e) => setForm(prev => ({...prev, payment: {...prev.payment, accountNumber: e.target.value}}))} className="w-full text-sm rounded-md border-white/10 bg-[#0f141b] text-white placeholder:text-slate-500 focus:border-[#facc15] focus:ring-[#facc15]"/>
                                {errors.accountNumber && <p className="text-xs text-red-400 mt-1">{errors.accountNumber}</p>}
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {form.payment.method === method.id && ['jazzcash', 'easypaisa'].includes(method.id) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-4 rounded-2xl border border-white/10 bg-[#0b0f14] p-4"
                          >
                            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                              <h4 className="text-xs font-bold text-[#facc15] uppercase tracking-[0.18em]">Merchant Instructions</h4>
                              <button type="button" onClick={() => { navigator.clipboard.writeText('03001234567'); toast.success('Number copied!'); }} className="text-xs font-semibold text-[#facc15] hover:text-white transition-colors">Copy Number</button>
                            </div>
                            <div className="text-sm text-slate-300 space-y-2 bg-white/5 p-4 rounded-xl border border-white/10">
                              <p>Please send funds to our <strong className="text-white">{method.label}</strong> business account:</p>
                              <p className="font-mono font-medium text-lg mt-1 tracking-wider text-[#facc15]">0300-1234567</p>
                            </div>

                            <h4 className="text-xs font-bold text-[#facc15] uppercase tracking-[0.18em] mb-2 mt-4">Enter Receipt Info</h4>
                            <div className="grid gap-3 sm:grid-cols-2 mt-2">
                              <div>
                                <input type="text" placeholder="Your Mobile Number" value={form.payment.mobileNumber} onChange={(e) => setForm(prev => ({...prev, payment: {...prev.payment, mobileNumber: e.target.value}}))} className="w-full text-sm rounded-md border-white/10 bg-[#0f141b] text-white placeholder:text-slate-500 focus:border-[#facc15] focus:ring-[#facc15]"/>
                                {errors.mobileNumber && <p className="text-xs text-red-400 mt-1">{errors.mobileNumber}</p>}
                              </div>
                              <div>
                                <input type="text" placeholder="TID / Transaction ID" value={form.payment.transactionId} onChange={(e) => setForm(prev => ({...prev, payment: {...prev.payment, transactionId: e.target.value}}))} className="w-full text-sm rounded-md border-white/10 bg-[#0f141b] text-white placeholder:text-slate-500 focus:border-[#facc15] focus:ring-[#facc15]"/>
                                {errors.transactionId && <p className="text-xs text-red-400 mt-1">{errors.transactionId}</p>}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            {errors.paymentMethod && <p className="text-xs text-red-400 mt-2">{errors.paymentMethod}</p>}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div className="rounded-md border border-gray-200 p-4">
          <h3 className="font-semibold text-primary mb-2">Order Items</h3>
          <div className="space-y-2">
            {cartItems.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {item.name} × {item.quantity}
                </span>
                <span className="font-semibold">Rs. {((item.salePrice ?? item.price) * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-gray-200 p-4 text-sm">
          <h3 className="font-semibold text-primary mb-2">Delivery Details</h3>
          <p>{form.fullName}</p>
          <p>{form.phone}</p>
          <p>{form.address}, {form.area}, {form.city}</p>
          {form.notes && <p className="text-gray-600 mt-1">Notes: {form.notes}</p>}
        </div>

        <div className="rounded-md border border-gray-200 p-4 text-sm">
          <h3 className="font-semibold text-primary mb-2">Payment Method</h3>
          <p>{paymentMethods.find((m) => m.id === form.payment.method)?.label}</p>
        </div>



        <button
          type="button"
          onClick={placeOrder}
          className="w-full py-3 rounded-md bg-secondary text-white text-lg font-bold hover:opacity-90"
        >
          Place Order
        </button>
      </div>
    );
  };

  if (cartItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-primary mb-3">Checkout</h1>
        <p className="text-gray-600 mb-6">Your cart is empty. Add products before checkout.</p>
        <Link to="/shop" className="inline-flex px-6 py-3 rounded-md bg-secondary text-white font-semibold">
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {steps.map((step, index) => {
          const stepNo = index + 1;
          const isActive = currentStep === stepNo;
          const isCompleted = currentStep > stepNo;

          return (
            <div key={step} className={`rounded-md px-3 py-2 text-sm text-center border ${isActive ? 'border-[#facc15] bg-[#facc15] text-black' : isCompleted ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}>
              {stepNo}. {step}
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <section className="lg:col-span-8 bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-xl font-bold text-primary mb-4">Step {currentStep}: {steps[currentStep - 1]}</h2>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`px-5 py-2 rounded-md font-semibold ${currentStep === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              Back
            </button>
            
            {currentStep < 4 && (
              <button
                type="button"
                onClick={nextStep}
                className="px-5 py-2 rounded-md bg-primary text-white font-semibold hover:bg-primary/90"
              >
                Continue
              </button>
            )}
          </div>
        </section>

        <aside className="lg:col-span-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 sticky top-24">
            <h3 className="text-lg font-bold text-primary mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-gray-600">
                  <span className="line-clamp-1 mr-2">{item.name} × {item.quantity}</span>
                  <span>Rs. {((item.salePrice ?? item.price) * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 space-y-2 text-sm">
              <div className="flex items-center justify-between text-gray-600">
                <span>Subtotal</span>
                <span>Rs. {(cartTotal + cartDiscount).toLocaleString()}</span>
              </div>
              {cartDiscount > 0 && (
                <div className="flex items-center justify-between text-green-600">
                  <span>Discount</span>
                  <span>- Rs. {cartDiscount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-gray-600">
                <span>Delivery</span>
                <span>{deliveryCharge === 0 ? 'Free' : `Rs. ${deliveryCharge}`}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
              <span className="font-semibold text-primary">Total</span>
              <span className="text-2xl font-bold text-secondary">Rs. {grandTotal.toLocaleString()}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Checkout;