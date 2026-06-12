import api from './api';

export const discountService = {
  getAll: async (params) => {
    const response = await api.get('/discounts', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/discounts/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/discounts', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/discounts/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/discounts/${id}`);
    return response.data;
  },

  getActive: async () => {
    const response = await api.get('/discounts/active');
    return response.data;
  },

  validateByCode: async (code) => {
    const response = await api.get('/discounts/active');
    const discounts = Array.isArray(response) ? response : (response.data || []);
    return discounts.find(d => d.code && d.code.toUpperCase() === code.toUpperCase()) || null;
  }
};
