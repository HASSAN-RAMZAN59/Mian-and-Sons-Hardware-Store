import api from './api';

export const reportService = {
  getSalesReport: async (params) => {
    const response = await api.get('/reports/sales', { params });
    return response.data;
  },

  getInventoryReport: async (params) => {
    const response = await api.get('/reports/inventory', { params });
    return response.data;
  },

  getFinancialSummary: async (params) => {
    const response = await api.get('/reports/financial-summary', { params });
    return response.data;
  },

  getHRSummary: async (params) => {
    const response = await api.get('/reports/hr-summary', { params });
    return response.data;
  },

  exportReport: async (type, params) => {
    const response = await api.get(`/reports/${type}/export`, { 
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  getLeaveAllocations: async () => {
    const response = await api.get('/reports/leave-allocations');
    return response.data;
  },

  updateLeaveAllocations: async (allocations) => {
    const response = await api.post('/reports/leave-allocations', allocations);
    return response.data;
  }
};
