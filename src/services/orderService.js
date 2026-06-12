import api from './api';

export const orderService = {
  getAll: async (params) => {
    const response = await api.get('/orders', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  getByCustomer: async (customerId, phone = null) => {
    const params = {};
    if (phone) params.phone = phone;
    const response = await api.get(`/orders/by-customer/${customerId}`, { params });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/orders', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/orders/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/orders/${id}`);
    return response.data;
  },
};
