import api from './api';

export const couponService = {
  getActive: async () => {
    const response = await api.get('/coupons/active');
    return response.data;
  },

  validateCode: async (code) => {
    const normalizedCode = String(code || '').trim().toUpperCase();
    const coupons = await couponService.getActive();
    return (Array.isArray(coupons) ? coupons : []).find(
      (coupon) => String(coupon?.code || '').toUpperCase() === normalizedCode
    ) || null;
  }
};
