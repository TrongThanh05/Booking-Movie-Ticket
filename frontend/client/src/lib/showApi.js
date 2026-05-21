import api from "./api";

export const showApi = {
  getAll: (params) => api.get("/shows", { params: { limit: 999, ...params } }).then(r => r.data?.data || r.data),
  getById: (id) => api.get(`/shows/${id}`).then(r => r.data),
  create: (data) => api.post("/shows", data).then(r => r.data),
  update: (id, data) => api.put(`/shows/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/shows/${id}`).then(r => r.data),
};

export default showApi;
