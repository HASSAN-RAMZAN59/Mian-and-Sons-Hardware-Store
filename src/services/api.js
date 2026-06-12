import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

console.log('[api] baseURL:', API_BASE_URL);

const buildFullUrl = (config) => {
  const url = config?.url || '';
  const baseURL = config?.baseURL || API_BASE_URL || '';

  try {
    return new URL(url, baseURL).toString();
  } catch (error) {
    return `${baseURL}${url}`;
  }
};

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const fullUrl = buildFullUrl(config);
    console.log('[api request] method:', (config.method || 'get').toUpperCase());
    console.log('[api request] baseURL:', config.baseURL || API_BASE_URL);
    console.log('[api request] url:', config.url);
    console.log('[api request] fullUrl:', fullUrl);
    console.log('[api request] payload:', config.data);

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[api response error] message:', error.message);
    console.error('[api response error] response:', error.response);

    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      
      // If it's a customer login attempt, let the form handle the 401 error
      if (url.includes('/customer-auth/login') || url.includes('/customer-auth/register')) {
        return Promise.reject(error);
      }
      
      // If it's another customer-auth route that fails with 401, redirect to storefront customer login
      if (url.includes('/customer-auth') || url.includes('/customers/')) {
        localStorage.removeItem('customerToken');
        localStorage.removeItem('customerUser');
        window.location.href = '/customer/login';
        return Promise.reject(error);
      }

      // Otherwise, log out the admin user and redirect to admin login
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
