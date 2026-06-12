// Role-Based Access Control Configuration for Mian & Sons Hardware Store

// Define user roles
export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  CASHIER: 'cashier'
};

// Define all modules in the system
export const MODULES = {
  DASHBOARD: 'dashboard',
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  CUSTOMERS: 'customers',
  SUPPLIERS: 'suppliers',
  SALES: 'sales',
  PURCHASES: 'purchases',
  PAYMENTS: 'payments',
  POS: 'pos',
  INVENTORY: 'inventory',
  EMPLOYEES: 'employees',
  HR: 'hr',
  PAYROLL: 'payroll',
  BRANCHES: 'branches',
  DISCOUNTS: 'discounts',
  RETURNS: 'returns',
  DAMAGED_STOCK: 'damaged_stock',
  EXPENSES: 'expenses',
  WARRANTIES: 'warranties',
  ACCOUNTS: 'accounts',
  REPORTS: 'reports',
  USERS: 'users',
  AUDIT_LOGS: 'audit_logs',
  SETTINGS: 'settings'
};

// Define possible actions
export const ACTIONS = {
  VIEW: 'view',
  CREATE: 'create',
  EDIT: 'edit',
  DELETE: 'delete',
  EXPORT: 'export'
};

// Complete permissions configuration
export const PERMISSIONS = {
  // SUPERADMIN - Full access to everything
  superadmin: {
    dashboard: ['view', 'create', 'edit', 'delete', 'export'],
    products: ['view', 'create', 'edit', 'delete', 'export'],
    categories: ['view', 'create', 'edit', 'delete', 'export'],
    customers: ['view', 'create', 'edit', 'delete', 'export'],
    suppliers: ['view', 'create', 'edit', 'delete', 'export'],
    sales: ['view', 'create', 'edit', 'delete', 'export'],
    purchases: ['view', 'create', 'edit', 'delete', 'export'],
    payments: ['view', 'create', 'edit', 'delete', 'export'],
    pos: ['view', 'create', 'edit', 'delete', 'export'],
    inventory: ['view', 'create', 'edit', 'delete', 'export'],
    employees: ['view', 'create', 'edit', 'delete', 'export'],
    hr: ['view', 'create', 'edit', 'delete', 'export'],
    payroll: ['view', 'create', 'edit', 'delete', 'export'],
    branches: ['view', 'create', 'edit', 'delete', 'export'],
    discounts: ['view', 'create', 'edit', 'delete', 'export'],
    returns: ['view', 'create', 'edit', 'delete', 'export'],
    damaged_stock: ['view', 'create', 'edit', 'delete', 'export'],
    expenses: ['view', 'create', 'edit', 'delete', 'export'],
    warranties: ['view', 'create', 'edit', 'delete', 'export'],
    accounts: ['view', 'create', 'edit', 'delete', 'export'],
    reports: ['view', 'create', 'edit', 'delete', 'export'],
    users: ['view', 'create', 'edit', 'delete', 'export'],
    audit_logs: ['view', 'create', 'edit', 'delete', 'export'],
    settings: ['view', 'create', 'edit', 'delete', 'export']
  },

  // ADMIN - Access to all except system settings and audit logs
  admin: {
    dashboard: ['view', 'create', 'edit', 'delete', 'export'],
    products: ['view', 'create', 'edit', 'delete', 'export'],
    categories: ['view', 'create', 'edit', 'delete', 'export'],
    customers: ['view', 'create', 'edit', 'delete', 'export'],
    suppliers: ['view', 'create', 'edit', 'delete', 'export'],
    sales: ['view', 'create', 'edit', 'delete', 'export'],
    purchases: ['view', 'create', 'edit', 'delete', 'export'],
    payments: ['view', 'create', 'edit', 'delete', 'export'],
    pos: ['view', 'create', 'edit', 'delete', 'export'],
    inventory: ['view', 'create', 'edit', 'delete', 'export'],
    employees: ['view', 'create', 'edit', 'delete', 'export'],
    hr: ['view', 'create', 'edit', 'delete', 'export'],
    payroll: ['view', 'create', 'edit', 'delete', 'export'],
    branches: ['view', 'create', 'edit', 'delete', 'export'],
    discounts: ['view', 'create', 'edit', 'delete', 'export'],
    returns: ['view', 'create', 'edit', 'delete', 'export'],
    damaged_stock: ['view', 'create', 'edit', 'delete', 'export'],
    expenses: ['view', 'create', 'edit', 'delete', 'export'],
    warranties: ['view', 'create', 'edit', 'delete', 'export'],
    accounts: ['view', 'create', 'edit', 'delete', 'export'],
    reports: ['view', 'create', 'edit', 'delete', 'export'],
    users: [],
    audit_logs: [],
    settings: []
  },

  // MANAGER - View/create/edit on sales, purchases, inventory, customers, suppliers
  // View only on other operational modules, no access to users/settings
  manager: {
    dashboard: ['view', 'export'],
    products: ['view', 'export'],
    categories: ['view', 'export'],
    customers: ['view', 'create', 'edit', 'export'],
    suppliers: ['view', 'create', 'edit', 'export'],
    sales: ['view', 'create', 'edit', 'export'],
    purchases: ['view', 'create', 'edit', 'export'],
    payments: ['view', 'export'],
    pos: ['view'],
    inventory: ['view', 'create', 'edit', 'export'],
    employees: [],
    hr: ['view', 'export'],
    payroll: [],
    branches: ['view', 'export'],
    discounts: ['view', 'export'],
    returns: ['view', 'export'],
    damaged_stock: ['view', 'export'],
    expenses: ['view', 'export'],
    warranties: ['view', 'export'],
    accounts: ['view', 'export'],
    reports: ['view', 'export'],
    users: [],
    audit_logs: [],
    settings: []
  },

  // CASHIER - Only view/create on sales and pos, view only on products and customers
  cashier: {
    dashboard: ['view'],
    products: ['view'],
    categories: [],
    customers: ['view'],
    suppliers: [],
    sales: ['view', 'create'],
    purchases: [],
    payments: [],
    pos: ['view', 'create'],
    inventory: [],
    employees: [],
    hr: [],
    branches: [],
    discounts: [],
    returns: [],
    damaged_stock: [],
    expenses: [],
    warranties: [],
    accounts: [],
    reports: [],
    users: [],
    audit_logs: [],
    settings: []
  }
};

