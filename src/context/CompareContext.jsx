import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { showActionToast } from '../utils/toastActions';

const CompareContext = createContext();

const COMPARE_STORAGE_KEY = 'website_compare_items';
const MAX_COMPARE_LIMIT = 4;

export const CompareProvider = ({ children }) => {
  const [compareItems, setCompareItems] = useState(() => {
    try {
      const stored = localStorage.getItem(COMPARE_STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(compareItems));
    // Dispatch a custom event to sync other non-react state listeners or other tabs if needed
    window.dispatchEvent(new CustomEvent('app-storage-updated', { detail: { key: COMPARE_STORAGE_KEY } }));
  }, [compareItems]);

  const compareCount = useMemo(() => compareItems.length, [compareItems]);

  const isInCompare = (productId) => compareItems.some((item) => String(item.id) === String(productId));

  const addToCompare = (product) => {
    if (!product?.id) return;

    if (isInCompare(product.id)) {
      showActionToast('info', `${product.name || 'Product'} is already in your comparison list.`, { path: '/compare' });
      return;
    }

    if (compareItems.length >= MAX_COMPARE_LIMIT) {
      showActionToast('warning', `You can only compare up to ${MAX_COMPARE_LIMIT} products at a time. Please remove an item first.`, { path: '/compare' });
      return;
    }

    const itemToAdd = {
      id: String(product.id),
      name: product.name,
      salePrice: Number(product.salePrice ?? product.price ?? 0),
      price: Number(product.price ?? product.salePrice ?? 0),
      brand: product.brand || product.company || 'Local Brand',
      category: product.category || 'Hardware',
      rating: Number.isFinite(Number(product.rating)) && Number(product.rating) > 0 ? Number(product.rating) : null,
      stock: Number(product.stock ?? product.stockQty ?? 0),
      warranty: product.warranty || product.specs?.Warranty || '7 Days Checking Warranty',
      image: product.image || (Array.isArray(product.images) && product.images[0]) || ''
    };

    setCompareItems((prev) => [...prev, itemToAdd]);
    showActionToast('success', `${product.name || 'Product'} added to comparison.`, { path: '/compare' });
  };

  const removeFromCompare = (productId) => {
    setCompareItems((prev) => {
      const itemToRemove = prev.find((item) => String(item.id) === String(productId));
      if (!itemToRemove) return prev;

      showActionToast('info', `${itemToRemove.name || 'Product'} removed from comparison.`, { path: '/compare' });
      return prev.filter((item) => String(item.id) !== String(productId));
    });
  };

  const clearCompare = () => {
    setCompareItems([]);
    showActionToast('info', 'Comparison list cleared.', { path: '/shop' });
  };

  const value = {
    compareItems,
    compareCount,
    addToCompare,
    removeFromCompare,
    isInCompare,
    clearCompare
  };

  return (
    <CompareContext.Provider value={value}>
      {children}
    </CompareContext.Provider>
  );
};

export const useCompare = () => {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error('useCompare must be used within a CompareProvider');
  }
  return context;
};

export default CompareContext;
