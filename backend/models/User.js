import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  phone: { type: String },
  avatar: { type: String },
  /**
   * Phân cấp quyền 4 tầng:
   * - user            : Khách hàng thường (đặt vé, xem phim)
   * - staff           : Nhân viên rạp (soát vé, xem báo cáo ca)
   * - theater-manager : Quản lý rạp (có theater_id, quản lý phòng/suất chiếu)
   * - admin           : Toàn quyền hệ thống (không bị scope rạp)
   */
  role: {
    type: String,
    enum: ['user', 'staff', 'theater-manager', 'admin'],
    default: 'user',
  },
  /**
   * theater_id: dùng cho staff & theater-manager.
   * - theater-manager : ObjectId rạp mà tài khoản đó quản lý.
   * - staff           : ObjectId rạp mà nhân viên được phân công.
   * - user / admin    : null.
   */
  theater_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Theater',
    default: null,
  },
  /** Ban tài khoản: true = bị khoá, không thể đăng nhập */
  isBanned: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Hash password trước khi save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method để check password
userSchema.methods.comparePassword = async function (password) {
  return await bcryptjs.compare(password, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
