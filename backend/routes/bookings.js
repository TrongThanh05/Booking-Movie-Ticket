import express         from 'express';
import Booking         from '../models/Booking.js';
import Show            from '../models/Show.js';
import completeBooking from '../services/completeBooking.js';
import expireStale     from '../scripts/cronExpireBookings.js';
import { adminMiddleware } from '../middleware/auth.js';
import { parseQueryParams } from '../utils/paginate.js';

const router = express.Router();

// ============================================================
// GET /api/bookings/admin/stale-stats
// Thống kê booking "treo" chưa thanh toán hiện có
// ============================================================
router.get('/admin/stale-stats', adminMiddleware, async (req, res) => {
  try {
    const EXPIRE_MIN = parseInt(req.query.expireMin) || 30;
    const cutoff = new Date(Date.now() - EXPIRE_MIN * 60 * 1000);

    const [staleCount, totalPending] = await Promise.all([
      Booking.countDocuments({
        payment_status: 'pending',
        status:         { $ne: 'cancelled' },
        booked_at:      { $lt: cutoff },
      }),
      Booking.countDocuments({
        payment_status: 'pending',
        status:         { $ne: 'cancelled' },
      }),
    ]);

    res.json({
      stale_count:   staleCount,    // quá hạn (sẽ bị auto-hủy lần chạy tiếp)
      pending_count: totalPending,  // tổng chưa thanh toán (kể cả chưa đến hạn)
      expire_minutes: EXPIRE_MIN,
      cutoff,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// POST /api/bookings/admin/expire-stale
// Admin trigger thủ công: hủy ngay tất cả booking treo
// ============================================================
router.post('/admin/expire-stale', adminMiddleware, async (req, res) => {
  try {
    const result = await expireStale();
    res.json({
      message: `Đã hủy ${result.expired} booking treo, giải phóng ${result.seatsReleased} ghế`,
      ...result,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ============================================================
// GET /api/bookings/all — Lấy TẤT CẢ bookings (dành cho admin)
//
// Phân quyền:
//   • Super-admin  → tất cả bookings
//   • Theater-owner→ CHỈ bookings của shows thuộc rạp mình
// ============================================================
router.get('/all', adminMiddleware, async (req, res) => {
  try {
    let showFilter = {};

    // ── Theater-owner scope: chỉ lấy shows thuộc rạp mình ────────────────
    if (req.isTheaterOwner) {
      const theaterShows = await Show.find({ cinema: req.theaterScope })
        .select('_id')
        .lean();
      const showIds = theaterShows.map((s) => s._id);
      showFilter = { show: { $in: showIds } };
    }

    const { page, limit, search } = parseQueryParams(req.query);

    // Search filter
    let searchFilter = {};
    if (search) {
      searchFilter = { booking_code: { $regex: search, $options: 'i' } };
    }

    // Status filter
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (req.query.status && validStatuses.includes(req.query.status)) {
      showFilter.status = req.query.status;
    }
    // Payment status filter
    const validPayStatuses = ['pending', 'paid', 'failed', 'refunded'];
    if (req.query.payment_status && validPayStatuses.includes(req.query.payment_status)) {
      showFilter.payment_status = req.query.payment_status;
    }

    const finalFilter = { ...showFilter, ...searchFilter };
    const totalItems = await Booking.countDocuments(finalFilter);
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const skip       = (page - 1) * limit;

    const data = await Booking.find(finalFilter)
      .populate({
        path: 'show',
        populate: [
          { path: 'movie',   select: 'title poster_path backdrop_path' },
          { path: 'cinema',  select: 'name location address' },
          { path: 'room_id', select: 'name screen_type' },
        ],
      })
      .populate('user', 'name email')
      .sort({ booked_at: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      data,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// GET: Lấy danh sách booking của user (lịch sử vé)
// GET /api/bookings/user/:userId
// ============================================================
router.get('/user/:userId', async (req, res) => {
  try {
    const bookings = await Booking.find({
      user:   req.params.userId,
      // Ẩn các booking VNPAY chưa hoàn tất (status: 'pending')
      // Chỉ hiển thị: confirmed, cancelled, completed
      status: { $ne: 'pending' },
    })
      .populate({
        path: 'show',
        populate: [
          { path: 'movie',   select: 'title poster_path backdrop_path' },
          { path: 'cinema',  select: 'name location address' },
          { path: 'room_id', select: 'name screen_type' },
        ],
      })
      .populate('user', 'name email')
      .populate('foods.foodId', 'name category image_url')  // ← populate F&B
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
      .populate('user', 'name email phone')
      .populate('voucher', 'code discount discount_type')
      .populate('foods.foodId', 'name category imageUrl price')
      .populate('checked_in_by', 'name');

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
  const { user_id, show_id, tickets, foods, payment_method, voucher_id, discount_amount } = req.body;

  // ── Validate input ─────────────────────────────────────────────────────────
  if (!user_id || !show_id) {
    return res.status(400).json({ message: 'user_id và show_id là bắt buộc' });
  }
  if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
    return res.status(400).json({ message: 'Danh sách vé (tickets) không được rỗng' });
  }

  try {
    // Gọi service function (Transaction bên trong)
    const booking = await completeBooking({
      userId:          user_id,
      showId:          show_id,
      tickets,
      foods:           Array.isArray(foods) ? foods : [],
      payment_method:  payment_method || 'cash',
      voucherId:       voucher_id || null,
      discount_amount: Number(discount_amount) || 0,
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
// PATCH /api/bookings/:id/checkin — Soát vé tại rạp (Check-in)
//
// Logic:
//   1. Booking phải ở status 'confirmed' và payment_status 'paid'
//   2. Chưa được check-in trước đó
//   3. Ghi checked_in=true, checked_in_at=now, checked_in_by=req.user._id
// ============================================================
router.patch('/:id/checkin', adminMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Không tìm thấy vé' });
    if (booking.checked_in) {
      return res.status(400).json({
        message: 'Vé này đã được soát rồi',
        checked_in_at: booking.checked_in_at,
      });
    }
    if (booking.status !== 'confirmed' && booking.status !== 'completed') {
      return res.status(400).json({ message: `Không thể soát vé có trạng thái: ${booking.status}` });
    }

    booking.checked_in    = true;
    booking.checked_in_at = new Date();
    booking.checked_in_by = req.user?._id || null;
    booking.status        = 'completed';
    await booking.save();

    res.json({ message: 'Check-in thành công! 🎬', booking });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// PUT /api/bookings/:id/cancel — Hủy vé
//
// Phân quyền cho admin:
//   • Super-admin  → hủy bất kỳ booking
//   • Theater-owner→ CHỈ hủy booking thuộc shows trong rạp mình
//
// Logic:
//   1. Kiểm tra booking tồn tại & chưa bị cancel
//   2. Đặt booking.status = 'cancelled'
//   3. Xóa seat_ids khỏi shows.booked_seats ($pull)
// ============================================================
router.put('/:id/cancel', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate({
      path: 'show',
      select: 'cinema',
    });
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
      { _id: booking.show._id || booking.show },
      { $pull: { booked_seats: { $in: seatIds } } },
    );

    res.json({ message: 'Hủy vé thành công', cancelled_seats: seatIds });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// DELETE /api/bookings/:id — Xóa vé khỏi lịch sử (chỉ vé đã hủy)
//
// Logic:
//   1. Chỉ cho phép xóa booking thuộc về chính user đó
//   2. Chỉ xóa được booking có status === 'cancelled'
// ============================================================
router.delete('/:id', async (req, res) => {
  try {
    const { userId } = req.query; // frontend truyền userId để xác minh quyền
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy vé' });
    }

    // Chỉ chủ booking mới được xóa
    if (userId && booking.user.toString() !== userId) {
      return res.status(403).json({ message: 'Không có quyền xóa vé này' });
    }

    // Chỉ cho phép xóa vé đã hủy
    if (booking.status !== 'cancelled') {
      return res.status(400).json({ message: 'Chỉ có thể xóa vé đã hủy khỏi lịch sử' });
    }

    await Booking.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa vé khỏi lịch sử' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// DELETE /api/bookings/admin/:id — Admin xóa cứng booking
//
// Điều kiện:
//   • Phải có adminMiddleware (admin only)
//   • Booking phải ở status 'cancelled' hoặc payment_status 'failed'
//   • Không thể xóa vé đã xác nhận / đã sử dụng
// ============================================================
router.delete('/admin/:id', adminMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    // Chỉ cho phép xóa booking đã hủy
    if (booking.status !== 'cancelled') {
      return res.status(400).json({
        message: `Không thể xóa đơn hàng ở trạng thái "${booking.status}". Chỉ xóa được đơn đã hủy.`,
      });
    }

    await Booking.findByIdAndDelete(req.params.id);

    res.json({
      message: `Đã xóa vĩnh viễn đơn hàng ${booking.booking_code}`,
      booking_code: booking.booking_code,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

