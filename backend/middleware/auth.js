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
 * Xác thực JWT + kiểm tra role === 'admin'.
 * Gắn req.user (full document, trừ password) vào request.
 *
 * Phân loại admin sau middleware này:
 *   • Super-admin : user.theater_id === null  → toàn quyền
 *   • Theater-owner: user.theater_id !== null → chỉ quản lý rạp được gán
 *
 * Các route handler có thể kiểm tra:
 *   req.user.theater_id   → null = super-admin
 *   req.isTheaterOwner    → true nếu là admin rạp (set bởi middleware phía sau)
 *   req.theaterScope      → ObjectId rạp cần scope (set bởi middleware phía sau)
 * ───────────────────────────────────────────────────────────────────────────*/
const adminMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.id).select('-password');

    if (!user) return res.status(401).json({ message: 'User not found' });
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: admin only' });
    }

    req.userId = user._id;
    req.user   = user;          // chứa theater_id nếu là admin rạp

    // ── Phân loại admin ──────────────────────────────────────────────────────
    if (user.theater_id) {
      req.isTheaterOwner = true;
      req.theaterScope   = user.theater_id; // ObjectId rạp mà admin quản lý
    } else {
      req.isTheaterOwner = false;
      req.theaterScope   = null; // super-admin → không bị scope
    }

    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
 * requireSuperAdmin
 * Middleware chặn theater-owner, chỉ cho super-admin (theater_id === null).
 * Sử dụng SAU adminMiddleware.
 *
 * Ví dụ:
 *   router.post('/movies', adminMiddleware, requireSuperAdmin, handler)
 * ───────────────────────────────────────────────────────────────────────────*/
const requireSuperAdmin = (req, res, next) => {
  if (req.isTheaterOwner) {
    return res.status(403).json({
      message: 'Chỉ super-admin mới có quyền thực hiện thao tác này',
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
const optionalAdminAuth = async (req, res, next) => {
  req.optUser = null;
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return next();

    const decoded = jwt.verify(
      authHeader.split(' ')[1],
      process.env.JWT_SECRET || 'your-secret-key',
    );
    const user = await User.findById(decoded.id).select('role theater_id');
    if (user?.role === 'admin') {
      req.optUser = {
        role:           'admin',
        theater_id:     user.theater_id || null,
        isTheaterOwner: Boolean(user.theater_id),
      };
    }
  } catch { /* token không hợp lệ → bỏ qua */ }
  next();
};

export { adminMiddleware, theaterAdminMiddleware, requireSuperAdmin, scopeToTheater, optionalAdminAuth };
export default authMiddleware;
