import api from './api';

export const ledgerService = {
  getAll: async (fromDate, toDate) => {
    const params = {};
    if (fromDate) params.from_date = fromDate;
    if (toDate) params.to_date = toDate;
    const response = await api.get('/ledger', { params });
    return response.data;
  }
};
