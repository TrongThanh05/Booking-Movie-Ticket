import api from "./api";
import { publicApi } from "./api";

export const showApi = {
  // ─────────────────────────────────────────────────────────────
  // PUBLIC — Không gắn token.
  //   Dùng cho: Trang chọn suất chiếu, booking flow.
  //   Kết quả: backend luôn trả toàn bộ lịch chiếu.
  // ─────────────────────────────────────────────────────────────
  getAll:  (params) => publicApi.get("/shows", { params: { limit: 999, ...params } }).then(r => r.data?.data || r.data),
  getById: (id)     => publicApi.get(`/shows/${id}`).then(r => r.data),

  // ─────────────────────────────────────────────────────────────
  // PRIVATE — Cần token (chỉ user/admin mới được tạo/sửa/xóa).
  // ─────────────────────────────────────────────────────────────
  create: (data)     => api.post("/shows", data).then(r => r.data),
  update: (id, data) => api.put(`/shows/${id}`, data).then(r => r.data),
  delete: (id)       => api.delete(`/shows/${id}`).then(r => r.data),
};

export default showApi;
