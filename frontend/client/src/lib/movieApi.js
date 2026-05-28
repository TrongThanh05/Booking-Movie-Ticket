import api from "./api";
import { publicApi } from "./api";

export const movieApi = {
  // ─────────────────────────────────────────────────────────────
  // PUBLIC — Không gắn token.
  //   Dùng cho: Trang chủ client, danh sách phim, booking flow.
  //   Kết quả: backend luôn trả toàn bộ phim.
  // ─────────────────────────────────────────────────────────────
  getAll:  (params) => publicApi.get("/movies", { params: { limit: 999, ...params } }).then(r => r.data?.data || r.data),
  getById: (id)     => publicApi.get(`/movies/${id}`).then(r => r.data),

  // ─────────────────────────────────────────────────────────────
  // PRIVATE — Cần token (chỉ admin mới được tạo/sửa/xóa).
  // ─────────────────────────────────────────────────────────────
  create:       (data)     => api.post("/movies", data).then(r => r.data),
  update:       (id, data) => api.put(`/movies/${id}`, data).then(r => r.data),
  delete:       (id)       => api.delete(`/movies/${id}`).then(r => r.data),
  updateImages: (id, data) => api.put(`/movies/${id}/images`, data).then(r => r.data),
};

export default movieApi;
