import api from './api';

export const inventoryService = {
  getAll: async () => {
    const response = await api.get('/inventory');
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/inventory', data);
    return response.data;
  },
  update: async (itemId, data) => {
    const response = await api.put(`/inventory/${itemId}`, data);
    return response.data;
  }
};
