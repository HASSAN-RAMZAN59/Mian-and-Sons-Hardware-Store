import api from './api';

export const attendanceService = {
  getAll: async (branchId) => {
    const params = {};
    if (branchId) params.branchId = branchId;
    const response = await api.get('/attendance', { params });
    return response.data;
  },
  create: async (data) => {
    console.log('[attendanceService.create] payload', data);
    const response = await api.post('/attendance', data);
    console.log('[attendanceService.create] response', response.data);
    return response.data;
  },
  getByEmployee: async (employeeId) => {
    const response = await api.get(`/attendance/${employeeId}`);
    return response.data;
  },
  // Add update and delete methods as needed
};
