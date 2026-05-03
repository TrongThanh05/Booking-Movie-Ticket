import api from "./api";

export const bookingApi = {
  getByUser: (userId) => api.get(`/bookings/user/${userId}`),
  getById: (id) => api.get(`/bookings/${id}`),
  create: (data) => api.post("/bookings", data),
  cancel: (id) => api.put(`/bookings/${id}/cancel`),
};

export default bookingApi;
