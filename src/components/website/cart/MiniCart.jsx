import React from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FaMinus, FaPlus, FaShoppingCart, FaTimes, FaTrashAlt } from 'react-icons/fa';
import { useCart } from '../../../context/CartContext';
import { getPrimaryProductImage, handleImageError } from '../../../utils/helpers';

const MiniCart = () => {
  const {
    cartItems,
    cartCount,
    cartTotal,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity
  } = useCart();

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50"
            onClick={() => setIsCartOpen(false)}
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed top-0 right-0 h-full w-96 max-w-[92%] bg-[#0b0f14] text-gray-100 z-50 flex flex-col shadow-2xl"
          >
            <div className="px-4 py-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold">My Cart ({cartCount} items)</h3>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="text-gray-400 hover:text-gray-200"
                aria-label="Close mini cart"
              >
                <FaTimes size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-44">
              {cartItems.length === 0 ? (
                <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center px-4">
                  <div className="w-16 h-16 rounded-full bg-gray-800 text-yellow-400 flex items-center justify-center mb-4">
                    <FaShoppingCart size={24} />
                  </div>
                  <p className="text-lg font-semibold">Your cart is empty</p>
                  <p className="text-sm text-gray-400 mt-1">Add products to continue shopping.</p>
                  <Link
                    to="/shop"
                    onClick={() => setIsCartOpen(false)}
                    className="mt-5 inline-flex items-center justify-center rounded-md bg-yellow-400 text-black px-5 py-2.5 font-semibold hover:brightness-95 transition"
                  >
                    Start Shopping
                  </Link>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={item.id} className="rounded-lg p-3 bg-[#0f1720] border border-gray-800">
                    <div className="flex items-start gap-3">
                      <div className="premium-product-frame w-[56px] h-[56px] rounded-md border border-gray-800 bg-gray-900 overflow-hidden flex-shrink-0">
                        <div className="w-full h-full flex items-center justify-center">
                          <img
                            src={getPrimaryProductImage(item)}
                            alt={item.name}
                            loading="lazy"
                            onError={(event) => handleImageError(event, item.name)}
                            className="premium-product-image"
                          />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-100 truncate">{item.name}</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Rs. {(item.salePrice ?? item.price).toLocaleString()} × {item.quantity}
                        </p>

                        <div className="mt-3 inline-flex items-center rounded-md overflow-hidden bg-gray-900 border border-gray-800">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-9 h-9 flex items-center justify-center text-gray-300 hover:bg-gray-800"
                            aria-label="Decrease quantity"
                          >
                            <FaMinus size={12} />
                          </button>
                          <span className="w-10 text-center text-sm font-semibold text-gray-100">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-9 h-9 flex items-center justify-center text-gray-300 hover:bg-gray-800"
                            aria-label="Increase quantity"
                          >
                            <FaPlus size={12} />
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-400 hover:text-red-500 mt-1"
                        aria-label="Remove item"
                      >
                        <FaTrashAlt size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-gray-800 p-4 space-y-3 sticky bottom-0 bg-[#0b0f14]">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Subtotal</span>
                <span className="font-semibold text-gray-100">Rs. {cartTotal.toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/cart"
                  onClick={() => setIsCartOpen(false)}
                  className="text-center py-2.5 border border-yellow-400 text-yellow-400 rounded-md hover:bg-yellow-50/5 transition-colors text-sm font-medium"
                >
                  View Cart
                </Link>
                <Link
                  to="/checkout"
                  onClick={() => setIsCartOpen(false)}
                  className="text-center py-2.5 bg-yellow-400 text-black rounded-md hover:brightness-95 transition-colors text-sm font-semibold col-span-2"
                >
                  Checkout
                </Link>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default MiniCart;