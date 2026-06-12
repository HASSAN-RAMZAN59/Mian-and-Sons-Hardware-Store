import api from './api';

export const stockTransferService = {
  async create(transfer) {
    const response = await api.post('/stock-transfers', transfer);
    return response.data;
  },
  async getAll() {
    const response = await api.get('/stock-transfers');
    return response.data;
  }
};
