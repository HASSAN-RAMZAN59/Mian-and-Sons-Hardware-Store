import { useCallback, useEffect, useState } from 'react';
import { discountService } from '../services/discountService';
import { getActiveDiscounts, normalizeDiscount } from '../utils/discounts';

const normalizePayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.discounts)) return payload.discounts;
  return [];
};

const useActiveDiscounts = (options = {}) => {
  const { refreshInterval = 30000 } = options;
  const [discounts, setDiscounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDiscounts = useCallback(async () => {
    try {
      setError('');
      const response = await discountService.getActive();
      const list = normalizePayload(response).map(normalizeDiscount).filter(Boolean);
      setDiscounts(getActiveDiscounts(list));
    } catch (err) {
      setError('Unable to load discounts.');
      setDiscounts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDiscounts();
    const interval = window.setInterval(loadDiscounts, refreshInterval);
    return () => window.clearInterval(interval);
  }, [loadDiscounts, refreshInterval]);

  return { discounts, isLoading, error, reload: loadDiscounts };
};

export default useActiveDiscounts;
