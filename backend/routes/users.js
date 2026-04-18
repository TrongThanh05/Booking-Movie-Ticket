import express from 'express';
import User    from '../models/User.js';
import jwt     from 'jsonwebtoken';

const router = express.Router();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });

/** Trường public trả về (không bao gồm password) */
const publicFields = (user) => ({
  _id:    user._id,
  name:   user.name,
  email:  user.email,
  phone:  user.phone  || '',
  role:   user.role,
  avatar: user.avatar || '',
});

// ── POST /api/users/register ───────────────────────────────────────────────────
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

    // role mặc định 'user' theo schema
    const user = new User({ name, email, password, phone: phone || '' });
    await user.save();

    const token = generateToken(user._id);
    res.status(201).json({
      message: 'Đăng ký thành công',
      user:    publicFields(user),
      token,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ── POST /api/users/login ──────────────────────────────────────────────────────
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

    const token = generateToken(user._id);
    res.json({
      message: 'Đăng nhập thành công',
      user:    publicFields(user), // bao gồm role để frontend redirect đúng
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET /api/users/profile/:id ────────────────────────────────────────────────
router.get('/profile/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── PUT /api/users/:id ────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    // Không cho phép update password qua route này
    const { password, role, ...updateData } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
