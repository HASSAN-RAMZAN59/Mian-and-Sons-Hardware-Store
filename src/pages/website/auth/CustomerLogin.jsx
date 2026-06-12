import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useCustomerAuth } from '../../../context/CustomerAuthContext';
import api from '../../../services/api';
import useStoreLogo from '../../../hooks/useStoreLogo';
import { showPremiumPrompt } from '../../../utils/premiumDialogs';
import { FaGoogle, FaFacebookF } from 'react-icons/fa';

const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(email);

const getNameFromEmail = (email) => {
  const localPart = String(email || '').split('@')[0] || 'Customer';
  return localPart
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const CustomerLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginCustomer, refreshCustomerAuth } = useCustomerAuth();
  const storeLogoUrl = useStoreLogo();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState({});

  const saveCustomerSession = (customerRecord) => {
    const customerPayload = {
      id: customerRecord.id,
      fullName: customerRecord.fullName,
      name: customerRecord.fullName,
      email: customerRecord.email,
      phone: customerRecord.phone,
      city: customerRecord.city,
      address: customerRecord.address,
      customerType: customerRecord.customerType
    };

    const token = `cust_${customerRecord.id}_${Date.now()}`;
    loginCustomer(customerPayload, token);
    localStorage.setItem('customerRememberMe', rememberMe ? '1' : '0');
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    const nextErrors = {};
    if (!identifier.trim()) nextErrors.identifier = 'Email or phone is required.';
    if (!password) nextErrors.password = 'Password is required.';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      const response = await api.post('/customer-auth/login', {
        identifier: identifier.trim(),
        password
      });

      const matchedUser = response?.data || null;
      if (!matchedUser) {
        setErrors({ form: 'Invalid credentials. Please try again.' });
        return;
      }

      saveCustomerSession(matchedUser);
      toast.success(`Welcome back, ${matchedUser.fullName || 'Customer'}!`);
      navigate(location.state?.from || '/', { replace: true });
    } catch (error) {
      const resp = error?.response;
      const detail = resp?.data?.detail;
      const message = typeof detail === 'string' ? detail : null;

      // Fallback to showing server message or generic error
      setErrors({ form: message || 'Login failed. Please check credentials or try again later.' });
    }
  };





  return (
    <div className="min-h-[80vh] bg-gradient-to-b from-yellow-50 to-yellow-100 py-12 px-4 flex items-center justify-center">
      <div className="w-full max-w-lg bg-yellow-50 border border-yellow-200 rounded-3xl p-8 sm:p-10 shadow-xl">
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4 overflow-hidden">
            <img src={storeLogoUrl} alt="Mian & Sons logo" className="w-14 h-14 object-contain" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-800">Welcome Back</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to continue to Mian & Sons Hardware</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-gray-700">Email / Phone</label>
            <input
              type="text"
              value={identifier}
              onChange={(event) => {
                setIdentifier(event.target.value);
                setErrors((prev) => ({ ...prev, identifier: '', form: '' }));
              }}
              className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent shadow-sm text-sm"
              placeholder="Enter email or phone"
            />
            {errors.identifier && <p className="text-xs text-red-500 mt-1">{errors.identifier}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setErrors((prev) => ({ ...prev, password: '', form: '' }));
              }}
              className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent shadow-sm text-sm"
              placeholder="Enter password"
            />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="inline-flex items-center gap-2 text-gray-700">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="select-none">Remember me</span>
            </label>

            <Link to="/customer/forgot-password" className="text-orange-600 hover:text-orange-700 font-medium">
              Forgot Password?
            </Link>
          </div>

          {errors.form && <p className="text-sm text-red-500">{errors.form}</p>}

          <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-semibold shadow-md hover:from-yellow-500 hover:to-yellow-700 transition">
            Login
          </button>




        </form>

        <p className="text-sm text-center text-gray-600 mt-6">
          Don&apos;t have an account?{' '}
          <Link to="/customer/register" className="text-orange-600 font-semibold hover:text-orange-700">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default CustomerLogin;