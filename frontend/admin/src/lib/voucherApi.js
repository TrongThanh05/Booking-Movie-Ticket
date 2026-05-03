import api from "./api";

export const voucherApi = {
  getAll: () => api.get("/vouchers"),
  getById: (id) => api.get(`/vouchers/${id}`),
  create: (data) => api.post("/vouchers", data),
  update: (id, data) => api.put(`/vouchers/${id}`, data),
  delete: (id) => api.delete(`/vouchers/${id}`),
};

export default voucherApi;
