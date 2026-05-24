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
// GET /api/theaters — Lấy danh sách rạp (có phân quyền)
//
// Phân quyền:
//   • Public (client)   → gọi không cần token, lấy toàn bộ (dùng cho trang chọn rạp)
//   • Super-admin       → trả toàn bộ (không filter)
//   • Cinema Manager    → CHỈ trả về đúng rạp mình quản lý
//
// Cách phân biệt: nếu có token hợp lệ và role === 'admin' thì áp dụng RBAC;
// không có token thì trả full list (dành cho client public).
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    // ── Kiểm tra xem có token admin không (optional auth) ──────────────────
    let isAdmin        = false;
    let isTheaterOwner = false;
    let theaterScope   = null;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const jwt     = (await import('jsonwebtoken')).default;
        const User    = (await import('../models/User.js')).default;
        const decoded = jwt.verify(
          authHeader.split(' ')[1],
          process.env.JWT_SECRET || 'your-secret-key',
        );
        const user = await User.findById(decoded.id).select('role theater_id');
        if (user?.role === 'admin') {
          isAdmin        = true;
          isTheaterOwner = Boolean(user.theater_id);
          theaterScope   = user.theater_id || null;
        }
      } catch { /* token không hợp lệ → xử lý như public */ }
    }

    // ── Cinema Manager: chỉ trả về rạp của mình ───────────────────────────
    if (isAdmin && isTheaterOwner && theaterScope) {
      const theater = await Theater.findById(theaterScope);
      if (!theater) {
        return res.status(404).json({ message: 'Không tìm thấy rạp được gán cho tài khoản này' });
      }
      // Trả về dạng paginated để frontend không phải xử lý 2 kiểu response
      return res.json({
        data: [theater],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 1, limit: 1,
          hasNextPage: false, hasPrevPage: false },
      });
    }

    // ── Super-admin hoặc Public: trả toàn bộ (có pagination + search) ─────
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

