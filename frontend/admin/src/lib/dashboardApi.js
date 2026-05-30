import { api } from './api.js';

export const dashboardApi = {
  /** GET /api/admin/dashboard/stats */
  getStats: () => api.get('/admin/dashboard/stats'),
};

export default dashboardApi;
