import api from "./api";

export const roomApi = {
  getAll: (theaterId) =>
    api.get(theaterId ? `/rooms?theater_id=${theaterId}` : "/rooms").then(r => r.data),
  getById: (id) => api.get(`/rooms/${id}`).then(r => r.data),
  getSeats: (id) => api.get(`/rooms/${id}/seats`).then(r => r.data),
  create: (data) => api.post("/rooms", data).then(r => r.data),
  update: (id, data) => api.put(`/rooms/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/rooms/${id}`).then(r => r.data),
};

export default roomApi;
