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
import express    from 'express';
import multer     from 'multer';
import path       from 'path';
import fs         from 'fs';
import { fileURLToPath } from 'url';
import Movie      from '../models/Movie.js';
import Show       from '../models/Show.js';
import { adminMiddleware, requireSuperAdmin } from '../middleware/auth.js';
import { paginate } from '../utils/paginate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Thư mục lưu poster, backdrop và ảnh diễn viên ──────────────────────────
const POSTER_DIR   = path.resolve(__dirname, '../../frontend/client/src/assets/images/posters');
const BACKDROP_DIR = path.resolve(__dirname, '../../frontend/client/src/assets/images/backdrops');
const CAST_DIR     = path.resolve(__dirname, '../../frontend/client/src/assets/images/cast');
[POSTER_DIR, BACKDROP_DIR, CAST_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

// ── Multer storage: poster / backdrop ────────────────────────────────────────
const movieImageStorage = multer.diskStorage({
  destination: (_req, file, cb) => {
    cb(null, file.fieldname === 'poster' ? POSTER_DIR : BACKDROP_DIR);
  },
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase() || '.jpg';
    const base = path.basename(file.originalname, ext)
      .toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 40);
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});

const uploadMovieImages = multer({
  storage: movieImageStorage,
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB / file
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Chỉ chấp nhận file ảnh'), false);
  },
});

// ── Multer storage: ảnh diễn viên (tên file = tên diễn viên) ─────────────────
const castImageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, CAST_DIR),
  filename: (req, file, cb) => {
    const ext      = path.extname(file.originalname).toLowerCase() || '.jpg';
    // Lấy tên diễn viên từ body (gửi kèm formData), fallback sang tên file gốc
    const actorRaw = (req.body?.actorName || path.basename(file.originalname, ext)).trim();
    const actorSlug = actorRaw
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // bỏ dấu tiếng Việt
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    cb(null, `${actorSlug}${ext}`);
  },
});

const uploadCastImage = multer({
  storage: castImageStorage,
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Chỉ chấp nhận file ảnh'), false);
  },
});

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/movies — PUBLIC endpoint: Luôn trả toàn bộ phim
//
// ⚠️  KHÔNG đọc token. Public hoàn toàn.
//     Dùng cho: Trang chủ client, trang danh sách phim, booking flow.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { genre, language, age_rating } = req.query;
    const baseFilter = {};

    // Filter: thể loại (genre name match)
    if (genre && genre !== 'all') {
      baseFilter['genres.name'] = { $regex: genre, $options: 'i' };
    }
    // Filter: ngôn ngữ gốc
    if (language && language !== 'all') {
      baseFilter.original_language = language;
    }
    // Filter: giới hạn độ tuổi
    // Logic thực tế: chọn "Trên 13" thì cũng xem được phim T16, T18 (vì 16+ và 18+ đều ≥ 13)
    if (age_rating && age_rating !== 'all') {
      const AGE_HIERARCHY = ['P', 'K', 'T13', 'T16', 'T18'];
      const idx = AGE_HIERARCHY.indexOf(age_rating);
      if (idx !== -1 && ['T13', 'T16', 'T18'].includes(age_rating)) {
        // Lọc các rating từ vị trí đã chọn trở lên (inclusive)
        baseFilter.age_rating = { $in: AGE_HIERARCHY.slice(idx) };
      } else {
        // P và K: exact match
        baseFilter.age_rating = age_rating;
      }
    }

    const result = await paginate(Movie, baseFilter, req.query, {
      defaultSort: { release_date: -1 },
      searchFields: ['title', 'tagline', 'cast.name', 'cast'],
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
// POST /api/movies/upload-image — Upload poster hoặc backdrop (chỉ super-admin)
// Field names: 'poster' (ảnh dọc) và/hoặc 'backdrop' (ảnh ngang)
// ⚠️  PHẢI đặt TRƯỚC /:id
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/upload-image',
  adminMiddleware,
  requireSuperAdmin,
  uploadMovieImages.fields([{ name: 'poster', maxCount: 1 }, { name: 'backdrop', maxCount: 1 }]),
  (req, res) => {
    try {
      const result = {};
      if (req.files?.poster?.[0])   result.poster_path   = req.files.poster[0].filename;
      if (req.files?.backdrop?.[0]) result.backdrop_path = req.files.backdrop[0].filename;
      if (!result.poster_path && !result.backdrop_path) {
        return res.status(400).json({ message: 'Không có file ảnh nào được gửi lên' });
      }
      res.json({ message: 'Upload thành công', ...result });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/movies/upload-cast-image — Upload ảnh diễn viên (chỉ super-admin)
// Field name: 'avatar'   Body field: 'actorName' (tên diễn viên — đặt tên file)
// Lưu vào: images/cast/<actorSlug>.ext
// ⚠️  PHẢI đặt TRƯỚC /:id
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/upload-cast-image',
  adminMiddleware,
  requireSuperAdmin,
  uploadCastImage.single('avatar'),
  (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'Không có file ảnh nào được gửi lên' });
      res.json({ message: 'Upload thành công', profile_path: req.file.filename });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  },
);

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
