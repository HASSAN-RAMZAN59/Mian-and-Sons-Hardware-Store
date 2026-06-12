import api from './api';

export const leaveService = {
  getAll: async (branchId) => {
    const params = {};
    if (branchId) params.branchId = branchId;
    const response = await api.get('/leaves', { params });
    return response.data;
  },
  create: async (data) => {
    console.log('[leaveService.create] payload', data);
    const response = await api.post('/leaves', data);
    console.log('[leaveService.create] response', response.data);
    return response.data;
  },
  update: async (id, data) => {
    console.log('[leaveService.update] payload', { id, data });
    const response = await api.put(`/leaves/${id}`, data);
    console.log('[leaveService.update] response', response.data);
    return response.data;
  },
  getByEmployee: async (employeeId, branchId) => {
    const params = {};
    if (branchId) params.branchId = branchId;
    const response = await api.get(`/leaves/${employeeId}`, { params });
    return response.data;
  },
  // Add update and delete methods as needed
};
