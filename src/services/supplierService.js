import api from './api';

export const supplierService = {
  getAll: async (params) => {
    const response = await api.get('/suppliers', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/suppliers/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/suppliers', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/suppliers/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/suppliers/${id}`);
    return response.data;
  },

  getLedger: async (id, params) => {
    const response = await api.get(`/suppliers/${id}/ledger`, { params });
    return response.data;
  }
};
