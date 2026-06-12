import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FaCopy, FaMinus, FaPlus, FaStar, FaTimes } from 'react-icons/fa';
import { FacebookShareButton, WhatsappShareButton } from 'react-share';
import { toast } from 'react-toastify';
import { useCart } from '../../../context/CartContext';
import { useWishlist } from '../../../context/WishlistContext';

const QuickViewModal = ({ isOpen, onClose, product }) => {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (isOpen) setQuantity(1);
  }, [isOpen, product?.id]);

  const productUrl = useMemo(() => {
    const slug = product?.id || 'product';
    return `${window.location.origin}/shop/product/${slug}`;
  }, [product?.id]);

  const stockStatus = useMemo(() => {
    if (!product) return { label: '', classes: '' };
    if (product.stock <= 0) return { label: 'Out of Stock', classes: 'bg-red-100 text-red-600' };
    if (product.stock <= 5) return { label: 'Low Stock', classes: 'bg-orange-100 text-orange-600' };
    return { label: 'In Stock', classes: 'bg-green-100 text-green-600' };
  }, [product]);

  if (!product) return null;

  const handleAddToCart = () => {
    if (product.stock <= 0) return;
    addToCart(product, quantity);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(productUrl);
      toast.success('Product link copied.');
    } catch {
      toast.error('Unable to copy link.');
    }
  };

  const closeModal = () => {
    if (onClose) onClose();
  };

  const currentPrice = product.salePrice ?? product.price;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[80]"
            onClick={closeModal}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-x-4 top-[8%] z-[90] mx-auto w-full max-w-4xl"
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-primary">Quick View</h3>
                <button type="button" onClick={closeModal} className="text-gray-500 hover:text-primary" aria-label="Close quick view">
                  <FaTimes size={18} />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-0">
                <div className="p-6 bg-gray-50">
                  <div className="h-[320px] rounded-xl bg-white border border-gray-200 flex items-center justify-center text-8xl text-primary font-bold">
                    {product.name?.charAt(0) || 'P'}
                  </div>
                </div>

                <div className="p-6">
                  <h4 className="text-2xl font-bold text-primary leading-tight">{product.name}</h4>
                  <p className="text-sm text-gray-500 mt-1">{product.brand}</p>

                  {Number(product.rating) > 0 && (
                    <div className="flex items-center gap-1 mt-3">
                      <FaStar className="text-yellow-500" size={14} />
                      <span className="text-sm font-medium text-gray-700">{Number(product.rating).toFixed(1)}</span>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-2xl font-bold text-secondary">PKR {Number(currentPrice || 0).toLocaleString()}</span>
                    {product.salePrice && (
                      <span className="text-sm line-through text-gray-400">PKR {Number(product.price || 0).toLocaleString()}</span>
                    )}
                  </div>

                  <div className="mt-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${stockStatus.classes}`}>
                      {stockStatus.label}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 leading-6 mt-4">
                    {product.description || 'Premium quality hardware product with durable build and reliable performance for professional and household use.'}
                  </p>

                  <div className="mt-5 flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-700">Qty</span>
                    <div className="inline-flex items-center border border-gray-300 rounded-md overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                        className="px-3 py-2 text-gray-600 hover:bg-gray-50"
                      >
                        <FaMinus size={11} />
                      </button>
                      <span className="w-10 text-center text-sm font-semibold">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity((prev) => Math.min(product.stock || 1, prev + 1))}
                        className="px-3 py-2 text-gray-600 hover:bg-gray-50"
                        disabled={product.stock <= 0}
                      >
                        <FaPlus size={11} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={product.stock <= 0}
                      className={`w-full py-2.5 rounded-md font-semibold ${
                        product.stock <= 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#facc15] text-black hover:bg-[#eab308]'
                      }`}
                    >
                      Add to Cart
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        isInWishlist(product.id) ? removeFromWishlist(product.id) : addToWishlist(product)
                      }
                      className="w-full py-2.5 rounded-md font-semibold border border-primary text-primary hover:bg-primary hover:text-white"
                    >
                      {isInWishlist(product.id) ? 'Remove Wishlist' : 'Add to Wishlist'}
                    </button>
                  </div>

                  <div className="mt-4">
                    <Link
                      to={`/shop/product/${product.id}`}
                      onClick={closeModal}
                      className="text-sm font-semibold text-primary hover:text-secondary"
                    >
                      View Full Details
                    </Link>
                  </div>

                  <div className="mt-5 pt-4 border-t border-gray-200">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Share</p>
                    <div className="flex items-center gap-2">
                      <WhatsappShareButton url={productUrl} title={product.name}>
                        <span className="px-3 py-2 rounded-md bg-green-100 text-green-700 text-sm font-semibold">WhatsApp</span>
                      </WhatsappShareButton>
                      <FacebookShareButton url={productUrl} quote={product.name}>
                        <span className="px-3 py-2 rounded-md bg-blue-100 text-blue-700 text-sm font-semibold">Facebook</span>
                      </FacebookShareButton>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200"
                      >
                        <FaCopy size={12} />
                        Copy Link
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default QuickViewModal;