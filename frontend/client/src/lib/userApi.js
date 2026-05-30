import api from "./api";

export const userApi = {
  login: (credentials) => api.post("/users/login", credentials).then(r => r.data),
  register: (data) => api.post("/users/register", data).then(r => r.data),
  getProfile: (id) => api.get(`/users/profile/${id}`).then(r => r.data),
  update: (id, data) => api.put(`/users/${id}`, data).then(r => r.data),
};

export default userApi;
