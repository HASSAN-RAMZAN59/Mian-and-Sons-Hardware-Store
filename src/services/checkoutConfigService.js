import api from './api';

export const checkoutConfigService = {
  getDeliveryOptions: async () => {
    const response = await api.get('/delivery-options');
    return response.data;
  },

  getPaymentMethods: async () => {
    const response = await api.get('/payment-methods');
    return response.data;
  },

  getCities: async () => {
    const response = await api.get('/cities');
    return response.data;
  }
};
