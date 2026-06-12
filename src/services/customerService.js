import api from './api';

export const customerService = {
  getAll: async (params) => {
    const response = await api.get('/customers', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/customers/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/customers', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/customers/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/customers/${id}`);
    return response.data;
  },

  getLedger: async (id, params) => {
    const response = await api.get(`/customers/${id}/ledger`, { params });
    return response.data;
  },
  
  getSummary: async (id) => {
    const response = await api.get(`/customers/${id}/summary`);
    return response.data;
  }
};
