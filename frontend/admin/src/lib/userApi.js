import api from "./api";

export const userApi = {
  login: (credentials) => api.post("/users/login", credentials),
  register: (data) => api.post("/users/register", data),
  getProfile: (id) => api.get(`/users/profile/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
};

export default userApi;
