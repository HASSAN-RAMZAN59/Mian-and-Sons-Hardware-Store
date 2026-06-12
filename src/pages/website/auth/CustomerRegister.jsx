import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useCustomerAuth } from '../../../context/CustomerAuthContext';
import { checkoutConfigService } from '../../../services/checkoutConfigService';
import api from '../../../services/api';
import useStoreLogo from '../../../hooks/useStoreLogo';
import { showPremiumPrompt } from '../../../utils/premiumDialogs';

const customerTypes = ['Retail', 'Contractor', 'Wholesaler'];
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

const getPasswordChecks = (password) => ({
  isAtLeastEightDigits: password.length >= 8
});

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

const CustomerRegister = () => {
  const navigate = useNavigate();
  const { loginCustomer } = useCustomerAuth();
  const storeLogoUrl = useStoreLogo();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
    city: '',
    customerType: 'Retail',
    acceptTerms: false
  });

  const [errors, setErrors] = useState({});
  const [cities, setCities] = useState([]);
  const passwordChecks = getPasswordChecks(form.password);
  const isStrongPassword = Object.values(passwordChecks).every(Boolean);

  useEffect(() => {
    const loadCities = async () => {
      try {
        const cityRows = await checkoutConfigService.getCities();
        const activeCities = (Array.isArray(cityRows) ? cityRows : [])
          .filter((city) => city?.active !== false)
          .map((city) => city.name)
          .filter(Boolean);

        const mergedCities = [...new Set([...(activeCities.length ? activeCities : []), ...fallbackCities])];
        setCities(mergedCities);
      } catch (error) {
        setCities(fallbackCities);
      }
    };

    loadCities();
  }, []);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '', form: '' }));
  };

  const saveCustomerSession = (customerRecord) => {
    const customerPayload = {
      id: customerRecord.id,
      fullName: customerRecord.fullName,
      name: customerRecord.fullName,
      email: customerRecord.email,
      phone: customerRecord.phone,
      address: customerRecord.address,
      city: customerRecord.city,
      customerType: customerRecord.customerType
    };

    const token = `cust_${customerRecord.id}_${Date.now()}`;
    loginCustomer(customerPayload, token);
  };

  const handleRegister = async (event) => {
    event.preventDefault();

    const nextErrors = {};

    if (!form.fullName.trim()) nextErrors.fullName = 'Full name is required.';
    if (!form.email.trim()) nextErrors.email = 'Email is required.';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = 'Invalid email format.';
    if (!form.phone.trim()) nextErrors.phone = 'Phone is required.';
    if (!form.password) nextErrors.password = 'Password is required.';
    else if (!isStrongPassword) {
      nextErrors.password = 'Password must be at least 8 characters.';
    }
    if (!form.confirmPassword) nextErrors.confirmPassword = 'Confirm your password.';
    if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }
    if (!form.city) nextErrors.city = 'Please select city.';
    if (!form.acceptTerms) nextErrors.acceptTerms = 'You must accept terms.';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      const newUser = await api.post('/customer-auth/register', {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        address: form.address.trim(),
        city: form.city,
        customerType: form.customerType
      });

      saveCustomerSession(newUser.data || {});
      toast.success(`Welcome ${(newUser.data || {}).fullName || form.fullName.trim()}! Your account has been created.`);
      navigate('/');
    } catch (error) {
      const detail = error?.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : 'Registration failed. Please try again.';
      if (message.toLowerCase().includes('email')) {
        setErrors((prev) => ({ ...prev, email: message }));
      } else if (message.toLowerCase().includes('phone')) {
        setErrors((prev) => ({ ...prev, phone: message }));
      } else {
        setErrors((prev) => ({ ...prev, form: message }));
      }
    }
  };



  return (
    <div className="min-h-[80vh] bg-gradient-to-b from-yellow-50 to-yellow-100 py-10 px-4 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-yellow-50 border border-yellow-200 rounded-2xl p-6 sm:p-8 shadow-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-yellow-100 mx-auto flex items-center justify-center mb-3 overflow-hidden">
            <img src={storeLogoUrl} alt="Mian & Sons logo" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Create Customer Account</h1>
          <p className="text-sm text-gray-600 mt-1">Mian & Sons Hardware Store</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Full Name *</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(event) => updateField('fullName', event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300"
              />
              {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300"
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Phone *</label>
              <input
                type="text"
                value={form.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300"
              />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">City</label>
              <select
                value={form.city}
                onChange={(event) => updateField('city', event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300"
              >
                <option value="">Select city</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Password *</label>
              <input
                type="password"
                value={form.password}
                onChange={(event) => updateField('password', event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300"
              />
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
              <ul className="mt-2 space-y-1 text-xs">
                <li className={passwordChecks.isAtLeastEightDigits ? 'text-green-600' : 'text-gray-500'}>
                  Must be at least 8 characters
                </li>
              </ul>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Confirm Password *</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(event) => updateField('confirmPassword', event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300"
              />
              {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Address (optional)</label>
            <textarea
              rows={2}
              value={form.address}
              onChange={(event) => updateField('address', event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Customer Type</label>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {customerTypes.map((type) => (
                <label key={type} className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm">
                  <input
                    type="radio"
                    name="customerType"
                    value={type}
                    checked={form.customerType === type}
                    onChange={(event) => updateField('customerType', event.target.value)}
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.acceptTerms}
              onChange={(event) => updateField('acceptTerms', event.target.checked)}
            />
            I accept Terms & Conditions
          </label>
          {errors.acceptTerms && <p className="text-xs text-red-500 -mt-2">{errors.acceptTerms}</p>}

          <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-semibold hover:from-yellow-500 hover:to-yellow-700">
            Register Now
          </button>


        </form>

        <p className="text-sm text-center text-gray-600 mt-5">
          Already have account?{' '}
          <Link to="/customer/login" className="text-primary font-semibold hover:text-secondary">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default CustomerRegister;