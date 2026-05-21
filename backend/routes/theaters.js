import express from 'express';
import Theater from '../models/Theater.js';
import { adminMiddleware, requireSuperAdmin } from '../middleware/auth.js';
import { paginate } from '../utils/paginate.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/theaters — Lấy danh sách rạp
// Public: client dùng để hiển thị danh sách rạp
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
// GET /api/theaters/:id — Chi tiết rạp
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const theater = await Theater.findById(req.params.id);
    if (!theater) {
      return res.status(404).json({ message: 'Theater not found' });
    }
    res.json(theater);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/theaters — Tạo rạp mới
//
// Phân quyền: Chỉ super-admin (theater_id === null) mới được tạo rạp mới
// Theater-owner không được phép tạo rạp
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
//   • Super-admin  → sửa bất kỳ rạp nào
//   • Theater-owner→ CHỈ sửa rạp mình quản lý
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    // ── Theater-owner scope enforcement ──────────────────────────────────────
    if (req.isTheaterOwner) {
      if (req.params.id !== req.theaterScope.toString()) {
        return res.status(403).json({
          message: 'Bạn chỉ có quyền chỉnh sửa thông tin rạp của mình',
        });
      }
    }

    const theater = await Theater.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(theater);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/theaters/:id — Xóa rạp
//
// Phân quyền: Chỉ super-admin mới được xóa rạp
// Theater-owner KHÔNG được xóa rạp (kể cả rạp mình quản lý)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', adminMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    await Theater.findByIdAndDelete(req.params.id);
    res.json({ message: 'Theater deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
