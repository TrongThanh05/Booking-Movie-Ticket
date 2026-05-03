import api from "./api";

export const movieApi = {
  getAll: () => api.get("/movies"),
  getById: (id) => api.get(`/movies/${id}`),
  create: (data) => api.post("/movies", data),
  update: (id, data) => api.put(`/movies/${id}`, data),
  delete: (id) => api.delete(`/movies/${id}`),
  updateImages: (id, data) => api.put(`/movies/${id}/images`, data),
};

export default movieApi;
