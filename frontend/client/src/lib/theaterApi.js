import api from "./api";

export const theaterApi = {
  getAll: (params) => api.get("/theaters", { params: { limit: 999, ...params } }).then(r => r.data?.data || r.data),
  getById: (id) => api.get(`/theaters/${id}`).then(r => r.data),
  create: (data) => api.post("/theaters", data).then(r => r.data),
  update: (id, data) => api.put(`/theaters/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/theaters/${id}`).then(r => r.data),
};

export default theaterApi;