/**
 * Check if a user role has permission to perform an action on a module
 * @param {string} role - User role (superadmin, admin, manager, cashier)
 * @param {string} module - Module name (dashboard, products, etc.)
 * @param {string} action - Action type (view, create, edit, delete, export)
 * @returns {boolean} - True if permission granted, false otherwise
 */
export const hasPermission = (role, module, action) => {
  // Validate inputs
  if (!role || !module || !action) {
    return false;
  }

  // Convert to lowercase for case-insensitive comparison
  const normalizedRole = role.toLowerCase();
  const normalizedModule = module.toLowerCase();
  const normalizedAction = action.toLowerCase();

  // Check if role exists in permissions
  if (!PERMISSIONS[normalizedRole]) {
    console.warn(`Role "${role}" not found in permissions`);
    return false;
  }

  // Check if module exists for this role
  if (!PERMISSIONS[normalizedRole][normalizedModule]) {
    return false;
  }

  // Check if action is allowed for this role and module
  return PERMISSIONS[normalizedRole][normalizedModule].includes(normalizedAction);
};

/**
 * Get all permissions for a specific role
 * @param {string} role - User role
 * @returns {object} - Object containing all module permissions for the role
 */
export const getRolePermissions = (role) => {
  const normalizedRole = role?.toLowerCase();
  return PERMISSIONS[normalizedRole] || {};
};

/**
 * Get all allowed actions for a role on a specific module
 * @param {string} role - User role
 * @param {string} module - Module name
 * @returns {array} - Array of allowed actions
 */
export const getModuleActions = (role, module) => {
  const normalizedRole = role?.toLowerCase();
  const normalizedModule = module?.toLowerCase();
  
  if (!PERMISSIONS[normalizedRole] || !PERMISSIONS[normalizedRole][normalizedModule]) {
    return [];
  }
  
  return PERMISSIONS[normalizedRole][normalizedModule];
};

/**
 * Check if user has any access to a module (any action allowed)
 * @param {string} role - User role
 * @param {string} module - Module name
 * @returns {boolean} - True if user has any access to the module
 */
export const hasModuleAccess = (role, module) => {
  const actions = getModuleActions(role, module);
  return actions.length > 0;
};

/**
 * Get list of all modules accessible by a role
 * @param {string} role - User role
 * @returns {array} - Array of accessible module names
 */
export const getAccessibleModules = (role) => {
  const rolePermissions = getRolePermissions(role);
  return Object.keys(rolePermissions).filter(module => 
    rolePermissions[module].length > 0
  );
};
