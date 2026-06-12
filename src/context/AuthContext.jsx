import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();
const REMEMBER_ME_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const NON_REMEMBER_TTL_MS = 24 * 60 * 60 * 1000;

const parseNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for stored user data on mount
  useEffect(() => {
    const sessionUser = sessionStorage.getItem('user');
    const sessionToken = sessionStorage.getItem('token');
    const sessionExpiry = parseNumber(sessionStorage.getItem('tokenExpiresAt'));
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    const storedExpiry = parseNumber(localStorage.getItem('tokenExpiresAt'));

    const now = Date.now();

    if (storedUser && storedToken) {
      if (storedExpiry && storedExpiry <= now) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('tokenExpiresAt');
      } else {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
        return;
      }
    }

    if (sessionUser && sessionToken) {
      if (sessionExpiry && sessionExpiry <= now) {
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('tokenExpiresAt');
      } else {
        setUser(JSON.parse(sessionUser));
        setIsAuthenticated(true);
      }
    }
  }, []);

  // Inactivity auto-logout hook
  useEffect(() => {
    if (!isAuthenticated) return;

    const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
    let timeoutId;

    const handleLogout = () => {
      logout();
    };

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleLogout, INACTIVITY_TIMEOUT_MS);
    };

    resetTimer();

    const activityEvents = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isAuthenticated]);

  const login = (userData, rememberMe = false) => {
    setUser(userData);
    setIsAuthenticated(true);
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('tokenExpiresAt');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('tokenExpiresAt');

    const storage = rememberMe ? localStorage : sessionStorage;
    const ttl = rememberMe ? REMEMBER_ME_TTL_MS : NON_REMEMBER_TTL_MS;
    const expiresAt = Date.now() + ttl;
    storage.setItem('user', JSON.stringify(userData));
    storage.setItem('token', userData.token);
    storage.setItem('tokenExpiresAt', String(expiresAt));
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    // Clear localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('tokenExpiresAt');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('tokenExpiresAt');
  };

  // Permission checking function
  const checkPermission = (module, action) => {
    if (!user) return false;
    
    // Superadmin has all permissions
    if (user.role === 'superadmin') return true;
    
    // Admin has most permissions
    if (user.role === 'admin') {
      // Admin cannot delete critical data
      if (action === 'delete' && ['users', 'settings'].includes(module)) {
        return false;
      }
      return true;
    }
    
    // Manager has limited permissions
    if (user.role === 'manager') {
      const managerPermissions = {
        dashboard: ['read'],
        products: ['read', 'create', 'update'],
        categories: ['read', 'create', 'update'],
        inventory: ['read', 'update'],
        customers: ['read', 'create', 'update'],
        suppliers: ['read', 'create', 'update'],
        sales: ['read', 'create'],
        pos: ['read', 'create'],
        purchases: ['read', 'create'],
        returns: ['read', 'create'],
        payments: ['read', 'create']
      };
      return managerPermissions[module]?.includes(action) || false;
    }
    
    // Cashier has minimal permissions
    if (user.role === 'cashier') {
      const cashierPermissions = {
        pos: ['read', 'create'],
        sales: ['read'],
        customers: ['read']
      };
      return cashierPermissions[module]?.includes(action) || false;
    }
    
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, checkPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
