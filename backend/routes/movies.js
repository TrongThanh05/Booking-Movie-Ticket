/**
 * routes/movies.js
 *
 * Phân quyền RBAC:
 *   GET /           → Public + optional scope
 *                     Super-admin   : tất cả phim
 *                     Cinema Manager: chỉ phim đang chiếu tại rạp mình
 *   GET /:id        → Public
 *   POST /          → Chỉ super-admin (Cinema Manager không được thêm phim mới)
 *   PUT /:id        → Chỉ super-admin
 *   DELETE /:id     → Chỉ super-admin
 *   PUT /:id/images → Chỉ super-admin
 */
import express from 'express';
import Movie   from '../models/Movie.js';
import Show    from '../models/Show.js';
import { adminMiddleware, requireSuperAdmin } from '../middleware/auth.js';
import { paginate } from '../utils/paginate.js';


const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/movies — PUBLIC endpoint: Luôn trả toàn bộ phim
//
// ⚠️  KHÔNG đọc token. Public hoàn toàn.
//     Dùng cho: Trang chủ client, trang danh sách phim, booking flow.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await paginate(Movie, {}, req.query, {
      defaultSort: { createdAt: -1 },
      searchFields: ['title', 'tagline', 'original_language'],
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/movies/admin — PRIVATE: Lấy phim có RBAC
//
// ⚠️  PHẢI đặt TRƯỚC /:id để Express không nhầm 'admin' là một ID.
//
// Phân quyền (yêu cầu adminMiddleware):
//   • Super-admin    → tất cả phim trong DB
//   • Cinema Manager → CHỈ phim đang có suất chiếu tại rạp mình
//
// Dùng cho: Admin Dashboard > Quản lý Phim (MovieList.jsx)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/admin', adminMiddleware, async (req, res) => {
  try {
    let baseFilter = {};
    if (req.isTheaterOwner && req.theaterScope) {
      // Cinema Manager: chỉ phim có suất chiếu tại rạp của mình
      const movieIds = await Show
        .find({ cinema: req.theaterScope })
        .distinct('movie');
      baseFilter = { _id: { $in: movieIds } };
    }
    const result = await paginate(Movie, baseFilter, req.query, {
      defaultSort: { createdAt: -1 },
      searchFields: ['title', 'tagline', 'original_language'],
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/movies/:id — Chi tiết phim (public)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ message: 'Movie not found' });
    res.json(movie);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/movies — Tạo phim mới (chỉ super-admin)
// Cinema Manager không được thêm phim toàn cục vào hệ thống
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', adminMiddleware, requireSuperAdmin, async (req, res) => {
  const movie = new Movie(req.body);
  try {
    const savedMovie = await movie.save();
    res.status(201).json(savedMovie);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/movies/:id — Cập nhật phim (chỉ super-admin)
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', adminMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const movie = await Movie.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!movie) return res.status(404).json({ message: 'Movie not found' });
    res.json(movie);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/movies/:id — Xóa phim (chỉ super-admin)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', adminMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const movie = await Movie.findByIdAndDelete(req.params.id);
    if (!movie) return res.status(404).json({ message: 'Movie not found' });
    res.json({ message: 'Movie deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/movies/:id/images — Cập nhật ảnh (chỉ super-admin)
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id/images', adminMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const { poster_path, backdrop_path, casts } = req.body;
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ message: 'Movie not found' });

    if (poster_path)   movie.poster_path   = poster_path;
    if (backdrop_path) movie.backdrop_path = backdrop_path;
    if (casts)         movie.casts         = casts;

    const updatedMovie = await movie.save();
    res.json({ message: 'Image paths updated successfully', movie: updatedMovie });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
