import api from "./api";

export const theaterApi = {
  getAll: () => api.get("/theaters"),
  getById: (id) => api.get(`/theaters/${id}`),
  create: (data) => api.post("/theaters", data),
  update: (id, data) => api.put(`/theaters/${id}`, data),
  delete: (id) => api.delete(`/theaters/${id}`),
};

export default theaterApi;
