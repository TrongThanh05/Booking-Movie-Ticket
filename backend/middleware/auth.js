import jwt      from 'jsonwebtoken';
import User     from '../models/User.js';

/* ─────────────────────────────────────────────────────────────────────────────
 * authMiddleware
 * Xác thực JWT, gắn req.userId vào request.
 * ───────────────────────────────────────────────────────────────────────────*/
const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.userId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
 * adminMiddleware
 * Xác thực JWT + kiểm tra role thuộc nhóm quản lý (admin | theater-manager | staff).
 * Gắn req.user (full document, trừ password) vào request.
 *
 * Phân loại sau middleware:
 *   • admin           : theater_id === null  → toàn quyền hệ thống
 *   • theater-manager : theater_id !== null  → quản lý rạp được gán
 *   • staff           : theater_id !== null  → nhân viên rạp (chỉ đọc)
 *
 * req.isAdmin           → true nếu role === 'admin'
 * req.isTheaterManager  → true nếu role === 'theater-manager'
 * req.isStaff           → true nếu role === 'staff'
 * req.isTheaterOwner    → true nếu là theater-manager hoặc staff (có scope rạp)
 * req.theaterScope      → ObjectId rạp (hoặc null với admin)
 * ───────────────────────────────────────────────────────────────────────────*/
const STAFF_ROLES = ['admin', 'theater-manager', 'staff'];

const adminMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.id).select('-password');

    if (!user) return res.status(401).json({ message: 'User not found' });
    if (user.isBanned) return res.status(403).json({ message: 'Tài khoản đã bị khoá' });
    if (!STAFF_ROLES.includes(user.role)) {
      return res.status(403).json({ message: 'Forbidden: staff access only' });
    }

    req.userId           = user._id;
    req.user             = user;
    req.isAdmin          = user.role === 'admin';
    req.isTheaterManager = user.role === 'theater-manager';
    req.isStaff          = user.role === 'staff';
    req.isTheaterOwner   = user.role !== 'admin' && Boolean(user.theater_id);
    req.theaterScope     = user.theater_id || null;

    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
 * requireSuperAdmin
 * Chỉ cho phép admin (toàn quyền, không bị scope rạp).
 * Sử dụng SAU adminMiddleware.
 * ───────────────────────────────────────────────────────────────────────────*/
const requireSuperAdmin = (req, res, next) => {
  if (!req.isAdmin) {
    return res.status(403).json({
      message: 'Chỉ Admin toàn hệ thống mới có quyền thực hiện thao tác này',
    });
  }
  next();
};

/* ─────────────────────────────────────────────────────────────────────────────
 * requireTheaterManager
 * Chỉ cho phép admin hoặc theater-manager.
 * Sử dụng SAU adminMiddleware.
 * ───────────────────────────────────────────────────────────────────────────*/
const requireTheaterManager = (req, res, next) => {
  if (!req.isAdmin && !req.isTheaterManager) {
    return res.status(403).json({
      message: 'Chỉ Admin hoặc Quản lý rạp mới có quyền thực hiện thao tác này',
    });
  }
  next();
};

/* ─────────────────────────────────────────────────────────────────────────────
 * theaterAdminMiddleware
 * Dùng sau adminMiddleware (hoặc độc lập).
 * Kiểm tra xem admin này có quyền quản lý theater được chỉ định trong
 * req.params.theaterId (hoặc req.body.theater_id) không.
 *
 * Logic:
 *   • Super-admin (theater_id === null)  → luôn pass
 *   • Theater-owner                      → chỉ pass nếu target === own theater
 *
 * Cách dùng:
 *   router.put('/theaters/:theaterId/...', adminMiddleware, theaterAdminMiddleware, handler)
 * ───────────────────────────────────────────────────────────────────────────*/
const theaterAdminMiddleware = (req, res, next) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  // Super-admin → bypass scope check
  if (!user.theater_id) return next();

  // Lấy theater cần thao tác từ params (:theaterId hoặc :id) hoặc body
  const targetTheaterId =
    req.params.theaterId ?? req.params.id ?? req.body.theater_id;

  if (!targetTheaterId) {
    return res.status(400).json({ message: 'theater_id is required' });
  }

  // So sánh ObjectId (chuyển sang string để tránh lỗi reference)
  if (user.theater_id.toString() !== targetTheaterId.toString()) {
    return res.status(403).json({
      message: 'Bạn chỉ có quyền quản lý rạp của mình',
    });
  }

  next();
};

/* ─────────────────────────────────────────────────────────────────────────────
 * scopeToTheater(modelName)
 *
 * Factory middleware: tự động scope request theo theater của admin.
 * Dùng cho các route GET list (rooms, shows, bookings...).
 *
 * Với super-admin: không thêm filter → trả hết.
 * Với theater-owner: inject req.theaterFilter = { theater_id: ... }
 *
 * Ví dụ:
 *   router.get('/', adminMiddleware, scopeToTheater(), handler)
 *   → trong handler: const filter = { ...req.theaterFilter };
 * ───────────────────────────────────────────────────────────────────────────*/
const scopeToTheater = () => {
  return (req, res, next) => {
    if (req.isTheaterOwner && req.theaterScope) {
      req.theaterFilter = { theater_id: req.theaterScope };
    } else {
      req.theaterFilter = {}; // super-admin → no filter
    }
    next();
  };
};

/* ─────────────────────────────────────────────────────────────────────────────
 * optionalAdminAuth
 * Dùng cho các route vừa public vừa cần scope theo admin.
 * Nếu có Bearer token hợp lệ và user là admin → gắn req.optUser.
 * Nếu không có token hoặc token lỗi → bỏ qua, req.optUser = null.
 *
 * Các thuộc tính được gắn:
 *   req.optUser.role         → 'admin'
 *   req.optUser.theater_id   → ObjectId | null
 *   req.optUser.isTheaterOwner → Boolean
 * ───────────────────────────────────────────────────────────────────────────*/
const STAFF_ROLES_OPT = ['admin', 'theater-manager', 'staff'];

const optionalAdminAuth = async (req, res, next) => {
  req.optUser = null;
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return next();

    const decoded = jwt.verify(
      authHeader.split(' ')[1],
      process.env.JWT_SECRET || 'your-secret-key',
    );
    const user = await User.findById(decoded.id).select('role theater_id isBanned');
    if (user && !user.isBanned && STAFF_ROLES_OPT.includes(user.role)) {
      req.optUser = {
        role:             user.role,
        theater_id:       user.theater_id || null,
        isAdmin:          user.role === 'admin',
        isTheaterManager: user.role === 'theater-manager',
        isStaff:          user.role === 'staff',
        isTheaterOwner:   user.role !== 'admin' && Boolean(user.theater_id),
      };
    }
  } catch { /* token không hợp lệ → bỏ qua */ }
  next();
};

export {
  adminMiddleware,
  theaterAdminMiddleware,
  requireSuperAdmin,
  requireTheaterManager,
  scopeToTheater,
  optionalAdminAuth,
};
export default authMiddleware;
