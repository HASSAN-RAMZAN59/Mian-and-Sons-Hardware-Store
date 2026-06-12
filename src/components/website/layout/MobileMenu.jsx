import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaChevronDown, FaPhoneAlt, FaTimes, FaWhatsapp } from 'react-icons/fa';

const MobileMenu = ({
  open,
  onClose,
  navLinks = [],
  megaMenu = [],
  customerUser,
  onLogout
}) => {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 lg:hidden"
            onClick={onClose}
          />

          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed top-0 left-0 h-full w-80 max-w-[85%] bg-white z-[55] p-4 overflow-y-auto lg:hidden shadow-xl"
          >
            <div className="flex items-center justify-between mb-5">
              <p className="text-primary font-bold">Menu</p>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-500 hover:text-primary"
                aria-label="Close menu"
              >
                <FaTimes size={18} />
              </button>
            </div>

            <div className="space-y-2">
              {navLinks.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={onClose}
                  className="block px-2 py-2 rounded-md text-primary hover:bg-gray-50"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-sm font-semibold text-primary mb-2">Categories</p>
              <div className="space-y-1">
                {megaMenu.map((category) => (
                  <details key={category.label} className="group border border-gray-200 rounded-md">
                    <summary className="list-none cursor-pointer px-3 py-2 text-sm text-gray-700 group-open:text-secondary flex items-center justify-between">
                      {category.label}
                      <FaChevronDown size={12} className="transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="px-3 pb-3 space-y-1">
                      {category.items.map((item) => (
                        <Link
                          key={item}
                          to={`/shop?category=${encodeURIComponent(item)}`}
                          onClick={onClose}
                          className="block text-sm text-gray-600 hover:text-secondary"
                        >
                          {item}
                        </Link>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
              <p className="text-sm font-semibold text-primary">Account</p>
              {customerUser ? (
                <>
                  <Link to="/customer/account" onClick={onClose} className="block text-sm text-gray-700 hover:text-secondary">
                    My Account
                  </Link>
                  <Link to="/customer/orders" onClick={onClose} className="block text-sm text-gray-700 hover:text-secondary">
                    My Orders
                  </Link>
                  <button type="button" onClick={() => { onLogout(); onClose(); }} className="text-sm text-gray-700 hover:text-red-600">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/customer/login" onClick={onClose} className="block text-sm text-gray-700 hover:text-secondary">
                    Customer Login
                  </Link>
                  <Link to="/customer/register" onClick={onClose} className="block text-sm text-gray-700 hover:text-secondary">
                    Create Account
                  </Link>
                </>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 text-sm text-gray-600 space-y-2">
              <p className="font-semibold text-primary">Contact Info</p>
              <p className="flex items-center gap-2"><FaPhoneAlt size={12} /> +923426435527</p>
              <a href="https://wa.me/923426435527" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-green-600 hover:text-green-700">
                <FaWhatsapp size={14} /> WhatsApp Support
              </a>
              <p>hassanramzan59@gmail.com</p>
              <p>Mon-Sat: 8AM-8PM</p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileMenu;