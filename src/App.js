import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, Outlet, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ToastContainer, Slide } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';
import { CustomerAuthProvider, useCustomerAuth } from './context/CustomerAuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { CompareProvider } from './context/CompareContext';
import { hasPermission } from './utils/permissions';

// Layouts
import MainLayout from './layouts/MainLayout';
import WebLayout from './components/website/layout/WebLayout';

// Auth Pages
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import CustomerLogin from './pages/website/auth/CustomerLogin';
import CustomerRegister from './pages/website/auth/CustomerRegister';
import CustomerForgotPassword from './pages/website/auth/CustomerForgotPassword';
import CustomerProfile from './pages/website/auth/CustomerProfile';

// Dashboard
import Dashboard from './pages/dashboard/Dashboard';

// Products
import Products from './pages/products/Products';
import Categories from './pages/products/Categories';

// Inventory
import Inventory from './pages/inventory/Inventory';
import StockAlerts from './pages/inventory/StockAlerts';
import DamagedStock from './pages/inventory/DamagedStock';

// Customers
import Customers from './pages/customers/Customers';
import CustomerLedger from './pages/customers/CustomerLedger';

// Suppliers
import Suppliers from './pages/suppliers/Suppliers';
import SupplierLedger from './pages/suppliers/SupplierLedger';

// Sales
import POS from './pages/sales/POS';
import Sales from './pages/sales/Sales';
import Returns from './pages/returns/Returns';

// Purchases
import Purchases from './pages/purchases/Purchases';

// Payments
import Payments from './pages/payments/Payments';

// Expenses
import Expenses from './pages/expenses/Expenses';

// Accounts
import CashBook from './pages/accounts/CashBook';
import DayBook from './pages/accounts/DayBook';

// Employees
import Employees from './pages/employees/Employees';

// HR
import Attendance from './pages/hr/Attendance';
import Payroll from './pages/hr/Payroll';
import Leaves from './pages/hr/Leaves';

// Branches
import Branches from './pages/branches/Branches';

// Discounts
import Discounts from './pages/discounts/Discounts';

// Warranties
import Warranties from './pages/warranties/Warranties';

// Reports
import SalesReport from './pages/reports/SalesReport';
import InventoryReport from './pages/reports/InventoryReport';
import FinancialReport from './pages/reports/FinancialReport';
import HRReport from './pages/reports/HRReport';

// Users
import Users from './pages/users/Users';

// Audit
import AuditLog from './pages/audit/AuditLog';
import Notifications from './pages/notifications/Notifications';

// Settings
import Settings from './pages/settings/Settings';
import AdminProfile from './pages/profile/AdminProfile';

// Website Pages
import Home from './pages/website/Home';
import Shop from './pages/website/Shop';
import ProductDetail from './pages/website/ProductDetail';
import Cart from './pages/website/Cart';
import Checkout from './pages/website/Checkout';
import OrderSuccess from './pages/website/OrderSuccess';
import OrderTracking from './pages/website/OrderTracking';
import Wishlist from './pages/website/Wishlist';
import Compare from './pages/website/Compare';
import About from './pages/website/About';
import Contact from './pages/website/Contact';
import Brands from './pages/website/Brands';
import MyOrders from './pages/website/MyOrders';
import CustomerService from './pages/website/CustomerService';
import WarrantyClaim from './pages/website/WarrantyClaim';

const WebsiteNotFound = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-orange-50 flex items-center justify-center px-4">
      <div className="max-w-xl w-full bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
        <p className="text-secondary font-semibold tracking-wide">404</p>
        <h1 className="text-3xl md:text-4xl font-bold text-primary mt-2">Page Not Found</h1>
        <p className="text-gray-600 mt-3">
          This page is unavailable right now. Explore our store or continue shopping.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link to="/" className="px-5 py-2.5 rounded-md bg-primary text-white font-semibold hover:bg-blue-800 transition-colors">
            Go to Home
          </Link>
          <Link to="/shop" className="px-5 py-2.5 rounded-md bg-secondary text-white font-semibold hover:bg-orange-600 transition-colors">
            Browse Shop
          </Link>
        </div>
      </div>
    </div>
  );
};

