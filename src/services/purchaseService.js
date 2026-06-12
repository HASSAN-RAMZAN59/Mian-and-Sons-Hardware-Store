import api from './api';

export const purchaseService = {
  getAll: async (params) => {
    const response = await api.get('/purchases', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/purchases/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/purchases', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/purchases/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/purchases/${id}`);
    return response.data;
  }
};
