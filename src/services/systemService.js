import api from './api';

export const systemService = {
  getBackupStatus: async () => {
    const response = await api.get('/system/backup/status');
    return response.data;
  },

  backupDatabase: async () => {
    const response = await api.post('/system/backup');
    return response.data;
  },

  restoreDatabase: async () => {
    const response = await api.post('/system/backup/restore');
    return response.data;
  },

  exportDatabase: async () => {
    const response = await api.get('/system/backup/export');
    return response.data;
  },

  getSetting: async (key) => {
    const response = await api.get(`/system/settings/${key}`);
    return response.data;
  },

  saveSetting: async (key, payload) => {
    const response = await api.post(`/system/settings/${key}`, payload);
    return response.data;
  }
};
