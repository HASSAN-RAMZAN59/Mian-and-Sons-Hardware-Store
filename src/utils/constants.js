/**
 * Application Constants for Mian & Sons Hardware Store
 */

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// User Roles
export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  CASHIER: 'cashier',
  SALESMAN: 'salesman',
};

// Status Options
export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  APPROVED: 'approved',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// Payment Methods
export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'mobile_wallet', label: 'JazzCash/Easypaisa' },
  { value: 'cheque', label: 'Cheque' },
];

// Product Units
export const PRODUCT_UNITS = [
  { value: 'piece', label: 'Piece (Pc)' },
  { value: 'box', label: 'Box' },
  { value: 'carton', label: 'Carton' },
  { value: 'kg', label: 'Kilogram (Kg)' },
  { value: 'meter', label: 'Meter (m)' },
  { value: 'feet', label: 'Feet (ft)' },
  { value: 'liter', label: 'Liter (L)' },
  { value: 'dozen', label: 'Dozen' },
];

// Expense Categories
export const EXPENSE_CATEGORIES = [
  { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Utilities (Electricity, Water)' },
  { value: 'salaries', label: 'Salaries & Wages' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'telephone', label: 'Telephone & Internet' },
  { value: 'misc', label: 'Miscellaneous' },
];

// Leave Types
export const LEAVE_TYPES = [
  { value: 'casual', label: 'Casual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'annual', label: 'Annual Leave' },
  { value: 'emergency', label: 'Emergency Leave' },
  { value: 'unpaid', label: 'Unpaid Leave' },
];

// Designation Options
export const DESIGNATION_OPTIONS = [
  { value: 'manager', label: 'Manager' },
  { value: 'assistant_manager', label: 'Assistant Manager' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'salesman', label: 'Salesman' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'store_keeper', label: 'Store Keeper' },
  { value: 'security_guard', label: 'Security Guard' },
];

// Order Status
export const ORDER_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  RETURNED: 'returned'
};

// Stock Status
export const STOCK_STATUS = {
  IN_STOCK: 'in_stock',
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock'
};

export const DATE_FORMAT = 'DD/MM/YYYY';
export const DATE_TIME_FORMAT = 'DD/MM/YYYY HH:mm';
