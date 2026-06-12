import api from './api';

export const purchaseOrderService = {
  async create(po) {
    const response = await api.post('/purchase-orders', po);
    return response.data;
  },
  async bulkCreate(pos) {
    const response = await api.post('/purchase-orders/bulk', pos);
    return response.data;
  },
  async getAll() {
    const response = await api.get('/purchase-orders');
    return response.data;
  }
};
