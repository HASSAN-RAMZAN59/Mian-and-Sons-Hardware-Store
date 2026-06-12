import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowRight, FaHeart, FaMinus, FaPlus, FaTrash, FaXmark } from 'react-icons/fa6';
import { FaShoppingCart } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import useProductsCatalog from '../../hooks/useProductsCatalog';
import { getPrimaryProductImage, handleImageError } from '../../utils/helpers';
import { showActionToast } from '../../utils/toastActions';

const SAVED_FOR_LATER_KEY = 'website_saved_for_later';

const getCartItemImage = (item, productsData = []) => {
  const fromItem = getPrimaryProductImage(item);
  if (fromItem) return fromItem;

  const matched = productsData.find((product) => String(product.id) === String(item?.id));
  return getPrimaryProductImage(matched);
};

const Cart = () => {
  const navigate = useNavigate();
  const { products: productsData } = useProductsCatalog();
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    clearCart,
    applyCoupon,
    removeCoupon,
    couponCode,
    cartDiscount,
    cartTotal,
    addToCart
  } = useCart();
  const { addToWishlist } = useWishlist();

  const activeCouponCode = String(couponCode || '').split(':')[0] || '';
  const [couponInput, setCouponInput] = useState(activeCouponCode);
  const [couponError, setCouponError] = useState('');
  const [savedForLater, setSavedForLater] = useState(() => {
    try {
      const stored = localStorage.getItem(SAVED_FOR_LATER_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  useEffect(() => {
    localStorage.setItem(SAVED_FOR_LATER_KEY, JSON.stringify(savedForLater));
  }, [savedForLater]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('website_recently_viewed') || '[]');
      const list = Array.isArray(parsed) ? parsed : [];
      setRecentlyViewed(list.filter((item) => !cartItems.some((cartItem) => cartItem.id === item.id)).slice(0, 6));
    } catch {
      setRecentlyViewed([]);
    }
  }, [cartItems]);

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + (item.salePrice ?? item.price) * item.quantity, 0),
    [cartItems]
  );

  const deliveryCharges = subtotal > 5000 || subtotal === 0 ? 0 : 250;
  const grandTotal = Math.max(cartTotal + deliveryCharges, 0);

  const handleApplyCoupon = async () => {
    const result = await applyCoupon(couponInput);
    if (!result.success) {
      setCouponError(result.message || 'Invalid coupon code.');
      return;
    }
    setCouponError('');
    showActionToast('success', result.message || 'Coupon applied successfully.', { path: '/cart' });
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    setCouponInput('');
    setCouponError('');
  };

  const handleSaveForLater = (item) => {
    if (savedForLater.some((saved) => saved.id === item.id)) {
      showActionToast('info', `${item.name} already saved for later.`, { path: '/cart' });
      return;
    }
    setSavedForLater((prev) => [...prev, item]);
    removeFromCart(item.id);
    showActionToast('success', `${item.name} saved for later.`, { path: '/cart' });
  };

  const handleMoveToWishlist = (item) => {
    addToWishlist(item);
    removeFromCart(item.id, { silent: true });
  };

  const moveSavedToCart = (item) => {
    addToCart(item, 1);
    setSavedForLater((prev) => prev.filter((saved) => saved.id !== item.id));
  };

  if (cartItems.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-orange-100 text-secondary flex items-center justify-center text-3xl mb-4 shadow-inner">
            <FaShoppingCart size={30} />
          </div>
          <h1 className="text-2xl font-bold text-primary mb-2">Your cart is empty</h1>
          <p className="text-gray-500 mb-6">Looks like you haven’t added any products yet.</p>
          <p className="text-sm text-gray-400 mb-6">Browse products and add items to get started.</p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-secondary text-white font-semibold hover:opacity-90"
          >
            Continue Shopping
            <FaArrowRight size={12} />
          </Link>
        </div>

        {recentlyViewed.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-bold text-primary mb-4">Recently Viewed</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentlyViewed.map((item) => (
                <article key={item.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500">{item.category}</p>
                  <h3 className="font-semibold text-primary line-clamp-2 min-h-[3rem]">{item.name}</h3>
                  <p className="text-secondary font-bold mt-2">Rs. {Number(item.price || 0).toLocaleString()}</p>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-12 gap-6">
        <section className="lg:col-span-8">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-left text-sm text-gray-600">
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {cartItems.map((item) => {
                    const unitPrice = item.salePrice ?? item.price;
                    const rowTotal = unitPrice * item.quantity;

                    return (
                      <tr key={item.id} className="border-b border-gray-100 align-top">
                        <td className="px-4 py-4">
                          <div className="flex gap-3">
                            <div className="w-[60px] h-[60px] rounded-md bg-gray-100 overflow-hidden">
                              <div className="premium-product-frame w-full h-full flex items-center justify-center bg-white">
                                <img
                                  src={getCartItemImage(item, productsData)}
                                  alt={item.name}
                                  loading="lazy"
                                  onError={(event) => handleImageError(event, item.name)}
                                  className="premium-product-image"
                                />
                              </div>
                            </div>
                            <div>
                              <h3 className="font-semibold text-primary line-clamp-2">{item.name}</h3>
                              <p className="text-xs text-gray-500">{item.brand} • {item.category}</p>
                              <div className="flex items-center gap-3 mt-2 text-xs">
                                <button
                                  type="button"
                                  onClick={() => handleSaveForLater(item)}
                                  className="text-gray-600 hover:text-primary"
                                >
                                  Save for later
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveToWishlist(item)}
                                  className="inline-flex items-center gap-1 text-gray-600 hover:text-primary"
                                >
                                  <FaHeart size={11} /> Move to wishlist
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 font-semibold text-gray-700">Rs. {Number(unitPrice).toLocaleString()}</td>

                        <td className="px-4 py-4">
                          <div className="inline-flex items-center border border-gray-300 rounded-md overflow-hidden">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="px-3 py-2 text-gray-600 hover:bg-gray-50"
                            >
                              <FaMinus size={10} />
                            </button>
                            <span className="w-10 text-center text-sm font-semibold">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="px-3 py-2 text-gray-600 hover:bg-gray-50"
                              disabled={Number(item.stock) > 0 && item.quantity >= Number(item.stock)}
                            >
                              <FaPlus size={10} />
                            </button>
                          </div>
                          {Number(item.stock) > 0 && (
                            <p className="text-xs text-gray-400 mt-1">Max: {item.stock}</p>
                          )}
                        </td>

                        <td className="px-4 py-4 font-bold text-secondary">Rs. {rowTotal.toLocaleString()}</td>

                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100"
                            aria-label="Remove item"
                          >
                            <FaXmark size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200">
              <Link to="/shop" className="text-sm font-semibold text-primary hover:text-secondary">
                ← Continue Shopping
              </Link>
              <button
                type="button"
                onClick={clearCart}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold"
              >
                <FaTrash size={12} />
                Clear Cart
              </button>
            </div>
          </div>

          {savedForLater.length > 0 && (
            <div className="mt-6 bg-white border border-gray-200 rounded-xl p-4">
              <h2 className="text-lg font-bold text-primary mb-3">Saved for Later</h2>
              <div className="space-y-3">
                {savedForLater.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border border-gray-100 rounded-lg p-3">
                    <div>
                      <p className="font-semibold text-primary">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.brand} • Rs. {Number(item.salePrice ?? item.price).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => moveSavedToCart(item)}
                        className="px-3 py-1.5 rounded-md bg-primary text-white text-sm font-semibold"
                      >
                        Move to Cart
                      </button>
                      <button
                        type="button"
                        onClick={() => setSavedForLater((prev) => prev.filter((saved) => saved.id !== item.id))}
                        className="px-3 py-1.5 rounded-md border border-gray-300 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="lg:col-span-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 sticky top-24">
            <h2 className="text-xl font-bold text-primary mb-4">Order Summary</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>Rs. {subtotal.toLocaleString()}</span>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Coupon Code</label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(event) => {
                      setCouponInput(event.target.value.toUpperCase());
                      setCouponError('');
                    }}
                    placeholder="Enter coupon code"
                    className="flex-1 rounded-md border border-gray-300 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-3 py-2 rounded-md bg-primary text-white text-sm font-semibold"
                  >
                    Apply
                  </button>
                </div>

                {activeCouponCode && (
                  <div className="mt-2 flex items-center justify-between text-xs bg-green-50 border border-green-100 rounded-md px-2 py-1.5">
                    <span className="text-green-700">Applied: {activeCouponCode}</span>
                    <button type="button" onClick={handleRemoveCoupon} className="text-red-500">Remove</button>
                  </div>
                )}

                {couponError && <p className="mt-1 text-xs text-red-500">{couponError}</p>}
              </div>

              {cartDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>- Rs. {cartDiscount.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-600">
                <span>Delivery Charges</span>
                <span>{deliveryCharges === 0 ? 'Free above Rs. 5000' : `Rs. ${deliveryCharges}`}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
              <span className="text-lg font-semibold text-primary">Grand Total</span>
              <span className="text-2xl font-bold text-secondary">Rs. {grandTotal.toLocaleString()}</span>
            </div>

            {Boolean(localStorage.getItem('customerUser')) ? (
              <Link
                to="/checkout"
                className="mt-5 w-full inline-flex justify-center items-center gap-2 px-4 py-3 rounded-md bg-secondary text-white font-bold hover:opacity-90"
              >
                <FaShoppingCart size={14} />
                Proceed to Checkout
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  toast.info('Please log in or sign up to place your order.');
                  navigate('/customer/login', { state: { from: '/checkout' } });
                }}
                className="mt-5 w-full inline-flex justify-center items-center gap-2 px-4 py-3 rounded-md bg-secondary text-white font-bold hover:opacity-90"
              >
                <FaShoppingCart size={14} />
                Log in to Checkout
              </button>
            )}

            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2">Accepted Payments</p>
              <div className="flex flex-wrap gap-2">
                {['Cash', 'EasyPaisa', 'JazzCash', 'Bank Transfer'].map((method) => (
                  <span key={method} className="px-2.5 py-1 rounded bg-gray-100 text-gray-600 text-xs">
                    {method}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {recentlyViewed.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-primary mb-4">Recently Viewed</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentlyViewed.map((item) => (
              <article key={item.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500">{item.category}</p>
                <h3 className="font-semibold text-primary line-clamp-2 min-h-[3rem]">{item.name}</h3>
                <p className="text-secondary font-bold mt-2">Rs. {Number(item.price || 0).toLocaleString()}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Cart;