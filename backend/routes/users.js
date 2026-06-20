import express from 'express';
import User    from '../models/User.js';
import Theater from '../models/Theater.js';
import Booking from '../models/Booking.js';
import Show    from '../models/Show.js';
import jwt     from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import multer  from 'multer';
import path    from 'path';
import fs      from 'fs';
import { fileURLToPath } from 'url';
import authMiddleware, {
  adminMiddleware,
  requireSuperAdmin,
  requireTheaterManager,
  optionalAdminAuth,
} from '../middleware/auth.js';
import { paginate } from '../utils/paginate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Đường dẫn thư mục lưu avatar ──────────────────────────────────────────────
const AVATAR_DIR = path.resolve(
  __dirname,
  '../../frontend/client/src/assets/images/avatars'
);
// Tạo thư mục nếu chưa tồn tại
if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true });

// ── Multer storage: đặt tên file = {username}-avatar.{ext} ───────────────────
const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    const ext      = path.extname(file.originalname).toLowerCase() || '.jpg';
    // Lấy name từ DB sau khi đã verify auth; dùng userId làm fallback an toàn
    const safeName = (req.user?.name || req.params.id)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 40);
    cb(null, `${safeName}-avatar${ext}`);
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Chỉ chấp nhận file ảnh'), false);
  },
});

const router = express.Router();

