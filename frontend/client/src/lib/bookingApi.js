import api from "./api";

export const bookingApi = {
  getByUser: (userId) => api.get(`/bookings/user/${userId}`).then(r => r.data),
  getById: (id) => api.get(`/bookings/${id}`).then(r => r.data),
  create: (data) => api.post("/bookings", data).then(r => r.data),
  cancel: (id) => api.put(`/bookings/${id}/cancel`).then(r => r.data),
};

export default bookingApi;