const AdminProtectedRoute = ({ children, permission }) => {
  const { user } = useAuth();
  const parseNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const now = Date.now();

  const localToken = localStorage.getItem('token');
  const localExpiry = parseNumber(localStorage.getItem('tokenExpiresAt'));
  const localUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  })();

  const sessionToken = sessionStorage.getItem('token');
  const sessionExpiry = parseNumber(sessionStorage.getItem('tokenExpiresAt'));
  const sessionUser = (() => {
    try {
      return JSON.parse(sessionStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  })();

  const hasValidLocal = Boolean(localToken && localUser && (!localExpiry || localExpiry > now));
  const hasValidSession = Boolean(sessionToken && sessionUser && (!sessionExpiry || sessionExpiry > now));

  const token = hasValidLocal ? localToken : hasValidSession ? sessionToken : null;
  const storageUser = hasValidLocal ? localUser : hasValidSession ? sessionUser : null;
  const currentUser = user || storageUser;

  if (!token || !currentUser) {
    return <Navigate to="/admin/login" replace />;
  }

  if (permission) {
    const [module, action] = permission.split('.');
    const canAccess = hasPermission(currentUser.role, module, action || 'view');
    if (!canAccess) {
      return <Navigate to="/admin/dashboard" replace />;
    }
  }

  return <MainLayout>{children}</MainLayout>;
};

const CustomerProtectedRoute = ({ children, allowGuest = false }) => {
  const location = useLocation();
  const { isCustomerAuthenticated } = useCustomerAuth();
  const hasCustomerSession = Boolean(
    localStorage.getItem('customerUser') && localStorage.getItem('customerToken')
  );
  const hasGuestSession = localStorage.getItem('customerGuest') === '1';

  if (!isCustomerAuthenticated && !hasCustomerSession && !hasGuestSession) {
    return <Navigate to="/customer/login" replace state={{ from: location.pathname }} />;
  }

  if (hasGuestSession && !allowGuest) {
    return <Navigate to="/customer/login" replace state={{ from: location.pathname }} />;
  }

  return children;
};

const WebsiteRoutesWrapper = () => (
  <CartProvider>
    <WishlistProvider>
      <CompareProvider>
        <WebLayout />
      </CompareProvider>
    </WishlistProvider>
  </CartProvider>
);

const CustomerAccountRoutesWrapper = () => (
  <CartProvider>
    <WishlistProvider>
      <CompareProvider>
        <Outlet />
      </CompareProvider>
    </WishlistProvider>
  </CartProvider>
);

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <AuthProvider>
          <CustomerAuthProvider>
            <Router>
              <div className="App">
                <Routes>
                  <Route element={<WebsiteRoutesWrapper />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/shop" element={<Shop />} />
                    <Route path="/shop/product/:id" element={<ProductDetail />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route
                      path="/checkout"
                      element={(
                        <CustomerProtectedRoute>
                          <Checkout />
                        </CustomerProtectedRoute>
                      )}
                    />
                    <Route path="/order-success" element={<OrderSuccess />} />
                    <Route path="/track-order" element={<OrderTracking />} />
                    <Route path="/track-order/:orderId" element={<OrderTracking />} />
                    <Route path="/wishlist" element={<Wishlist />} />
                    <Route path="/compare" element={<Compare />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/brands" element={<Brands />} />
                    <Route path="/customer-service" element={<CustomerService />} />
                    <Route path="/warranty-claim" element={<WarrantyClaim />} />
                  </Route>

                  <Route path="/customer/login" element={<CustomerLogin />} />
                  <Route path="/customer/register" element={<CustomerRegister />} />
                  <Route path="/customer/forgot-password" element={<CustomerForgotPassword />} />
                  <Route path="/website/auth/login" element={<Navigate to="/customer/login" replace />} />
                  <Route path="/website/auth/register" element={<Navigate to="/customer/register" replace />} />
                  <Route element={<CustomerAccountRoutesWrapper />}>
                    <Route
                      path="/customer/account"
                      element={(
                        <CustomerProtectedRoute>
                          <CustomerProfile />
                        </CustomerProtectedRoute>
                      )}
                    />
                    <Route
                      path="/customer/orders"
                      element={(
                        <CustomerProtectedRoute>
                          <MyOrders />
                        </CustomerProtectedRoute>
                      )}
                    />
                  </Route>

                  <Route path="/admin/login" element={<Login />} />
                  <Route path="/admin/forgot-password" element={<ForgotPassword />} />
                  <Route path="/login" element={<Navigate to="/admin/login" replace />} />
                  <Route path="/forgot-password" element={<Navigate to="/admin/forgot-password" replace />} />
                  <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="/pos" element={<Navigate to="/admin/pos" replace />} />
                  <Route path="/change-password" element={<Navigate to="/admin/profile" replace />} />
                  <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

                  <Route
                    path="/admin/dashboard"
                    element={(
                      <AdminProtectedRoute>
                        <Dashboard />
                      </AdminProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin/profile"
                    element={(
                      <AdminProtectedRoute>
                        <AdminProfile />
                      </AdminProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin/products"
                    element={(
                      <AdminProtectedRoute permission="products.view">
                        <Products />
                      </AdminProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin/categories"
                    element={(
                      <AdminProtectedRoute permission="categories.view">
                        <Categories />
                      </AdminProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin/inventory"
                    element={(
                      <AdminProtectedRoute permission="inventory.view">
                        <Inventory />
                      </AdminProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin/stock-alerts"
                    element={(
                      <AdminProtectedRoute permission="inventory.view">
                        <StockAlerts />
                      </AdminProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin/damaged-stock"
                    element={(
                      <AdminProtectedRoute permission="damaged_stock.view">
                        <DamagedStock />
                      </AdminProtectedRoute>
                    )}
                  />

                  <Route
                    path="/admin/pos"
                    element={(
                      <AdminProtectedRoute permission="pos.view">
                        <POS />
                      </AdminProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin/sales"
                    element={(
                      <AdminProtectedRoute permission="sales.view">
                        <Sales />
                      </AdminProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin/returns"
                    element={(
                      <AdminProtectedRoute permission="returns.view">
                        <Returns />
                      </AdminProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin/discounts"
                    element={(
                      <AdminProtectedRoute permission="discounts.view">
                        <Discounts />
                      </AdminProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin/purchases"
                    element={(
                      <AdminProtectedRoute permission="purchases.view">
                        <Purchases />
                      </AdminProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin/suppliers"
                    element={(
                      <AdminProtectedRoute permission="suppliers.view">
                        <Suppliers />
                      </AdminProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin/supplier-ledger"
                    element={(
                      <AdminProtectedRoute permission="suppliers.view">
                        <SupplierLedger />
                      </AdminProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin/customers"
                    element={(
                      <AdminProtectedRoute permission="customers.view">
                        <Customers />
                      </AdminProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin/customer-ledger"
                    element={(
                      <AdminProtectedRoute permission="customers.view">
                        <CustomerLedger />
                      </AdminProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin/payments"
                    element={(
                      <AdminProtectedRoute permission="payments.view">
                        <Payments />
                      </AdminProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin/cash-book"
                    element={(
                      <AdminProtectedRoute permission="accounts.view">
                        <CashBook />
                      </AdminProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin/day-book"
                    element={(
                      <AdminProtectedRoute permission="accounts.view">
                        <DayBook />
                      </AdminProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin/expenses"
                    element={(
                      <AdminProtectedRoute permission="expenses.view">
                        <Expenses />
                      </AdminProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin/employees"
                    element={(
                      <AdminProtectedRoute permission="employees.view">
                        <Employees />
                      </AdminProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin/attendance"
                    element={(
                      <AdminProtectedRoute permission="hr.view">
                        <Attendance />
                      </AdminProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin/payroll"
                    element={(
                      <AdminProtectedRoute permission="payroll.view">
                        <Payroll />
                      </AdminProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin/leaves"
                    element={(
                      <AdminProtectedRoute permission="hr.view">
                        <Leaves />
                      </AdminProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin/branches"
                    element={(
                      <AdminProtectedRoute permission="branches.view">
                        <Branches />
                      </AdminProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin/warranties"
                    element={(
                      <AdminProtectedRoute permission="warranties.view">
                        <Warranties />
                      </AdminProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin/reports/sales"
                    element={(
                      <AdminProtectedRoute permission="reports.view">
                        <SalesReport />
                      </AdminProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin/reports/inventory"
                    element={(
                      <AdminProtectedRoute permission="reports.view">
                        <InventoryReport />
                      </AdminProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin/reports/financial"
                    element={(
                      <AdminProtectedRoute permission="reports.view">
                        <FinancialReport />
                      </AdminProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin/reports/hr"
                    element={(
                      <AdminProtectedRoute permission="reports.view">
                        <HRReport />
                      </AdminProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin/users"
                    element={(
                      <AdminProtectedRoute permission="users.view">
                        <Users />
                      </AdminProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin/audit-log"
                    element={(
                      <AdminProtectedRoute permission="audit_logs.view">
                        <AuditLog />
                      </AdminProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin/settings"
                    element={(
                      <AdminProtectedRoute permission="settings.view">
                        <Settings />
                      </AdminProtectedRoute>
                    )}
                  />
                  <Route
                    path="/admin/notifications"
                    element={(
                      <AdminProtectedRoute permission="dashboard.view">
                        <Notifications />
                      </AdminProtectedRoute>
                    )}
                  />

                  <Route path="*" element={<WebsiteNotFound />} />
                </Routes>

                <ToastContainer
                  position="top-right"
                  autoClose={3200}
                  hideProgressBar={false}
                  newestOnTop
                  closeOnClick
                  rtl={false}
                  pauseOnFocusLoss
                  draggable
                  pauseOnHover
                  theme="light"
                  transition={Slide}
                  limit={4}
                  className="premium-toast-container !top-4 !right-4"
                  toastClassName={(context) => {
                    const base = 'premium-toast-card rounded-2xl border px-4 py-3.5 min-h-0 shadow-[0_18px_50px_rgba(15,23,42,0.16)] backdrop-blur-xl';

                    if (context?.type === 'success') return `${base} premium-toast-success border-yellow-400/60`;
                    if (context?.type === 'error') return `${base} premium-toast-error border-yellow-400/60`;
                    if (context?.type === 'warning') return `${base} premium-toast-warning border-black/80`;
                    if (context?.type === 'info') return `${base} premium-toast-info border-yellow-400/60`;
                    return `${base} border-yellow-400/60`;
                  }}
                  bodyClassName="premium-toast-body text-sm font-medium m-0 p-0"
                  progressClassName="premium-toast-progress !h-1.5"
                />
              </div>
            </Router>
          </CustomerAuthProvider>
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
