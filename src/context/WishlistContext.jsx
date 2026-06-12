import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useCart } from './CartContext';

const WishlistContext = createContext();

const WISHLIST_STORAGE_KEY = 'website_wishlist';

export const WishlistProvider = ({ children }) => {
  const { addToCart } = useCart();

  const [wishlistItems, setWishlistItems] = useState(() => {
    const savedWishlist = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!savedWishlist) return [];

    try {
      const parsed = JSON.parse(savedWishlist);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistItems));
  }, [wishlistItems]);

  const wishlistCount = useMemo(() => wishlistItems.length, [wishlistItems]);

  const showToast = (type, message, toastId) => {
    toast[type](message, { toastId });
  };

  const isInWishlist = (productId) => wishlistItems.some((item) => String(item.id) === String(productId));

  const addToWishlist = (product) => {
    if (!product?.id) return;

    setWishlistItems((prevItems) => {
      const exists = prevItems.some((item) => String(item.id) === String(product.id));
      if (exists) {
        showToast('info', `${product.name || 'Product'} is already in wishlist.`, `wishlist-exists-${product.id}`);
        return prevItems;
      }

      showToast('success', `${product.name || 'Product'} added to wishlist.`, `wishlist-added-${product.id}`);
      return [...prevItems, product];
    });
  };

  const removeFromWishlist = (productId) => {
    setWishlistItems((prevItems) => {
      const itemToRemove = prevItems.find((item) => String(item.id) === String(productId));
      if (!itemToRemove) return prevItems;

      showToast('info', `${itemToRemove.name || 'Product'} removed from wishlist.`, `wishlist-removed-${productId}`);
      return prevItems.filter((item) => String(item.id) !== String(productId));
    });
  };

  const moveToCart = (productId) => {
    setWishlistItems((prevItems) => {
      const itemToMove = prevItems.find((item) => String(item.id) === String(productId));
      if (!itemToMove) return prevItems;

      addToCart(itemToMove, 1);
      return prevItems.filter((item) => String(item.id) !== String(productId));
    });
  };

  const clearWishlist = () => {
    setWishlistItems([]);
  };

  const value = {
    wishlistItems,
    wishlistCount,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    moveToCart,
    clearWishlist
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export default WishlistContext;