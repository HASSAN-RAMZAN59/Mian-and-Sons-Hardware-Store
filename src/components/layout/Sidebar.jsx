import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { hasModuleAccess } from '../../utils/permissions';
import useStoreLogo from '../../hooks/useStoreLogo';
import { inventoryService } from '../../services/inventoryService';
import { 
  FaTachometerAlt, FaBoxOpen, FaTags, FaWarehouse, FaBell, 
  FaExclamationTriangle, FaCashRegister, FaShoppingCart, FaUndo,
  FaPercent, FaShoppingBag, FaTruck, FaUsers, FaBook,
  FaMoneyBillWave, FaBookOpen, FaCalendarAlt, FaFileInvoiceDollar,
  FaUserTie, FaClipboardCheck, FaMoneyCheckAlt, FaCalendarCheck,
  FaChartBar, FaChartPie, FaChartLine, FaFileAlt, FaCodeBranch,
  FaUsersCog, FaShieldAlt, FaHistory, FaCog, FaBars, FaChevronLeft,
  FaExchangeAlt
} from 'react-icons/fa';

const Sidebar = ({ isCollapsed = false, onToggle }) => {
  const location = useLocation();
  const { user } = useAuth();
  const [stockAlertCount, setStockAlertCount] = useState(0);
  const storeLogoUrl = useStoreLogo();

  useEffect(() => {
    const resolveAlert = (currentStock, minStock) => {
      const current = Number(currentStock) || 0;
      const min = Number(minStock) || 0;
      if (current === 0) return true;
      if (current <= Math.max(1, Math.floor(min * 0.5))) return true;
      if (current < min) return true;
      return false;
    };

    const loadStockAlertCount = async () => {
      try {
        const inventory = await inventoryService.getAll();
        if (!Array.isArray(inventory)) {
          setStockAlertCount(0);
          return;
        }
        const count = inventory.filter(item => {
          const currentStock = item.quantity ?? item.currentStock ?? 0;
          const minStock = item.minStock ?? (item.product?.minStock) ?? 0;
          return resolveAlert(currentStock, minStock);
        }).length;
        setStockAlertCount(count);
      } catch (error) {
        // fallback to 0 on any error
        setStockAlertCount(0);
      }
    };

    loadStockAlertCount();
    const interval = setInterval(loadStockAlertCount, 30 * 1000);

    return () => clearInterval(interval);
  }, []);
  
  const userRole = user?.role || 'cashier';

  // Helper function to check if user has access to a module
  const canAccess = (module) => {
    return hasModuleAccess(userRole, module);
  };

  // Check if current path matches the link
  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Menu structure with role-based visibility
  const menuSections = [
    {
      title: 'MAIN',
      items: [
        { 
          path: '/admin/dashboard', 
          icon: FaTachometerAlt, 
          label: 'Dashboard',
          module: 'dashboard'
        }
      ]
    },
    {
      title: 'INVENTORY',
      items: [
        { path: '/admin/products', icon: FaBoxOpen, label: 'Products', module: 'products' },
        { path: '/admin/categories', icon: FaTags, label: 'Categories', module: 'categories' },
        { path: '/admin/inventory', icon: FaWarehouse, label: 'Inventory Management', module: 'inventory' },
        { path: '/admin/stock-alerts', icon: FaBell, label: 'Stock Alerts', module: 'inventory', badge: stockAlertCount },
        { path: '/admin/damaged-stock', icon: FaExclamationTriangle, label: 'Damaged Stock', module: 'damaged_stock' }
      ]
    },
    {
      title: 'SALES & BILLING',
      items: [
        { path: '/admin/pos', icon: FaCashRegister, label: 'POS / New Sale', module: 'pos' },
        { path: '/admin/sales', icon: FaShoppingCart, label: 'Sales List', module: 'sales' },
        { path: '/admin/returns', icon: FaUndo, label: 'Returns', module: 'returns' },
        { path: '/admin/discounts', icon: FaPercent, label: 'Discounts', module: 'discounts' }
      ]
    },
    {
      title: 'PURCHASES',
      items: [
        { path: '/admin/purchases', icon: FaShoppingBag, label: 'Purchases', module: 'purchases' },
        { path: '/admin/suppliers', icon: FaTruck, label: 'Suppliers', module: 'suppliers' },
        { path: '/admin/supplier-ledger', icon: FaBook, label: 'Supplier Ledger', module: 'suppliers' }
      ]
    },
    {
      title: 'CUSTOMERS',
      items: [
        { path: '/admin/customers', icon: FaUsers, label: 'Customers', module: 'customers' },
        { path: '/admin/customer-ledger', icon: FaBook, label: 'Customer Ledger', module: 'customers' }
      ]
    },
    {
      title: 'ACCOUNTS',
      items: [
        { path: '/admin/payments', icon: FaMoneyBillWave, label: 'Payments', module: 'payments' },
        { path: '/admin/cash-book', icon: FaBookOpen, label: 'Cash Book', module: 'accounts' },
        { path: '/admin/day-book', icon: FaCalendarAlt, label: 'Day Book', module: 'accounts' },
        { path: '/admin/expenses', icon: FaFileInvoiceDollar, label: 'Expenses', module: 'expenses' }
      ]
    },
    {
      title: 'HR & STAFF',
      showFor: ['superadmin', 'admin', 'manager'],
      items: [
        { path: '/admin/employees', icon: FaUserTie, label: 'Employees', module: 'employees' },
        { path: '/admin/attendance', icon: FaClipboardCheck, label: 'Attendance', module: 'hr' },
        { path: '/admin/payroll', icon: FaMoneyCheckAlt, label: 'Payroll', module: 'payroll' },
        { path: '/admin/leaves', icon: FaCalendarCheck, label: 'Leaves', module: 'hr' }
      ]
    },
    {
      title: 'REPORTS',
      showFor: ['superadmin', 'admin'],
      items: [
        { path: '/admin/reports/sales', icon: FaChartBar, label: 'Sales Report', module: 'reports' },
        { path: '/admin/reports/inventory', icon: FaChartPie, label: 'Inventory Report', module: 'reports' },
        { path: '/admin/reports/financial', icon: FaChartLine, label: 'Financial Report', module: 'reports' },
        { path: '/admin/reports/hr', icon: FaFileAlt, label: 'HR Report', module: 'reports' }
      ]
    },
    {
      title: 'ADMINISTRATION',
      showFor: ['superadmin', 'admin'],
      items: [
        { path: '/admin/branches', icon: FaCodeBranch, label: 'Branches', module: 'branches', showFor: ['superadmin', 'admin'] },
        { path: '/admin/users', icon: FaUsersCog, label: 'Users', module: 'users', showFor: ['superadmin', 'admin'] },
        { path: '/admin/warranties', icon: FaShieldAlt, label: 'Warranties', module: 'warranties', showFor: ['superadmin', 'admin'] },
        { path: '/admin/audit-log', icon: FaHistory, label: 'Audit Logs', module: 'audit_logs', showFor: ['superadmin'] },
        { path: '/admin/settings', icon: FaCog, label: 'Settings', module: 'settings', showFor: ['superadmin'] }
      ]
    }
  ];

  // Filter sections and items based on user role
  const getVisibleSections = () => {
    return menuSections
      .filter(section => !section.showFor || section.showFor.includes(userRole))
      .map(section => ({
        ...section,
        items: section.items.filter(item => {
          // Check item-level role restrictions
          if (item.showFor && !item.showFor.includes(userRole)) {
            return false;
          }
          // Check module access
          return canAccess(item.module);
        })
      }))
      .filter(section => section.items.length > 0);
  };

  const visibleSections = getVisibleSections();

  // Role badge colors
  const getRoleBadgeColor = () => {
    switch(userRole) {
      case 'superadmin': return 'bg-purple-600';
      case 'admin': return 'bg-blue-600';
      case 'manager': return 'bg-green-600';
      case 'cashier': return 'bg-orange-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <aside className={`bg-primary text-white transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'} flex flex-col h-screen sticky top-0`}>
      {/* Header */}
      <div className="p-4 border-b border-blue-800">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <img src={storeLogoUrl} alt="Mian & Sons logo" className="h-9 w-auto object-contain" />
              <p className="text-xs text-blue-200">Hardware Store</p>
            </div>
          )}
          {isCollapsed && (
            <img src={storeLogoUrl} alt="Mian & Sons logo" className="h-8 w-8 object-contain mx-auto" />
          )}
          <button
            onClick={onToggle}
            className="text-white hover:bg-blue-700 p-2 rounded transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <FaBars size={16} /> : <FaChevronLeft size={16} />}
          </button>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-blue-700">
        {visibleSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-4">
            {/* Section Header */}
            {!isCollapsed && (
              <h3 className="px-6 py-2 text-xs font-semibold text-blue-300 uppercase tracking-wider">
                {section.title}
              </h3>
            )}
            {isCollapsed && (
              <div className="border-t border-blue-800 my-2"></div>
            )}

            {/* Menu Items */}
            {section.items.map((item, itemIndex) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <Link
                  key={itemIndex}
                  to={item.path}
                  className={`flex items-center px-6 py-3 hover:bg-blue-700 transition-colors duration-200 relative ${
                    active ? 'bg-blue-700 border-l-4 border-secondary' : ''
                  }`}
                  title={isCollapsed ? item.label : ''}
                >
                  <Icon className={`${isCollapsed ? 'mx-auto' : 'mr-3'} flex-shrink-0`} size={18} />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-sm">{item.label}</span>
                      {item.badge && item.badge > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {isCollapsed && item.badge && item.badge > 0 && (
                    <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Role Badge */}
      <div className="border-t border-blue-800 p-4">
        {!isCollapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center">
                <FaUserTie size={16} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-blue-300 capitalize">{userRole}</p>
              </div>
            </div>
            <span className={`${getRoleBadgeColor()} text-xs px-2 py-1 rounded-full uppercase font-semibold`}>
              {userRole === 'superadmin' ? 'SA' : userRole.charAt(0)}
            </span>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className={`${getRoleBadgeColor()} text-xs px-2 py-1 rounded-full uppercase font-semibold`}>
              {userRole === 'superadmin' ? 'SA' : userRole.charAt(0)}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
