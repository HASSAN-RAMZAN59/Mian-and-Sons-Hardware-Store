import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FaBars,
  FaChevronDown,
  FaFacebookF,
  FaHeart,
  FaInstagram,
  FaBell,
  FaSearch,
  FaShoppingCart,
  FaBalanceScale,
  FaUser,
  FaWhatsapp
} from 'react-icons/fa';
import { useCart } from '../../../context/CartContext';
import { useWishlist } from '../../../context/WishlistContext';
import { useCustomerAuth } from '../../../context/CustomerAuthContext';
import { useCompare } from '../../../context/CompareContext';
import useProductsCatalog from '../../../hooks/useProductsCatalog';
import useStoreLogo from '../../../hooks/useStoreLogo';
import MobileMenu from './MobileMenu';
import { notificationService } from '../../../services/notificationService';
import { customerService } from '../../../services/customerService';

const buildSearchProducts = (productsData) => productsData.map((product) => ({
  id: String(product.id),
  name: product.size ? `${product.name} - ${product.size}` : product.name,
  category: product.category,
  brand: product.company,
  stock: Number(product.stockQty ?? product.stock ?? 0)
}));

const normalizeCategoryLabel = (value) => String(value || '').trim();

const MEGA_MENU = [
  {
    label: 'Plumbing & Sanitary (15)',
    category: 'Plumbing & Sanitary Items',
    items: [
      { label: 'Pipes', query: 'Pipe' },
      { label: 'Water Tanks', query: 'Water Tank' },
      { label: 'Sink Bowls', query: 'Sink Bowl' },
      { label: 'Basins', query: 'Basin' }
    ]
  },
  {
    label: 'Bath Accessories & Taps (8)',
    category: 'Bath Accessories & Taps:',
    items: [
      { label: 'Bath Seats', query: 'Bath Seat' },
      { label: 'Simple Taps', query: 'Simple Tap' },
      { label: 'T-Cock', query: 'T-Cock' },
      { label: 'Shower Heads', query: 'Shower' }
    ]
  },
  {
    label: 'Paints & Accessories (6)',
    category: 'Paints & Accessories',
    items: [
      { label: 'Paint Brushes', query: 'Paint Brush' },
      { label: 'Paint Sprays', query: 'Paint Spray' }
    ]
  },
  {
    label: 'Electrical Hardware (8)',
    category: 'Electrical Hardware Items',
    items: [
      { label: 'Wiring Pipes', query: 'Wiring Pipe' },
      { label: 'Fan Boxes', query: 'Fan Box' },
      { label: 'Breakers', query: 'Breaker' },
      { label: 'Bulb Holders', query: 'Bulb Holder' }
    ]
  }
];

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/shop' },
  { label: 'Special Offers', to: '/shop?offer=true' },
  { label: 'Brands', to: '/brands' },
  { label: 'Contact', to: '/contact' }
];