/**
 * Sinh JWT token.
 * Payload chứa: id, role, theater_id (nếu có).
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
  theater_id: user.theater_id || null,
  isBanned:   user.isBanned   || false,
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  GET /api/users — Danh sách tài khoản (admin sees all, theater-manager sees own theater customers)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/', adminMiddleware, async (req, res) => {
  try {
    let baseFilter = {};

    const roleFilter = req.query.role; // filter by role: user|staff|theater-manager|admin

    if (req.isAdmin) {
      // Admin toàn quyền: xem tất cả, có thể filter theo role
      if (roleFilter && ['user', 'staff', 'theater-manager', 'admin'].includes(roleFilter)) {
        baseFilter.role = roleFilter;
      }
    } else if (req.isTheaterManager) {
      // Theater-manager: chỉ xem khách hàng đã mua vé tại rạp mình
      const showIds  = await Show.find({ cinema: req.theaterScope }).distinct('_id');
      const userIds  = await Booking.find({ show: { $in: showIds } }).distinct('user');
      baseFilter = { role: 'user', _id: { $in: userIds } };
    } else {
      // Staff: chỉ xem danh sách user (không thể quản lý)
      baseFilter.role = 'user';
    }

    const result = await paginate(User, baseFilter, req.query, {
      defaultSort:  { createdAt: -1 },
      searchFields: ['name', 'email', 'phone'],
      select:       '-password',
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  POST /api/users/register — Đăng ký tài khoản mới (public)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  POST /api/users/admin/create — Tạo tài khoản mới bởi admin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/admin/create', adminMiddleware, requireSuperAdmin, async (req, res) => {
  const { name, email, password, phone, role, theater_id } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email và password là bắt buộc' });
  }
  const allowedRoles = ['user', 'staff', 'theater-manager', 'admin'];
  if (role && !allowedRoles.includes(role)) {
    return res.status(400).json({ message: 'Role không hợp lệ' });
  }

  try {
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(400).json({ message: 'Email này đã tồn tại trong hệ thống' });
    }

    // Nếu gán role cần theater (staff/theater-manager), kiểm tra theater tồn tại
    const needsTheater = ['staff', 'theater-manager'].includes(role);
    if (needsTheater && theater_id) {
      const theater = await Theater.findById(theater_id);
      if (!theater) return res.status(404).json({ message: 'Không tìm thấy rạp chiếu phim' });
      // Kiểm tra theater-manager 1-1
      if (role === 'theater-manager') {
        const alreadyManaged = await User.findOne({ role: 'theater-manager', theater_id });
        if (alreadyManaged) {
          return res.status(409).json({ message: `Rạp "${theater.name}" đã có quản lý rạp` });
        }
      }
    }

    const user = new User({
      name,
      email,
      password,
      phone:      phone || '',
      role:       role  || 'user',
      theater_id: needsTheater && theater_id ? theater_id : null,
    });
    await user.save();

    res.status(201).json({
      message: `Đã tạo tài khoản "${name}" thành công`,
      user:    publicFields(user),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  POST /api/users/login — Đăng nhập
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
    if (user.isBanned) {
      return res.status(403).json({ message: 'Tài khoản của bạn đã bị khoá. Vui lòng liên hệ quản trị viên.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    const token = generateToken(user);
    res.json({
      message: 'Đăng nhập thành công',
      user:    publicFields(user),
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  GET /api/users/profile/:id
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/profile/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('theater_id', 'name location address');

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PUT /api/users/:id/avatar — Upload + cập nhật avatar
//  Lưu file vào folder avatars, chỉ ghi tên file vào DB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.put(
  '/:id/avatar',
  authMiddleware,
  uploadAvatar.single('avatar'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Không có file ảnh được gửi lên' });
      }

      // Chỉ cho phép user tự cập nhật avatar của chính mình (hoặc admin)
      if (
        req.user._id.toString() !== req.params.id &&
        req.user.role !== 'admin'
      ) {
        // Xóa file vừa upload để không rác
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ message: 'Không có quyền thực hiện' });
      }

      const user = await User.findById(req.params.id);
      if (!user) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
      }

      // Xóa file avatar cũ (nếu có và khác tên mới)
      if (user.avatar && user.avatar !== req.file.filename) {
        const oldPath = path.join(AVATAR_DIR, user.avatar);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      // Chỉ lưu tên file (không phải full path) vào DB
      user.avatar = req.file.filename;
      await user.save();

      res.json({
        message:  'Cập nhật avatar thành công',
        avatar:   req.file.filename,
        avatarUrl: `/avatars/${req.file.filename}`,
      });
    } catch (error) {
      // Nếu multer fileFilter reject → error.message
      res.status(400).json({ message: error.message });
    }
  }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PUT /api/users/:id — Cập nhật thông tin cơ bản (name, phone) của chính mình
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    // Không cho phép tự update password/role/theater_id/isBanned qua route này
    const { password, role, theater_id, isBanned, ...updateData } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PUT /api/users/:id/role — Gán role mới (chỉ admin toàn quyền)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.put('/:id/role', adminMiddleware, requireSuperAdmin, async (req, res) => {
  const { role } = req.body;
  const allowedRoles = ['user', 'staff', 'theater-manager', 'admin'];

  if (!role || !allowedRoles.includes(role)) {
    return res.status(400).json({ message: `Role phải là một trong: ${allowedRoles.join(', ')}` });
  }

  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });

    // Không cho phép tự hạ role của chính mình
    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Không thể thay đổi role của chính mình' });
    }

    const oldRole = targetUser.role;
    targetUser.role = role;

    // Khi chuyển về role không cần theater, xoá theater_id
    if (!['staff', 'theater-manager'].includes(role)) {
      targetUser.theater_id = null;
    }

    await targetUser.save();

    res.json({
      message: `Đã đổi role tài khoản "${targetUser.email}" từ "${oldRole}" → "${role}"`,
      user:    publicFields(targetUser),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PUT /api/users/:id/ban — Ban/Unban tài khoản
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.put('/:id/ban', adminMiddleware, requireSuperAdmin, async (req, res) => {
  const { ban } = req.body; // true = ban, false = unban
  if (typeof ban !== 'boolean') {
    return res.status(400).json({ message: 'Tham số "ban" (boolean) là bắt buộc' });
  }

  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });

    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Không thể khoá tài khoản của chính mình' });
    }
    if (targetUser.role === 'admin') {
      return res.status(403).json({ message: 'Không thể khoá tài khoản Admin' });
    }

    targetUser.isBanned = ban;
    await targetUser.save();

    res.json({
      message: ban
        ? `Đã khoá tài khoản "${targetUser.email}"`
        : `Đã mở khoá tài khoản "${targetUser.email}"`,
      user: publicFields(targetUser),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PUT /api/users/:id/assign-theater — Gán rạp cho staff/theater-manager
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.put('/:id/assign-theater', adminMiddleware, requireSuperAdmin, async (req, res) => {
  const { theater_id } = req.body;

  if (!theater_id) {
    return res.status(400).json({ message: 'theater_id là bắt buộc' });
  }

  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });

    if (!['staff', 'theater-manager'].includes(targetUser.role)) {
      return res.status(400).json({ message: 'Chỉ tài khoản staff hoặc theater-manager mới có thể được gán rạp' });
    }

    const theater = await Theater.findById(theater_id);
    if (!theater) return res.status(404).json({ message: 'Không tìm thấy rạp chiếu phim' });

    // Ràng buộc 1-1 với theater-manager
    if (targetUser.role === 'theater-manager') {
      const alreadyAssigned = await User.findOne({
        role: 'theater-manager',
        theater_id,
        _id: { $ne: req.params.id },
      });
      if (alreadyAssigned) {
        return res.status(409).json({
          message: `Rạp "${theater.name}" đã có Quản lý rạp khác`,
        });
      }
    }

    targetUser.theater_id = theater_id;
    await targetUser.save();

    res.json({
      message: `Đã gán rạp "${theater.name}" cho tài khoản ${targetUser.email}`,
      user:    publicFields(targetUser),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DELETE /api/users/:id/assign-theater — Huỷ gán rạp
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.delete('/:id/assign-theater', adminMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });

    targetUser.theater_id = null;
    await targetUser.save();

    res.json({
      message: 'Đã huỷ gán rạp khỏi tài khoản',
      user:    publicFields(targetUser),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PUT /api/users/:id/reset-password — Reset mật khẩu về mặc định
//  Mật khẩu mặc định: Admin@123 / Staff@123 / User@123 tuỳ role
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.put('/:id/reset-password', adminMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });

    const defaultPasswordMap = {
      admin:            'Admin@123',
      'theater-manager':'Manager@123',
      staff:            'Staff@123',
      user:             'User@123',
    };
    const defaultPassword = defaultPasswordMap[targetUser.role] || 'User@123';

    targetUser.password = defaultPassword;
    await targetUser.save(); // pre-save hook tự hash

    res.json({
      message:         `Đã reset mật khẩu tài khoản "${targetUser.email}" về mặc định`,
      defaultPassword, // trả về để admin thông báo
      role:            targetUser.role,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PUT /api/users/:id/change-password — Đổi mật khẩu (user tự đổi)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.put('/:id/change-password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'currentPassword và newPassword là bắt buộc' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 8 ký tự' });
  }
  // Chỉ cho phép user tự đổi mật khẩu của chính mình
  if (req.user._id.toString() !== req.params.id) {
    return res.status(403).json({ message: 'Không có quyền thực hiện hành động này' });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mật khẩu hiện tại không đúng' });
    }

    user.password = newPassword; // pre-save hook sẽ tự hash
    await user.save();

    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DELETE /api/users/:id — Xoá tài khoản (chỉ admin toàn quyền)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.delete('/:id', adminMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });

    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Không thể xoá tài khoản của chính mình' });
    }
    if (targetUser.role === 'admin') {
      return res.status(403).json({ message: 'Không thể xoá tài khoản Admin' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: `Đã xoá tài khoản "${targetUser.email}"` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
