import { API_BASE_URL } from './constants';

// LocalStorage keys for HR modules
export const EMPLOYEES_KEY = 'admin_employees';
export const ATTENDANCE_KEY = 'admin_attendance';
export const PAYROLL_KEY = 'admin_payroll';

// Helper to read from localStorage
export const readStoredData = (key, fallback = []) => {
  try {
    const rawData = localStorage.getItem(key);
    if (!rawData) return fallback;
    const parsed = JSON.parse(rawData);
    return Array.isArray(fallback) ? (Array.isArray(parsed) ? parsed : fallback) : (parsed || fallback);
  } catch (error) {
    return fallback;
  }
};
/**
 * Utility Helper Functions for Mian & Sons Hardware Store
 */

/**
 * Format amount as currency (Pakistani Rupees)
 */
export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return 'Rs. 0.00';
  return `Rs. ${Number(amount).toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Format date as "15 Jan 2024"
 */
export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const options = { day: 'numeric', month: 'short', year: 'numeric' };
  return d.toLocaleDateString('en-GB', options);
};

/**
 * Format date and time as "15 Jan 2024, 3:45 PM"
 */
export const formatDateTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const dateOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
  const formattedDate = d.toLocaleDateString('en-GB', dateOptions);
  const formattedTime = d.toLocaleTimeString('en-US', timeOptions);
  return `${formattedDate}, ${formattedTime}`;
};

/**
 * Generate invoice number with format "INV-2024-001"
 */
export const generateInvoiceNumber = (lastNumber = 0) => {
  const year = new Date().getFullYear();
  const paddedNumber = String(lastNumber + 1).padStart(3, '0');
  return `INV-${year}-${paddedNumber}`;
};

/**
 * Get Tailwind color class based on status
 */
export const getStatusColor = (status) => {
  const statusColors = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    unpaid: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    partial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    'in-stock': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    'low-stock': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    'out-of-stock': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    present: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    absent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    late: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  };
  return statusColors[status?.toLowerCase()] || statusColors.default;
};

/**
 * Truncate text to specified length
 */
export const truncateText = (text, length = 50) => {
  if (!text) return '';
  if (text.length <= length) return text;
  return `${text.substring(0, length)}...`;
};

/**
 * Calculate age from date of birth
 */
export const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return 0;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const calculateDiscount = (price, discountPercent) => {
  return price - (price * discountPercent / 100);
};

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePhone = (phone) => {
  const re = /^[\d\s\-\+\(\)]+$/;
  return re.test(phone);
};

export const getInitials = (name) => {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export const downloadCSV = (data, filename = 'export') => {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};

export const getProfitMargin = (product) => {
  const purchasePrice = Number(product?.purchasePrice);
  const salePrice = Number(product?.salePrice);

  if (!Number.isFinite(purchasePrice) || !Number.isFinite(salePrice) || purchasePrice <= 0) {
    return 0;
  }

  return Number((((salePrice - purchasePrice) / purchasePrice) * 100).toFixed(2));
};

export const handleImageError = (e, productName) => {
  if (!e?.target?.parentElement) return;
  const initial = productName?.charAt(0)?.toUpperCase() || 'P';
  e.target.style.display = 'none';
  e.target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-blue-100 text-blue-800 font-bold text-2xl">${initial}</div>`;
};

export const resolveImageUrl = (imagePath) => {
  if (!imagePath) return '';

  const value = String(imagePath).trim();
  if (!value) return '';
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
    return value;
  }

  if (value.startsWith('/')) {
    return `${API_BASE_URL}${value}`;
  }

  return `${API_BASE_URL}/${value}`;
};

export const getPrimaryProductImage = (product = {}) => {
  if (!product) return '';

  if (typeof product === 'string') {
    return resolveImageUrl(product);
  }

  const candidate =
    (Array.isArray(product.images) && product.images.find(Boolean)) ||
    product.image ||
    product.imageUrl ||
    product.thumbnail ||
    '';

  return resolveImageUrl(candidate);
};

export const getProductImageList = (product = {}) => {
  if (!product) return [];

  const rawImages = Array.isArray(product.images)
    ? product.images
    : [product.image, product.imageUrl, product.thumbnail].filter(Boolean);

  return rawImages.map(resolveImageUrl).filter(Boolean);
};
