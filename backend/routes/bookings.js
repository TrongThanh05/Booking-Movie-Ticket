import express  from 'express';
import Booking  from '../models/Booking.js';
import Show     from '../models/Show.js';
import completeBooking from '../services/completeBooking.js';

const router = express.Router();

// ============================================================
// GET: Lấy danh sách booking của user (lịch sử vé)
// GET /api/bookings/user/:userId
// ============================================================
router.get('/user/:userId', async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.params.userId })
      .populate({
        path: 'show',
        populate: [
          { path: 'movie',   select: 'title poster_path backdrop_path' },
          { path: 'cinema',  select: 'name location address' },
          { path: 'room_id', select: 'name screen_type' },
        ],
      })
      .populate('user', 'name email')
      .sort({ booked_at: -1 });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// GET: Chi tiết booking theo ID
// GET /api/bookings/:id
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({
        path: 'show',
        populate: [
          { path: 'movie',   select: 'title poster_path backdrop_path runtime' },
          { path: 'cinema',  select: 'name location address' },
          { path: 'room_id', select: 'name screen_type' },
        ],
      })
      .populate('user', 'name email phone');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// POST /api/bookings — Thanh toán & xác nhận đặt vé
//
// Body:
//   user_id        {string}   ObjectId của user
//   show_id        {string}   ObjectId của show
//   tickets        {Array}    [{ seat_id, seat_type, price }]
//   total_amount   {number}   Tổng tiền
//   payment_method {string}   'VNPAY' | 'MOMO' | 'cash' | ...
//
// Flow (bên trong MongoDB Transaction):
//   1. Concurrency check: ghế có trong booked_seats không?
//   2. Lock check: user có lock hợp lệ (hold_until > now) không?
//   3. $addToSet booked_seats + $pull reserved_seats (atomic)
//   4. Tạo Booking document (cùng session)
//   → Nếu bất kỳ bước nào fail → rollback toàn bộ
// ============================================================
router.post('/', async (req, res) => {
  const { user_id, show_id, tickets, total_amount, payment_method } = req.body;

  // ── Validate input ──────────────────────────────────────────────────────
  if (!user_id || !show_id) {
    return res.status(400).json({ message: 'user_id và show_id là bắt buộc' });
  }
  if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
    return res.status(400).json({ message: 'Danh sách vé (tickets) không được rỗng' });
  }
  if (!total_amount || total_amount <= 0) {
    return res.status(400).json({ message: 'total_amount phải là số dương' });
  }

  try {
    // Gọi service function (Transaction bên trong)
    const booking = await completeBooking({
      userId:         user_id,
      showId:         show_id,
      tickets,
      total_amount,
      payment_method: payment_method || 'cash',
    });

    return res.status(201).json({
      message:      'Đặt vé thành công',
      booking_code: booking.booking_code,
      booking,
    });

  } catch (err) {
    // Phân loại lỗi để trả về HTTP status phù hợp
    const code = err.statusCode || 400;

    if (code === 409) {
      return res.status(409).json({
        message:        err.message,
        conflict_seats: err.conflict_seats ?? [],
      });
    }

    console.error('[Booking] completeBooking error:', err.message);
    return res.status(code).json({ message: err.message });
  }
});

// ============================================================
// PUT /api/bookings/:id/cancel — Hủy vé
//
// Logic:
//   1. Kiểm tra booking tồn tại & chưa bị cancel
//   2. Đặt booking.status = 'cancelled'
//   3. Xóa seat_ids khỏi shows.booked_seats ($pull)
// ============================================================
router.put('/:id/cancel', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Booking đã được hủy trước đó' });
    }

    const seatIds = booking.seat_ids.length > 0
      ? booking.seat_ids
      : booking.tickets.map((t) => t.seat_id);

    // Update booking status
    booking.status       = 'cancelled';
    booking.cancelled_at = new Date();
    await booking.save();

    // Giải phóng ghế: xóa seat_ids khỏi shows.booked_seats
    await Show.updateOne(
      { _id: booking.show },
      { $pull: { booked_seats: { $in: seatIds } } },
    );

    res.json({ message: 'Hủy vé thành công', cancelled_seats: seatIds });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
