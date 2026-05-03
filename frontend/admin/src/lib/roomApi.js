import api from "./api";

export const roomApi = {
  getAll: (theaterId) =>
    api.get(theaterId ? `/rooms?theater_id=${theaterId}` : "/rooms"),
  getById: (id) => api.get(`/rooms/${id}`),
  getSeats: (id) => api.get(`/rooms/${id}/seats`),
  create: (data) => api.post("/rooms", data),
  update: (id, data) => api.put(`/rooms/${id}`, data),
  delete: (id) => api.delete(`/rooms/${id}`),
};

export default roomApi;
