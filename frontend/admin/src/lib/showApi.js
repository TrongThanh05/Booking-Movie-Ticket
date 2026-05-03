import api from "./api";

export const showApi = {
  getAll: () => api.get("/shows"),
  getById: (id) => api.get(`/shows/${id}`),
  create: (data) => api.post("/shows", data),
  update: (id, data) => api.put(`/shows/${id}`, data),
  delete: (id) => api.delete(`/shows/${id}`),
};

export default showApi;
