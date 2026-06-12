import api from './api';

export const daybookService = {
  getTransactions: async (date) => {
    const response = await api.get(`/daybook/transactions?date=${date}`);
    return response.data;
  }
};
