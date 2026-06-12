import api from './api';

export const warrantyService = {
  getAll: async (params) => {
    const response = await api.get('/warranties', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/warranties/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/warranties', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/warranties/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/warranties/${id}`);
    return response.data;
  },

  checkStatus: async (warrantyCode) => {
    const response = await api.get(`/warranties/check/${warrantyCode}`);
    return response.data;
  }
};
