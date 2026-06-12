import api from './api';

export const paymentService = {
  getAll: async (params) => {
    const response = await api.get('/payments', { params });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/payments', data);
    return response.data;
  },

  getByCustomer: async (customerId) => {
    const response = await api.get(`/payments/by-customer/${customerId}`);
    return response.data;
  }
};
