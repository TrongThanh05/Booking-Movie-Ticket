import express from 'express';
import User    from '../models/User.js';
import Theater from '../models/Theater.js';
import Booking from '../models/Booking.js';
import Show    from '../models/Show.js';
import jwt     from 'jsonwebtoken';
import authMiddleware, { adminMiddleware, requireSuperAdmin, optionalAdminAuth } from '../middleware/auth.js';
import { paginate } from '../utils/paginate.js';

const router = express.Router();

/**
 * Sinh JWT token.
 * Payload chứa: id, role, theater_id (nếu có).
 * Middleware auth có thể decode nhanh mà không cần query DB lần 2.
 */
const generateToken = (user) =>
  jwt.sign(
    {
      id:         user._id,
      role:       user.role,
      theater_id: user.theater_id || null,
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' },
  );

/** Trường public trả về (không bao gồm password) */
const publicFields = (user) => ({
  _id:        user._id,
  name:       user.name,
  email:      user.email,
  phone:      user.phone      || '',
  role:       user.role,
  avatar:     user.avatar     || '',
  /**
   * theater_id: ObjectId (hoặc null).
   * Frontend dùng để xác định admin đang quản lý rạp nào
   * và điều hướng vào đúng trang admin-theater.
   */
  theater_id: user.theater_id || null,
});

// ── GET /api/users — Danh sách user (admin) ─────────────────────────────────────────────
// Phân quyền:
//   Super-admin    → toàn bộ user (role='user')
//   Cinema Manager → chỉ khách hàng đã mua vé tại rạp của mình
// ───────────────────────────────────────────────────────────────────────────────────
router.get('/', adminMiddleware, optionalAdminAuth, async (req, res) => {
  try {
    let baseFilter = { role: 'user' }; // luôn chỉ lấy user thường

    // ── Cinema Manager scope ──────────────────────────────────────────────
    if (req.user?.theater_id) { // req.user gắn bởi adminMiddleware
      // 1. Lấy tất cả show_id thuộc rạp
      const showIds = await Show.find({ cinema: req.user.theater_id })
        .distinct('_id');
      // 2. Lấy tất cả user_id đã mua vé tại các show đó
      const userIds = await Booking.find({ show: { $in: showIds } })
        .distinct('user');
      baseFilter._id = { $in: userIds };
    }

    const result = await paginate(User, baseFilter, req.query, {
      defaultSort: { createdAt: -1 },
      searchFields: ['name', 'email', 'phone'],
      select: '-password',
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── POST /api/users/register ────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email và password là bắt buộc' });
  }

  try {
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(400).json({ message: 'Email này đã được đăng ký' });
    }

    // role mặc định 'user', theater_id mặc định null theo schema
    const user = new User({ name, email, password, phone: phone || '' });
    await user.save();

    const token = generateToken(user);
    res.status(201).json({
      message: 'Đăng ký thành công',
      user:    publicFields(user),
      token,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ── POST /api/users/login ────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'email và password là bắt buộc' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    const token = generateToken(user);
    res.json({
      message: 'Đăng nhập thành công',
      /**
       * publicFields bao gồm:
       *   - role       → frontend redirect sang /admin hoặc /
       *   - theater_id → nếu là admin, frontend biết chính xác rạp nào
       *                  để chỉ hiển thị trang quản lý của rạp đó
       */
      user:  publicFields(user),
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET /api/users/profile/:id ───────────────────────────────────────────────
router.get('/profile/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('theater_id', 'name location address'); // populate thông tin rạp nếu có

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── PUT /api/users/:id ───────────────────────────────────────────────────────
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    // Không cho phép tự update password/role/theater_id qua route này
    const { password, role, theater_id, ...updateData } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ── PUT /api/users/:id/assign-theater ───────────────────────────────────────
/**
 * Gán rạp chiếu phim cho một tài khoản admin.
 * Chỉ super-admin (admin chưa bị ràng buộc rạp) mới nên gọi API này.
 *
 * Body: { theater_id: "<ObjectId>" }
 *
 * Quy tắc:
 *   - Tài khoản được gán PHẢI có role = 'admin'.
 *   - theater_id phải tồn tại trong collection theaters.
 *   - Mỗi theater chỉ được gán cho 1 admin (ràng buộc 1-1).
 */
router.put('/:id/assign-theater', adminMiddleware, requireSuperAdmin, async (req, res) => {
  const { theater_id } = req.body;

  if (!theater_id) {
    return res.status(400).json({ message: 'theater_id là bắt buộc' });
  }

  try {
    // Kiểm tra target user tồn tại và có role admin
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    }
    if (targetUser.role !== 'admin') {
      return res.status(400).json({ message: 'Chỉ tài khoản admin mới có thể được gán rạp' });
    }

    // Kiểm tra theater tồn tại
    const theater = await Theater.findById(theater_id);
    if (!theater) {
      return res.status(404).json({ message: 'Không tìm thấy rạp chiếu phim' });
    }

    // Kiểm tra theater này đã được gán cho admin khác chưa
    const alreadyAssigned = await User.findOne({
      theater_id,
      _id: { $ne: req.params.id },
    });
    if (alreadyAssigned) {
      return res.status(409).json({
        message: `Rạp "${theater.name}" đã được gán cho tài khoản admin khác`,
      });
    }

    targetUser.theater_id = theater_id;
    await targetUser.save();

    res.json({
      message: `Đã gán rạp "${theater.name}" cho tài khoản ${targetUser.email}`,
      user: publicFields(targetUser),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ── DELETE /api/users/:id/assign-theater ─────────────────────────────────────
/**
 * Huỷ gán rạp khỏi tài khoản admin (đặt theater_id về null).
 */
router.delete('/:id/assign-theater', adminMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    }

    targetUser.theater_id = null;
    await targetUser.save();

    res.json({
      message: 'Đã huỷ gán rạp khỏi tài khoản',
      user: publicFields(targetUser),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
