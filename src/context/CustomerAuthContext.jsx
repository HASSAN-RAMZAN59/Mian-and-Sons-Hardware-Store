import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const CustomerAuthContext = createContext();

export const CustomerAuthProvider = ({ children }) => {
  const [customerUser, setCustomerUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('customerUser') || 'null');
    } catch {
      return null;
    }
  });

  const [customerToken, setCustomerToken] = useState(() => localStorage.getItem('customerToken'));

  const refreshCustomerAuth = useCallback(() => {
    try {
      setCustomerUser(JSON.parse(localStorage.getItem('customerUser') || 'null'));
    } catch {
      setCustomerUser(null);
    }
    setCustomerToken(localStorage.getItem('customerToken'));
  }, []);

  const loginCustomer = useCallback((user, token) => {
    localStorage.setItem('customerUser', JSON.stringify(user));
    localStorage.setItem('customerToken', token);
    localStorage.removeItem('customerGuest');
    refreshCustomerAuth();
  }, [refreshCustomerAuth]);

  const logoutCustomer = useCallback(() => {
    localStorage.removeItem('customerUser');
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customerGuest');
    localStorage.removeItem('website_cart');
    refreshCustomerAuth();
  }, [refreshCustomerAuth]);

  useEffect(() => {
    const handleStorage = () => refreshCustomerAuth();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refreshCustomerAuth]);

  // Inactivity auto-logout hook for customers
  useEffect(() => {
    if (!customerUser) return;

    const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
    let timeoutId;

    const handleLogout = () => {
      logoutCustomer();
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
  }, [customerUser, logoutCustomer]);

  const value = useMemo(
    () => ({
      customerUser,
      customerToken,
      isCustomerAuthenticated: Boolean(customerUser && customerToken),
      loginCustomer,
      logoutCustomer,
      refreshCustomerAuth
    }),
    [customerUser, customerToken, loginCustomer, logoutCustomer, refreshCustomerAuth]
  );

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
};

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
};

export default CustomerAuthContext;
