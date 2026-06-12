import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaExclamationCircle, FaShieldAlt, FaUserCheck } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { customerService } from '../../services/customerService';
import { productService } from '../../services/productService';
import { warrantyService } from '../../services/warrantyService';

const addOneYear = (dateValue) => {
  const date = new Date(dateValue);
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString();
};

const WarrantyClaim = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('productId') || '';
  const { customerUser, isCustomerAuthenticated } = useCustomerAuth();

  const [product, setProduct] = useState(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(Boolean(productId));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    serialNo: '',
    issue: '',
    description: '',
    claimDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const loadProduct = async () => {
      if (!productId) {
        setIsLoadingProduct(false);
        return;
      }

      try {
        const data = await productService.getById(productId);
        setProduct(data);
      } catch (error) {
        console.error(error);
        toast.error('Product details load nahi ho saki.');
      } finally {
        setIsLoadingProduct(false);
      }
    };

    loadProduct();
  }, [productId]);

  const selectedProductId = useMemo(() => product?.id || product?._id || productId, [product, productId]);

  const resolveBackendCustomer = async () => {
    const profile = customerUser || {};
    const profileEmail = String(profile.email || '').trim().toLowerCase();
    const profilePhone = String(profile.phone || '').trim();

    const customers = await customerService.getAll();
    const matchedCustomer = Array.isArray(customers)
      ? customers.find((customer) => {
          const customerEmail = String(customer.email || '').trim().toLowerCase();
          const customerPhone = String(customer.phone || '').trim();
          return (profileEmail && customerEmail === profileEmail) || (profilePhone && customerPhone === profilePhone);
        })
      : null;

    if (matchedCustomer?.id || matchedCustomer?._id) {
      return matchedCustomer.id || matchedCustomer._id;
    }

    if (!profile.fullName && !profile.name) {
      throw new Error('Customer profile is missing a name.');
    }

    if (!profilePhone) {
      throw new Error('Customer phone number is required to submit a claim.');
    }

    const createdCustomer = await customerService.create({
      fullName: profile.fullName || profile.name,
      phone: profilePhone,
      email: profile.email || '',
      address: profile.address || '',
      city: profile.city || 'Lahore',
      customerType: profile.customerType || 'Retail'
    });

    return createdCustomer.id || createdCustomer._id;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isCustomerAuthenticated || !customerUser?.id) {
      toast.error('Warranty claim ke liye customer login required hai.');
      return;
    }

    if (!selectedProductId) {
      toast.error('Product could not be loaded.');
      return;
    }

    if (!form.issue.trim() || !form.description.trim()) {
      toast.error('Issue and description are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const backendCustomerId = await resolveBackendCustomer();

      await warrantyService.create({
        product_id: selectedProductId,
        customer_id: backendCustomerId,
        sale_id: null,
        serial_no: form.serialNo.trim() || undefined,
        start_date: form.claimDate,
        end_date: addOneYear(form.claimDate),
        status: 'Pending',
        details: form.description.trim(),
        claimHistory: [
          {
            claimDate: form.claimDate,
            issue: form.issue.trim(),
            description: form.description.trim(),
            status: 'Pending'
          }
        ]
      });

      toast.success('Warranty claim submitted successfully!');
      navigate('/');
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.detail || 'Unable to submit warranty claim.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-amber-50">
      <Helmet>
        <title>Warranty Claim | Mian & Sons Hardware</title>
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <Link to="/shop" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-secondary transition-colors">
          <FaArrowLeft /> Back to Shop
        </Link>

        <div className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 md:p-8">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <FaShieldAlt size={22} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Warranty Claim Form</h1>
                <p className="text-sm text-gray-600 mt-1">Storefront se claim submit karein, phir woh admin warranties me show hoga.</p>
              </div>
            </div>

            {!isCustomerAuthenticated && (
              <div className="mt-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
                <FaExclamationCircle className="mt-1" />
                <div>
                  <p className="font-semibold">Customer login required</p>
                  <p className="text-sm mt-1">Claim submit karne ke liye pehle customer login karein.</p>
                  <Link to="/customer/login" className="inline-flex mt-3 px-4 py-2 rounded-lg bg-secondary text-white font-semibold">
                    Go to Login
                  </Link>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Product</span>
                  <input
                    value={isLoadingProduct ? 'Loading product...' : (product?.name || productId || '')}
                    readOnly
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Serial Number</span>
                  <input
                    value={form.serialNo}
                    onChange={(event) => setForm((prev) => ({ ...prev, serialNo: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
                    placeholder="Optional"
                  />
                </label>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Claim Date</span>
                  <input
                    type="date"
                    value={form.claimDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, claimDate: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Customer</span>
                  <input
                    value={customerUser?.fullName || customerUser?.name || 'Customer'}
                    readOnly
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">Issue</span>
                <input
                  value={form.issue}
                  onChange={(event) => setForm((prev) => ({ ...prev, issue: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
                  placeholder="Example: Product not working properly"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">Description</span>
                <textarea
                  rows={5}
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm resize-none"
                  placeholder="Briefly explain the issue and what happened"
                />
              </label>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !isCustomerAuthenticated || !selectedProductId}
                  className="px-5 py-3 rounded-xl bg-secondary text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Warranty Claim'}
                </button>
                <Link to="/customer-service#warranty-info" className="px-5 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold">
                  Read Warranty Policy
                </Link>
              </div>
            </form>
          </section>

          <aside className="space-y-4">
            <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-white/10 flex items-center justify-center">
                  <FaUserCheck />
                </div>
                <div>
                  <p className="text-sm text-white/70">Logged in as</p>
                  <p className="font-semibold">{customerUser?.fullName || customerUser?.name || 'Customer'}</p>
                </div>
              </div>
              <div className="mt-5 text-sm text-white/80 space-y-2">
                <p>• Claim sirf storefront se submit hogi.</p>
                <p>• Admin panel me sirf submitted claims show hongi.</p>
                <p>• Product page se direct claim link available hai.</p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
              <h2 className="font-semibold text-gray-900">Need help?</h2>
              <p className="text-sm text-gray-600 mt-2">
                Agar product load nahi ho raha, product page se claim button use karein ya shop me product open karein.
              </p>
              <Link to="/shop" className="inline-flex mt-4 px-4 py-2 rounded-lg bg-primary text-white font-semibold">
                Browse Products
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default WarrantyClaim;
