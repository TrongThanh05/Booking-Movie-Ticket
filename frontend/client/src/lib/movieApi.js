import api from "./api";

export const movieApi = {
  getAll: (params) => api.get("/movies", { params: { limit: 999, ...params } }).then(r => r.data?.data || r.data),
  getById: (id) => api.get(`/movies/${id}`).then(r => r.data),
  create: (data) => api.post("/movies", data).then(r => r.data),
  update: (id, data) => api.put(`/movies/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/movies/${id}`).then(r => r.data),
  updateImages: (id, data) => api.put(`/movies/${id}/images`, data).then(r => r.data),
};

export default movieApi;
