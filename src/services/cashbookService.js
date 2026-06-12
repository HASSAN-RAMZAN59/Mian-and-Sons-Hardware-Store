import api from './api';

export const cashbookService = {
  getOpeningBalance: async () => {
    const response = await api.get('/cashbook/opening-balance');
    return response.data;
  },
  setOpeningBalance: async (amount, date) => {
    const response = await api.post('/cashbook/opening-balance', { amount, date });
    return response.data;
  },
  // Placeholder for future unified transactions endpoint
  getTransactions: async () => {
    const response = await api.get('/cashbook/transactions');
    return response.data;
  }
};
