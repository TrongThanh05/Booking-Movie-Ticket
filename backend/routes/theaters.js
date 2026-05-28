import express from 'express';
import Theater from '../models/Theater.js';
import {
  adminMiddleware,
  requireSuperAdmin,
  theaterAdminMiddleware,
  scopeToTheater,
} from '../middleware/auth.js';
import { paginate } from '../utils/paginate.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/theaters — PUBLIC endpoint: Luôn trả toàn bộ rạp
//
// ⚠️  KHÔNG đọc token ở đây. Endpoint này là public hoàn toàn.
//     Bất kỳ ai (kể cả Cinema Manager đang đăng nhập) gọi vào đây
//     cũng nhận được toàn bộ danh sách rạp.
//     Dùng cho: trang chủ client, trang chọn rạp, booking flow.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await paginate(Theater, {}, req.query, {
      defaultSort: { createdAt: -1 },
      searchFields: ['name', 'location', 'address'],
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/theaters/admin — PRIVATE endpoint: Lấy rạp có RBAC
//
// ⚠️  PHẢI đặt TRƯỚC /:id để Express không nhầm 'admin' là một ID.
//
// Phân quyền (yêu cầu adminMiddleware):
//   • Super-admin (theater_id = null) → trả toàn bộ rạp (pagination + search)
//   • Cinema Manager (theater_id ≠ null) → CHỈ trả đúng 1 rạp mình quản lý
//
// Dùng cho: Admin Dashboard > Quản lý Cụm Rạp (TheaterList.jsx)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/admin', adminMiddleware, async (req, res) => {
  try {
    // ── Cinema Manager: scope về rạp của mình ─────────────────────────────
    if (req.isTheaterOwner && req.theaterScope) {
      const theater = await Theater.findById(req.theaterScope);
      if (!theater) {
        return res.status(404).json({
          message: 'Không tìm thấy rạp được gán cho tài khoản này',
        });
      }
      // Trả dạng paginated để AdminList không phải xử lý 2 kiểu response
      return res.json({
        data: [theater],
        pagination: {
          currentPage: 1, totalPages: 1, totalItems: 1, limit: 1,
          hasNextPage: false, hasPrevPage: false,
        },
      });
    }

    // ── Super-admin: trả toàn bộ (pagination + search) ────────────────────
    const result = await paginate(Theater, {}, req.query, {
      defaultSort: { createdAt: -1 },
      searchFields: ['name', 'location', 'address'],
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/theaters/:id — Chi tiết rạp (public)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const theater = await Theater.findById(req.params.id);
    if (!theater) return res.status(404).json({ message: 'Theater not found' });
    res.json(theater);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/theaters — Tạo rạp mới
// Phân quyền: Chỉ super-admin
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', adminMiddleware, requireSuperAdmin, async (req, res) => {
  const theater = new Theater(req.body);
  try {
    const savedTheater = await theater.save();
    res.status(201).json(savedTheater);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/theaters/:id — Cập nhật thông tin rạp
//
// Phân quyền:
//   • Super-admin   → sửa bất kỳ rạp nào
//   • Cinema Manager→ CHỈ sửa rạp mình quản lý (theaterAdminMiddleware chặn)
//
// theaterAdminMiddleware đọc req.params.id (= theaterId) và so sánh với
// req.user.theater_id → 403 nếu không khớp.
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', adminMiddleware, theaterAdminMiddleware, async (req, res) => {
  try {
    const theater = await Theater.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );
    if (!theater) return res.status(404).json({ message: 'Theater not found' });
    res.json(theater);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/theaters/:id — Xóa rạp
// Phân quyền: Chỉ super-admin (Cinema Manager không được xóa kể cả rạp mình)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', adminMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const theater = await Theater.findByIdAndDelete(req.params.id);
    if (!theater) return res.status(404).json({ message: 'Theater not found' });
    res.json({ message: 'Theater deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

