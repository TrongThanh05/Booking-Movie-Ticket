/**
 * routes/vouchers.js
 *
 * Phân quyền RBAC:
 *   GET /    Super-admin    → tất cả voucher
 *            Cinema Manager → chỉ voucher có theater_id trong applicable_cinemas
 *   POST /   Super-admin    → tạo tùy ý
 *            Cinema Manager → tự động gắn theater_id vào applicable_cinemas
 */
import express  from 'express';
import Voucher  from '../models/Voucher.js';
import { adminMiddleware } from '../middleware/auth.js';
import { paginate } from '../utils/paginate.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/vouchers (with pagination + theater scope)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', adminMiddleware, async (req, res) => {
  try {
    let baseFilter = {};

    // Cinema Manager: chỉ thấy voucher áp dụng cho rạp mình
    if (req.user?.theater_id) {
      baseFilter = {
        $or: [
          { applicable_cinemas: req.user.theater_id },   // voucher gắn cho rạp cụ thể
          { applicable_cinemas: { $size: 0 } },           // voucher toàn hệ thống (không ràng buộc rạp)
        ],
      };
    }

    const result = await paginate(Voucher, baseFilter, req.query, {
      defaultSort: { created_at: -1 },
      searchFields: ['code', 'description'],
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/vouchers — Tạo voucher mới
//
// Cinema Manager: tự động gắn theater_id vào applicable_cinemas
//                 (đảm bảo voucher họ tạo chỉ áp dụng cho rạp của mình)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const data = { ...req.body };

    // Auto-fill applicable_cinemas cho Cinema Manager
    if (req.user?.theater_id) {
      const theaterIdStr = req.user.theater_id.toString();
      const existing = (data.applicable_cinemas || []).map((id) => id.toString());
      if (!existing.includes(theaterIdStr)) {
        data.applicable_cinemas = [...existing, req.user.theater_id];
      }
    }

    const voucher = new Voucher(data);
    await voucher.save();
    res.status(201).json(voucher);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/vouchers/:id — Cập nhật voucher
//
// Cinema Manager: chỉ sửa voucher thuộc rạp mình
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id);
    if (!voucher) return res.status(404).json({ message: 'Voucher not found' });

    // Scope check cho Cinema Manager
    if (req.user?.theater_id) {
      const belongs = voucher.applicable_cinemas
        .map((id) => id.toString())
        .includes(req.user.theater_id.toString());
      if (!belongs) {
        return res.status(403).json({ message: 'Bạn chỉ có quyền sửa voucher của rạp mình' });
      }
      // Không cho thay đổi applicable_cinemas
      delete req.body.applicable_cinemas;
    }

    Object.assign(voucher, req.body);
    voucher.updated_at = new Date();
    await voucher.save();
    res.json(voucher);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/vouchers/:id — Xóa voucher
//
// Cinema Manager: chỉ xóa voucher thuộc rạp mình
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id);
    if (!voucher) return res.status(404).json({ message: 'Voucher not found' });

    if (req.user?.theater_id) {
      const belongs = voucher.applicable_cinemas
        .map((id) => id.toString())
        .includes(req.user.theater_id.toString());
      if (!belongs) {
        return res.status(403).json({ message: 'Bạn chỉ có quyền xóa voucher của rạp mình' });
      }
    }

    await Voucher.findByIdAndDelete(req.params.id);
    res.json({ message: 'Voucher deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;