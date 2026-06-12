import api from './api';

export const payrollService = {
  getAll: async (branchId) => {
    const params = {};
    if (branchId) params.branchId = branchId;
    const response = await api.get('/payroll', { params });
    return response.data;
  },
  create: async (data) => {
    console.log('[payrollService.create] payload', data);
    const response = await api.post('/payroll', data);
    console.log('[payrollService.create] response', response.data);
    return response.data;
  },
  getByEmployee: async (employeeId, branchId) => {
    const params = {};
    if (branchId) params.branchId = branchId;
    const response = await api.get(`/payroll/${employeeId}`, { params });
    return response.data;
  },
  update: async (id, data) => {
    console.log('[payrollService.update] payload', { id, data });
    const response = await api.put(`/payroll/${id}`, data);
    console.log('[payrollService.update] response', response.data);
    return response.data;
  },
  // Add update and delete methods as needed
};
