/**
 * routes/vouchers.js
 *
 * Phân quyền RBAC:
 *   POST /validate  → PUBLIC (không cần đăng nhập, dùng trong booking flow)
 *   GET /           → Super-admin: tất cả voucher
 *                     Cinema Manager: chỉ voucher áp dụng cho rạp mình
 *   POST /          → Super-admin: tạo tùy ý
 *                     Cinema Manager: tự động gắn theater_id vào applicable_cinemas
 */
import express  from 'express';
import Voucher  from '../models/Voucher.js';
import Show     from '../models/Show.js';
import { adminMiddleware } from '../middleware/auth.js';
import { paginate } from '../utils/paginate.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/vouchers/validate  ← PUBLIC (không cần token)
//
// Body: { code, show_id, order_amount }
//   code         – Mã voucher người dùng nhập
//   show_id      – ID suất chiếu đang đặt (để lấy cinema_id & movie_id)
//   order_amount – Tổng tiền trước khi áp dụng voucher
//
// Trả về (nếu hợp lệ):
//   { valid: true, voucher: {...}, discount_amount: <số tiền giảm thực tế> }
// Trả về (nếu không hợp lệ):
//   { valid: false, message: "Lý do cụ thể" }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/validate', async (req, res) => {
  try {
    const { code, show_id, order_amount } = req.body;

    if (!code || !show_id) {
      return res.status(400).json({ valid: false, message: 'Thiếu mã voucher hoặc thông tin suất chiếu' });
    }

    // ── 1. Tìm voucher theo code (không phân biệt hoa/thường) ────────────────
    const voucher = await Voucher.findOne({ code: code.trim().toUpperCase() })
      .populate('applicable_movies', '_id genres')
      .populate('applicable_cinemas', '_id');

    if (!voucher) {
      return res.json({ valid: false, message: 'Mã khuyến mãi không tồn tại' });
    }

    // ── 2. Kiểm tra trạng thái kích hoạt ─────────────────────────────────────
    if (!voucher.is_active) {
      return res.json({ valid: false, message: 'Mã khuyến mãi đã bị vô hiệu hóa' });
    }

    // ── 3. Kiểm tra thời hạn ──────────────────────────────────────────────────
    const now = new Date();
    if (voucher.start_date && now < new Date(voucher.start_date)) {
      return res.json({ valid: false, message: 'Mã khuyến mãi chưa đến ngày bắt đầu sử dụng' });
    }
    if (voucher.expires_at && now > new Date(voucher.expires_at)) {
      return res.json({ valid: false, message: 'Mã khuyến mãi đã hết hạn sử dụng' });
    }

    // ── 4. Kiểm tra số lượt sử dụng ───────────────────────────────────────────
    if (voucher.usage_limit != null && voucher.used_count >= voucher.usage_limit) {
      return res.json({ valid: false, message: 'Mã khuyến mãi đã hết lượt sử dụng' });
    }

    // ── 5. Lấy thông tin suất chiếu để kiểm tra phạm vi áp dụng ─────────────
    const show = await Show.findById(show_id)
      .populate('movie', '_id genres')
      .populate('cinema', '_id')
      .lean();

    if (!show) {
      return res.status(400).json({ valid: false, message: 'Không tìm thấy suất chiếu' });
    }

    // ── 6. Kiểm tra phạm vi RẠP ───────────────────────────────────────────────
    //    applicable_cinemas rỗng = áp dụng tất cả rạp
    if (voucher.applicable_cinemas && voucher.applicable_cinemas.length > 0) {
      const cinemaIds = voucher.applicable_cinemas.map((c) => c._id.toString());
      const showCinemaId = (show.cinema?._id || show.cinema)?.toString();
      if (!cinemaIds.includes(showCinemaId)) {
        return res.json({ valid: false, message: 'Mã khuyến mãi không áp dụng tại rạp này' });
      }
    }

    // ── 7. Kiểm tra phạm vi PHIM ─────────────────────────────────────────────
    //    applicable_movies rỗng = áp dụng tất cả phim
    if (voucher.applicable_movies && voucher.applicable_movies.length > 0) {
      const movieIds = voucher.applicable_movies.map((m) => m._id.toString());
      const showMovieId = (show.movie?._id || show.movie)?.toString();
      if (!movieIds.includes(showMovieId)) {
        // Fallback: kiểm tra theo thể loại phim
        if (voucher.applicable_genres && voucher.applicable_genres.length > 0) {
          const showGenreNames = (show.movie?.genres || []).map((g) => g.name?.toLowerCase());
          const voucherGenres  = voucher.applicable_genres.map((g) => g.toLowerCase());
          const genreMatch     = showGenreNames.some((g) => voucherGenres.includes(g));
          if (!genreMatch) {
            return res.json({ valid: false, message: 'Mã khuyến mãi không áp dụng cho phim hoặc thể loại phim này' });
          }
        } else {
          return res.json({ valid: false, message: 'Mã khuyến mãi không áp dụng cho bộ phim này' });
        }
      }
    } else if (voucher.applicable_genres && voucher.applicable_genres.length > 0) {
      // Chỉ có ràng buộc theo thể loại (không ràng buộc phim cụ thể)
      const showGenreNames = (show.movie?.genres || []).map((g) => g.name?.toLowerCase());
      const voucherGenres  = voucher.applicable_genres.map((g) => g.toLowerCase());
      const genreMatch     = showGenreNames.some((g) => voucherGenres.includes(g));
      if (!genreMatch) {
        return res.json({ valid: false, message: 'Mã khuyến mãi không áp dụng cho thể loại phim này' });
      }
    }

    // ── 8. Kiểm tra giá trị đơn hàng tối thiểu ───────────────────────────────
    const amount = Number(order_amount) || 0;
    if (voucher.min_order_value && amount < voucher.min_order_value) {
      const fmt = new Intl.NumberFormat('vi-VN').format(voucher.min_order_value);
      return res.json({
        valid:   false,
        message: `Đơn hàng tối thiểu ${fmt}đ để sử dụng mã này`,
      });
    }

    // ── 9. Tính số tiền giảm thực tế ─────────────────────────────────────────
    let discount_amount = 0;
    if (voucher.discount_type === 'percentage') {
      discount_amount = Math.round((amount * voucher.discount) / 100);
      // Áp dụng giới hạn giảm tối đa nếu có
      if (voucher.max_discount_amount && discount_amount > voucher.max_discount_amount) {
        discount_amount = voucher.max_discount_amount;
      }
    } else {
      // fixed
      discount_amount = Math.min(voucher.discount, amount); // không giảm quá tổng tiền
    }

    // ── 10. Trả kết quả hợp lệ ───────────────────────────────────────────────
    return res.json({
      valid: true,
      discount_amount,
      voucher: {
        _id:              voucher._id,
        code:             voucher.code,
        discount:         voucher.discount,
        discount_type:    voucher.discount_type,
        description:      voucher.description,
        max_discount_amount: voucher.max_discount_amount,
      },
    });

  } catch (error) {
    console.error('[Voucher Validate]', error);
    res.status(500).json({ valid: false, message: 'Lỗi server khi kiểm tra voucher' });
  }
});

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