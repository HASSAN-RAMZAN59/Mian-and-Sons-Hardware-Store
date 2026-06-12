import { useCallback, useEffect, useState } from 'react';
import { productService } from '../services/productService';
import { getProductImageList } from '../utils/helpers';

const normalizeProduct = (product) => {
  const id = String(product?._id ?? product?.id ?? '');
  const purchasePrice = Number(product?.purchasePrice ?? 0);
  const salePrice = Number(product?.salePrice ?? 0);

  return {
    ...product,
    id,
    _id: id,
    purchasePrice,
    salePrice,
    price: Number(product?.price ?? salePrice ?? purchasePrice),
    stockQty: Number(product?.stockQty ?? product?.stock ?? 0),
    stock: Number(product?.stock ?? product?.stockQty ?? 0),
    rating: Number(product?.rating ?? 0),
    reviewCount: Number(product?.reviewCount ?? 0),
    image: product?.image || product?.imageUrl || product?.thumbnail || '',
    images: getProductImageList(product),
    tags: Array.isArray(product?.tags) ? product.tags : []
  };
};

const useProductsCatalog = () => {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await productService.getAll();
      const list = Array.isArray(response) ? response : [];
      setProducts(list.map(normalizeProduct).filter((item) => item.id));
    } catch (err) {
      setProducts([]);
      setError(err?.response?.data?.detail || err?.message || 'Unable to load products.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const onRefresh = (e) => {
      // optional: could inspect e.detail.productIds to selectively reload or optimize
      loadProducts();
    };
    const onStorage = (ev) => {
      try {
        if (ev.key === 'products:refresh') {
          loadProducts();
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('products:refresh', onRefresh);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('products:refresh', onRefresh);
      window.removeEventListener('storage', onStorage);
    };
  }, [loadProducts]);

  return {
    products,
    isLoading,
    error,
    reloadProducts: loadProducts
  };
};

export default useProductsCatalog;