const WebNavbar = () => {
  const { products: productsData } = useProductsCatalog();
  const navigate = useNavigate();
  const location = useLocation();
  const { cartCount, cartTotal, setIsCartOpen, clearCart } = useCart();
  const { wishlistCount } = useWishlist();
  const { customerUser, logoutCustomer } = useCustomerAuth();
  const { compareCount } = useCompare();
  const storeLogoUrl = useStoreLogo();

  const [isSticky, setIsSticky] = useState(false);
  const [searchCategory, setSearchCategory] = useState('All Categories');
  const [searchText, setSearchText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activeMegaCategory, setActiveMegaCategory] = useState(null);
  const [searchInteracted, setSearchInteracted] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationRefreshKey, setNotificationRefreshKey] = useState(0);

  const searchCategories = useMemo(() => {
    const categories = Array.from(
      new Set(
        productsData
          .map((product) => product.category)
          .map(normalizeCategoryLabel)
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    return ['All Categories', ...categories];
  }, [productsData]);

  const searchWrapRef = useRef(null);
  const mobileSearchWrapRef = useRef(null);
  const accountMenuRef = useRef(null);
  const notificationMenuRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 12);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sync search inputs with the current URL query parameters and reset searchInteracted
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchParam = params.get('search') || '';
    const categoryParam = params.get('category') || 'All Categories';
    
    setSearchText(searchParam);
    setSearchCategory(categoryParam);
    setSearchInteracted(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      const desktopSearchClicked = searchWrapRef.current && searchWrapRef.current.contains(event.target);
      const mobileSearchClicked = mobileSearchWrapRef.current && mobileSearchWrapRef.current.contains(event.target);

      if (!desktopSearchClicked && !mobileSearchClicked) {
        setShowSuggestions(false);
      }

      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setShowAccountMenu(false);
      }
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    const onRefresh = () => setNotificationRefreshKey((prev) => prev + 1);
    window.addEventListener('notification:refresh', onRefresh);
    return () => window.removeEventListener('notification:refresh', onRefresh);
  }, []);

  useEffect(() => {
    const onNew = (e) => {
      const items = e?.detail?.items;
      if (!items || !Array.isArray(items) || items.length === 0) return;
      // Prepend new notifications and show menu
      setNotifications((prev) => {
        // filter out duplicates by id
        const existingIds = new Set(prev.map((n) => n.id));
        const filtered = items.filter((it) => it && !existingIds.has(it.id));
        return [...filtered, ...prev];
      });
      setShowNotifications(true);
    };
    window.addEventListener('notification:new', onNew);
    return () => window.removeEventListener('notification:new', onNew);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const resolveBackendCustomerId = async (customerEmail, customerPhone) => {
      const customerId = customerUser?.id || customerUser?._id || null;
      if (customerId && String(customerId).length > 10 && !String(customerId).startsWith('cust_')) {
        return String(customerId);
      }

      if (!customerEmail && !customerPhone) return null;

      try {
        const rows = await customerService.getAll();
        const customers = Array.isArray(rows) ? rows : rows?.data || [];
        const matched = customers.find((customer) => {
          const email = String(customer.email || '').trim().toLowerCase();
          const phone = String(customer.phone || '').trim();
          return (customerEmail && email === customerEmail) || (customerPhone && phone === customerPhone);
        });
        return matched?.id || matched?._id || null;
      } catch {
        return null;
      }
    };

    const loadNotifications = async () => {
      const customerEmail = String(customerUser?.email || '').trim().toLowerCase();
      const customerPhone = String(customerUser?.phone || '').trim();
      const backendCustomerId = await resolveBackendCustomerId(customerEmail, customerPhone);
      if (!backendCustomerId && !customerEmail && !customerPhone) {
        if (isMounted) setNotifications([]);
        return;
      }

      setNotificationsLoading(true);
      try {
        const queryParams = {};
        if (backendCustomerId) queryParams.customer_id = backendCustomerId;
        if (customerEmail) queryParams.customer_email = customerEmail;
        if (customerPhone) queryParams.customer_phone = customerPhone;

        const data = await notificationService.list(queryParams);
        if (isMounted) {
          setNotifications(data);
        }
      } catch {
        if (isMounted) setNotifications([]);
      } finally {
        if (isMounted) setNotificationsLoading(false);
      }
    };

    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [customerUser?.id, customerUser?._id, customerUser?.email, customerUser?.phone, notificationRefreshKey]);





  const suggestions = useMemo(() => {
    const normalized = searchText.trim().toLowerCase();
    if (!normalized) return [];

    const searchProducts = buildSearchProducts(productsData);
    return searchProducts.filter((product) => {
      if (product.stock <= 0) return false;

      if (!normalized) {
        return searchCategory === 'All Categories' || product.category === searchCategory;
      }

      const matchesText =
        product.name.toLowerCase().includes(normalized) ||
        String(product.brand || '').toLowerCase().includes(normalized) ||
        String(product.category || '').toLowerCase().includes(normalized);
      const matchesCategory =
        searchCategory === 'All Categories' || product.category === searchCategory;
      return matchesText && matchesCategory;
    }).slice(0, 6);
  }, [productsData, searchText, searchCategory]);

  const buildShopSearch = () => {
    const normalizedSearch = searchText.trim();
    const isOnShop = window.location.pathname === '/shop';
    const baseParams = isOnShop ? new URLSearchParams(window.location.search) : new URLSearchParams();

    if (normalizedSearch) baseParams.set('search', normalizedSearch);
    else baseParams.delete('search');

    if (searchCategory !== 'All Categories') baseParams.set('category', searchCategory);
    else baseParams.delete('category');

    if (!isOnShop) {
      baseParams.delete('page');
    }

    return baseParams.toString();
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setSearchInteracted(true);
    const nextSearch = buildShopSearch();

    setShowSuggestions(false);
    navigate(`/shop${nextSearch ? `?${nextSearch}` : ''}`);
  };

  useEffect(() => {
    if (!searchInteracted) return;

    const normalizedSearch = searchText.trim();
    const isOnShop = window.location.pathname === '/shop';
    if (!normalizedSearch && searchCategory === 'All Categories' && !isOnShop) return;

    const nextSearch = buildShopSearch();
    const targetPath = `/shop${nextSearch ? `?${nextSearch}` : ''}`;
    const currentPath = `${window.location.pathname}${window.location.search}`;

    if (targetPath !== currentPath) {
      navigate(targetPath, { replace: true });
    }
  }, [searchInteracted, searchText, searchCategory, navigate]);

  const handleSearchTextChange = (value) => {
    setSearchInteracted(true);
    setSearchText(value);
    setShowSuggestions(true);
  };

  const handleSearchCategoryChange = (value) => {
    setSearchInteracted(true);
    setSearchCategory(value);

    const normalizedSearch = searchText.trim();
    if (value !== 'All Categories' && !normalizedSearch) {
      const params = new URLSearchParams();
      params.set('category', value);
      navigate(`/?${params.toString()}`);
      setShowSuggestions(false);
      return;
    }

    setShowSuggestions(Boolean(normalizedSearch));
  };

  const handleLogout = () => {
    logoutCustomer();
    clearCart();
    setShowAccountMenu(false);
    navigate('/customer/login', { replace: true });
  };

  const customerUnreadNotifications = notifications.filter((note) => !note.read);

  const formatDeliveryWindow = (deliveryEstimate) => {
    const fromRaw = deliveryEstimate?.from;
    const toRaw = deliveryEstimate?.to;
    if (!fromRaw || !toRaw) return '';

    const fromDate = new Date(fromRaw);
    const toDate = new Date(toRaw);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return '';

    return `${fromDate.getDate()} to ${toDate.getDate()}`;
  };

  const handleNotificationClick = async (notificationId) => {
    try {
      // mark read on backend
      await notificationService.markRead(notificationId);
    } catch (err) {
      // ignore errors, still update UI
    }
    // remove the clicked notification from local list
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    setShowNotifications(false);
  };

  useEffect(() => {
    const onRead = (e) => {
      const id = e?.detail?.id;
      if (!id) return;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    };
    window.addEventListener('notification:read', onRead);
    return () => window.removeEventListener('notification:read', onRead);
  }, []);

  return (
    <div className="bg-white">
      <div className="hidden md:block bg-[#facc15] text-black text-xs font-semibold">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>+923426435527</span>
            <span>hassanramzan59@gmail.com</span>
            <span>Shop Timing: Monday-Thursday & Saturday-Sunday: 8:00 AM - 8:00 PM | Friday: Off</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/about" className="hover:text-white/90 transition-colors">
              About Us
            </Link>

            <Link to="/contact" className="hover:text-white/90 transition-colors">
              Contacts
            </Link>

            <Link to="/track-order" className="hover:text-white/90 transition-colors">
              Track Order
            </Link>

            <div className="flex items-center gap-2">
              <a href="https://facebook.com" target="_blank" rel="noreferrer" className="hover:text-white/90 transition-colors" aria-label="Facebook">
                <FaFacebookF size={12} />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-white/90 transition-colors" aria-label="Instagram">
                <FaInstagram size={12} />
              </a>
              <a href="https://wa.me/923426435527" target="_blank" rel="noreferrer" className="hover:text-white/90 transition-colors" aria-label="WhatsApp">
                <FaWhatsapp size={12} />
              </a>
            </div>
          </div>
        </div>
      </div>

      <header className={`sticky top-0 z-[99999] bg-white transition-shadow overflow-visible ${isSticky ? 'shadow-md' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 lg:gap-5">
          <button
            type="button"
            className="lg:hidden p-2 rounded-md border border-gray-200 text-primary"
            onClick={() => setShowMobileMenu(true)}
            aria-label="Open navigation menu"
          >
            <FaBars size={18} />
          </button>

          <Link to="/" className="shrink-0">
            <div className="flex items-center gap-3">
              <img src={storeLogoUrl} alt="Mian & Sons logo" className="w-10 h-10 rounded-full object-cover object-center" />
              <div className="hidden sm:block">
                <p className="text-primary font-bold leading-none">Mian & Sons</p>
                <p className="text-xs text-gray-500">Hardware Store</p>
              </div>
            </div>
          </Link>

          <div className="hidden lg:flex flex-1 overflow-visible relative" ref={searchWrapRef}>
            <form onSubmit={handleSearchSubmit} className="w-full relative" style={{ position: 'relative' }}>
              <div className="flex border border-gray-300 rounded-md overflow-hidden">
                <select
                  value={searchCategory}
                  onChange={(event) => handleSearchCategoryChange(event.target.value)}
                  className="w-52 border-0 border-r border-gray-300 text-sm focus:ring-0"
                >
                  {searchCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={searchText}
                  onChange={(event) => handleSearchTextChange(event.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search for tools, materials, brands..."
                  className="flex-1 border-0 text-sm focus:ring-0"
                />
                <button type="submit" className="bg-secondary px-5 text-white flex items-center justify-center" aria-label="Search">
                  <FaSearch size={14} />
                </button>
              </div>

              <AnimatePresence>
                {showSuggestions && searchText.trim() && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[99999]"
                    style={{ position: 'absolute', zIndex: 99999 }}
                  >
                    {suggestions.length > 0 ? (
                      suggestions.map((item) => (
                        <Link
                          key={item.id}
                          to={`/shop/product/${item.id}`}
                          onClick={() => setShowSuggestions(false)}
                          className="block px-4 py-2 text-sm hover:bg-gray-50"
                        >
                          <p className="text-gray-800">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.category}</p>
                        </Link>
                      ))
                    ) : (
                      <p className="px-4 py-3 text-sm text-gray-500">No matching products found.</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <Link to="/compare" className="relative p-2 text-primary hover:text-secondary transition-colors" aria-label="Compare list">
              <FaBalanceScale size={20} />
              {compareCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-secondary text-white text-[10px] font-semibold flex items-center justify-center px-1">
                  {compareCount}
                </span>
              )}
            </Link>

            <Link to="/wishlist" className="relative p-2 text-primary hover:text-secondary transition-colors" aria-label="Wishlist">
              <FaHeart size={20} />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-secondary text-white text-[10px] font-semibold flex items-center justify-center px-1">
                  {wishlistCount}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-primary hover:text-secondary transition-colors"
              aria-label="Cart"
            >
              <FaShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-secondary text-white text-[10px] font-semibold flex items-center justify-center px-1">
                  {cartCount}
                </span>
              )}
            </button>

            <div className="hidden sm:block text-right text-xs leading-tight">
              <p className="text-gray-500">Cart Total</p>
              <p className="text-primary font-semibold">PKR {cartTotal.toLocaleString()}</p>
            </div>

            {customerUser && (
              <div className="relative" ref={notificationMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowNotifications((prev) => !prev)}
                  className="relative p-2 text-primary hover:text-secondary transition-colors"
                  aria-label="Notifications"
                >
                  <FaBell size={18} />
                  {customerUnreadNotifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-secondary text-white text-[10px] font-semibold flex items-center justify-center px-1">
                      {customerUnreadNotifications.length}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto bg-white border border-gray-200 rounded-md shadow-lg z-50"
                    >
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="font-semibold text-gray-900">Notifications</p>
                        <p className="text-xs text-gray-500">Warranty approvals and store updates</p>
                      </div>

                      {notificationsLoading ? (
                        <div className="p-4 text-sm text-gray-500">Loading notifications...</div>
                      ) : notifications.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500">No notifications yet.</div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {notifications.map((notification) => (
                            <button
                              key={notification.id}
                              type="button"
                              onClick={() => handleNotificationClick(notification.id)}
                              className="group block w-full text-left p-4 hover:bg-[#facc15] dark:hover:bg-[#facc15] transition-colors"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-gray-900 group-hover:!text-black dark:group-hover:!text-black">{notification.title}</p>
                                  <p className="text-sm text-gray-600 mt-1 group-hover:!text-black dark:group-hover:!text-black">{notification.message}</p>
                                  {notification.products?.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      {notification.products.map((productName, index) => (
                                        <p key={`${notification.id}-product-${index}`} className="text-sm text-gray-600 group-hover:!text-black dark:group-hover:!text-black">
                                          {productName}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                  {notification.deliveryMessage && (
                                    <p className="text-sm text-gray-600 mt-2 group-hover:!text-black dark:group-hover:!text-black">{notification.deliveryMessage}</p>
                                  )}
                                  {notification.deliveryEstimate?.from && notification.deliveryEstimate?.to && (
                                    <p className="text-sm text-gray-600 mt-1 group-hover:!text-black dark:group-hover:!text-black">
                                      Estimated Delivery: {formatDeliveryWindow(notification.deliveryEstimate)}
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-400 mt-2 group-hover:!text-black dark:group-hover:!text-black">
                                    {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : 'Just now'}
                                  </p>
                                </div>
                                {!notification.read && <span className="mt-1 inline-block w-2 h-2 rounded-full bg-secondary group-hover:!bg-black dark:group-hover:!bg-black" />}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="p-3 border-t border-gray-100 bg-gray-50">
                        <Link
                          to="/customer/account"
                          onClick={() => setShowNotifications(false)}
                          className="block w-full text-center rounded-md bg-secondary text-white text-sm font-semibold py-2 hover:opacity-90 transition-opacity"
                        >
                          View Account
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="relative" ref={accountMenuRef}>
              <button
                type="button"
                onClick={() => setShowAccountMenu((prev) => !prev)}
                className="flex items-center gap-1 text-primary hover:text-secondary transition-colors"
                aria-label="Account"
              >
                <FaUser size={18} />
                <FaChevronDown size={12} />
              </button>

              <AnimatePresence>
                {showAccountMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-50"
                  >
                    {customerUser ? (
                      <>
                        <Link to="/customer/account" className="block px-4 py-2 text-sm hover:bg-secondary transition-colors">My Account</Link>
                        <Link to="/customer/orders" className="block px-4 py-2 text-sm hover:bg-secondary transition-colors">My Orders</Link>
                        <Link to="/customer/account" className="block px-4 py-2 text-sm hover:bg-secondary transition-colors">Profile</Link>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-red-600 hover:text-white transition-colors"
                        >
                          Logout
                        </button>
                      </>
                    ) : (
                      <>
                        <Link to="/customer/login" className="block px-4 py-2 text-sm hover:bg-secondary transition-colors">Login</Link>
                        <Link to="/customer/register" className="block px-4 py-2 text-sm hover:bg-secondary transition-colors">Register</Link>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="lg:hidden px-4 pb-3 overflow-visible relative" ref={mobileSearchWrapRef}>
          <form onSubmit={handleSearchSubmit} className="relative" style={{ position: 'relative' }}>
            <div className="flex border border-gray-300 rounded-md overflow-hidden bg-white">
              <input
                type="text"
                value={searchText}
                onChange={(event) => handleSearchTextChange(event.target.value)}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search products..."
                className="flex-1 border-0 text-sm focus:ring-0"
              />
              <button type="submit" className="bg-secondary px-4 text-white flex items-center justify-center" aria-label="Search">
                <FaSearch size={14} />
              </button>
            </div>

            <AnimatePresence>
              {showSuggestions && searchText.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[99999]"
                  style={{ position: 'absolute', zIndex: 99999 }}
                >
                  {suggestions.length > 0 ? (
                    suggestions.map((item) => (
                      <Link
                        key={`mobile-${item.id}`}
                        to={`/shop/product/${item.id}`}
                        onClick={() => setShowSuggestions(false)}
                        className="block px-4 py-2 text-sm hover:bg-gray-50"
                      >
                        <p className="text-gray-800">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.category}</p>
                      </Link>
                    ))
                  ) : (
                    <p className="px-4 py-3 text-sm text-gray-500">No matching products found.</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>

        {/* Desktop mega-category row removed as requested */}
      </header>

      <MobileMenu
        open={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
        navLinks={NAV_LINKS}
        megaMenu={MEGA_MENU}
        customerUser={customerUser}
        onLogout={handleLogout}
      />
    </div>
  );
};

export default WebNavbar;