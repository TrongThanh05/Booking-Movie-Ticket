/**
 * reviews.js — Admin routes cho hệ thống kiểm duyệt đánh giá
 *
 * Endpoints:
 *   GET    /api/reviews/admin           → Danh sách (filter status, search, pagination)
 *   GET    /api/reviews/admin/reported  → Reviews bị báo cáo nhiều (reportCount >= 3)
 *   PATCH  /api/reviews/admin/:id/approve → Duyệt review
 *   PATCH  /api/reviews/admin/:id/reject  → Từ chối + lý do
 *   DELETE /api/reviews/admin/:id         → Xóa cứng (spam/vi phạm nặng)
 *
 * Phân quyền: adminMiddleware (cả super-admin & theater-manager)
 * Lưu ý: recalculateMovieRating() được gọi tự động qua Review post-hooks
 */
import express from 'express';
import Review  from '../models/Review.js';
import { adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

// ── Helper: parse pagination params ──────────────────────────────────────────
const parsePage = (q) => ({
  page:  Math.max(1,  parseInt(q.page)  || 1),
  limit: Math.min(50, parseInt(q.limit) || 15),
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reviews/admin/reported
// Reviews bị báo cáo >= ngưỡng (mặc định 3 lần) — ưu tiên xử lý
// ─────────────────────────────────────────────────────────────────────────────
router.get('/admin/reported', adminMiddleware, async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 3;
    const { page, limit } = parsePage(req.query);
    const skip = (page - 1) * limit;

    const filter = { reportCount: { $gte: threshold } };
    const [data, totalItems] = await Promise.all([
      Review.find(filter)
        .populate('user',  'name email avatar')
        .populate('movie', 'title poster_path')
        .sort({ reportCount: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
    ]);

    res.json({
      data,
      pagination: {
        currentPage: page,
        totalPages:  Math.ceil(totalItems / limit) || 1,
        totalItems,
        limit,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reviews/admin
// Query: ?status=pending|approved|rejected&search=&page=&limit=
// ─────────────────────────────────────────────────────────────────────────────
router.get('/admin', adminMiddleware, async (req, res) => {
  try {
    const { page, limit } = parsePage(req.query);
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (req.query.status && ['pending', 'approved', 'rejected'].includes(req.query.status)) {
      filter.status = req.query.status;
    }
    if (req.query.reported === 'true') {
      filter.reportCount = { $gte: 3 };
    }

    const [data, totalItems] = await Promise.all([
      Review.find(filter)
        .populate('user',  'name email avatar')
        .populate('movie', 'title poster_path')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
    ]);

    res.json({
      data,
      pagination: {
        currentPage:  page,
        totalPages:   Math.ceil(totalItems / limit) || 1,
        totalItems,
        limit,
        hasNextPage:  page < Math.ceil(totalItems / limit),
        hasPrevPage:  page > 1,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/reviews/admin/:id/approve
// Duyệt review → status = 'approved', tự động recalculate rating phim
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/admin/:id/approve', adminMiddleware, async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', rejectionReason: null },
      { new: true },
    ).populate('user', 'name').populate('movie', 'title');

    if (!review) return res.status(404).json({ message: 'Không tìm thấy đánh giá' });

    // recalculateMovieRating() tự động chạy qua post('findOneAndUpdate') hook
    res.json({ message: 'Đã duyệt đánh giá thành công', review });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/reviews/admin/:id/reject
// Từ chối review → status = 'rejected', lưu lý do
// Body: { reason: string }
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/admin/:id/reject', adminMiddleware, async (req, res) => {
  try {
    const { reason } = req.body;

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      {
        status: 'rejected',
        rejectionReason: reason?.trim() || 'Vi phạm tiêu chuẩn cộng đồng',
      },
      { new: true },
    ).populate('user', 'name').populate('movie', 'title');

    if (!review) return res.status(404).json({ message: 'Không tìm thấy đánh giá' });

    res.json({ message: 'Đã từ chối đánh giá', review });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/reviews/admin/:id
// Xóa cứng — dùng cho spam/vi phạm nặng, tự động recalculate rating
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/admin/:id', adminMiddleware, async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ message: 'Không tìm thấy đánh giá' });

    // post('findOneAndDelete') hook tự động recalculate rating
    res.json({ message: 'Đã xóa đánh giá' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
