import api from './api';

export const auditService = {
  getAll: async () => {
    const response = await api.get('/audit');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/audit/${id}`);
    return response.data;
  },

  clearAll: async () => {
    const response = await api.delete('/audit');
    return response.data;
  },
};
