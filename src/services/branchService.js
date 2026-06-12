import api from './api';

export const branchService = {
  getAll: async () => {
    const response = await api.get('/branches');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/branches/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/branches', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/branches/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/branches/${id}`);
    return response.data;
  }
};
