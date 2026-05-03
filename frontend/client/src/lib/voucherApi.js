import api from "./api";

export const voucherApi = {
  getAll: () => api.get("/vouchers").then(r => r.data),
  getById: (id) => api.get(`/vouchers/${id}`).then(r => r.data),
  create: (data) => api.post("/vouchers", data).then(r => r.data),
  update: (id, data) => api.put(`/vouchers/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/vouchers/${id}`).then(r => r.data),
};

export default voucherApi;
