import api from "./api";
import { publicApi } from "./api";

export const theaterApi = {
  // ─────────────────────────────────────────────────────────────
  // PUBLIC — Không gắn token.
  //   Dùng cho: trang chủ client, trang chọn rạp, booking flow.
  //   Kết quả: backend luôn trả toàn bộ hệ thống rạp.
  // ─────────────────────────────────────────────────────────────
  getAll:  (params) => publicApi.get("/theaters", { params: { limit: 999, ...params } }).then(r => r.data?.data || r.data),
  getById: (id)     => publicApi.get(`/theaters/${id}`).then(r => r.data),

  // ─────────────────────────────────────────────────────────────
  // PRIVATE — Cần token (chỉ dùng nếu có luồng sử dụng riêng).
  // ─────────────────────────────────────────────────────────────
  create: (data)     => api.post("/theaters", data).then(r => r.data),
  update: (id, data) => api.put(`/theaters/${id}`, data).then(r => r.data),
  delete: (id)       => api.delete(`/theaters/${id}`).then(r => r.data),
};

export default theaterApi;
