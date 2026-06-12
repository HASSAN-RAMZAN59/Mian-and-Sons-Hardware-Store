import React from 'react';
import { Link } from 'react-router-dom';
import { FaCopy, FaHeart, FaScaleBalanced, FaTrash, FaCartPlus } from 'react-icons/fa6';
import { toast } from 'react-toastify';
import ProductCard from '../../components/website/shop/ProductCard';
import { useWishlist } from '../../context/WishlistContext';
import { showActionToast } from '../../utils/toastActions';

const COMPARE_STORAGE_KEY = 'website_compare_items';

const Wishlist = () => {
  const { wishlistItems, wishlistCount, removeFromWishlist, moveToCart } = useWishlist();

  const handleShareWishlist = async () => {
    const ids = wishlistItems.map((item) => item.id).join(',');
    const shareUrl = `${window.location.origin}/wishlist?items=${encodeURIComponent(ids)}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Wishlist link copied.');
    } catch {
      toast.error('Unable to copy wishlist link.');
    }
  };

  const addAllToCart = () => {
    if (!wishlistItems.length) return;

    const ids = wishlistItems.map((item) => item.id);
    ids.forEach((id) => moveToCart(id));
    showActionToast('success', 'All wishlist items moved to cart.', { path: '/cart' });
  };

  const moveToCompare = (item) => {
    const existing = JSON.parse(localStorage.getItem(COMPARE_STORAGE_KEY) || '[]');
    if (existing.some((product) => product.id === item.id)) {
      showActionToast('info', `${item.name} is already in compare list.`, { path: '/compare' });
      return;
    }

    const updated = [...existing, item].slice(0, 6);
    localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('app-storage-updated', { detail: { key: COMPARE_STORAGE_KEY } }));
    showActionToast('success', `${item.name} added to compare.`, { path: '/compare' });
  };

  if (!wishlistItems.length) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-3xl mb-4">
            <FaHeart />
          </div>
          <h1 className="text-2xl font-bold text-primary mb-2">Your wishlist is empty</h1>
          <p className="text-gray-500 mb-6">Save your favorite products to see them here.</p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-secondary text-white font-semibold hover:opacity-90"
          >
            Explore Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-2xl md:text-3xl font-bold text-primary">My Wishlist ({wishlistCount} items)</h1>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleShareWishlist}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-semibold"
          >
            <FaCopy size={12} />
            Share Wishlist
          </button>

          <button
            type="button"
            onClick={addAllToCart}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-white hover:bg-primary/90 text-sm font-semibold"
          >
            <FaCartPlus size={13} />
            Add All to Cart
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {wishlistItems.map((item) => (
          <div key={item.id} className="relative">
            <ProductCard product={item} view="grid" />

            <button
              type="button"
              onClick={() => removeFromWishlist(item.id)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white border border-gray-200 text-red-500 flex items-center justify-center hover:bg-red-50"
              aria-label="Remove from wishlist"
            >
              <FaTrash size={12} />
            </button>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => moveToCart(item.id)}
                className="px-3 py-2 rounded-md bg-[#facc15] text-black text-sm font-semibold hover:bg-[#eab308]"
              >
                Add to Cart
              </button>
              <button
                type="button"
                onClick={() => moveToCompare(item)}
                className="inline-flex justify-center items-center gap-1 px-3 py-2 rounded-md border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <FaScaleBalanced size={12} />
                Compare
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Wishlist;