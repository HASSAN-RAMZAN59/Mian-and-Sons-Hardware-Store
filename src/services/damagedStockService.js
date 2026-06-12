import api from './api';

export const damagedStockService = {
  getAll: async (params) => {
    const response = await api.get('/damaged-stock', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/damaged-stock/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/damaged-stock', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/damaged-stock/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/damaged-stock/${id}`);
    return response.data;
  }
};
