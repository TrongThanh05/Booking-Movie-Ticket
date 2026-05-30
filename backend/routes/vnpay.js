/**
 * routes/vnpay.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Xử lý toàn bộ luồng thanh toán VNPAY:
 *
 *  POST /api/vnpay/create-payment-url
 *    → Tạo pending booking (payment_status: 'pending') + URL redirect VNPAY
 *    → Bao gồm vnp_ExpireDate = thời gian hết hạn giữ ghế (phòng vệ tầng VNPAY)
 *
 *  GET  /api/vnpay/ipn
 *    → VNPAY server gọi về để xác nhận giao dịch (server-to-server)
 *    → Kiểm tra chữ ký → cập nhật booking (paid / refund_required)
 *    → Phải trả về { RspCode: '00', Message: 'Confirm Success' } đúng format
 *
 * Lưu ý: Return URL (/vnpay/return) được xử lý hoàn toàn ở FRONTEND.
 * Backend chỉ phục vụ IPN để đảm bảo dữ liệu luôn nhất quán dù frontend offline.
 */

import express          from 'express';
import Booking          from '../models/Booking.js';
import Show             from '../models/Show.js';
import Voucher          from '../models/Voucher.js';
import completeBooking  from '../services/completeBooking.js';
import { createVnpayUrl, verifyVnpayReturn } from '../utils/vnpay.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/vnpay/create-payment-url
//
// Body:
//   user_id         {string}   ObjectId của user
//   show_id         {string}   ObjectId của show
//   tickets         {Array}    [{ seat_id, seat_type, price }]
//   foods           {Array}    [{ foodId, quantity }]  (tuỳ chọn)
//   voucher_id      {string}   (tuỳ chọn)
//   discount_amount {number}   (tuỳ chọn)
//   lock_expire_at  {number}   timestamp (ms) hết hạn giữ ghế ← QUAN TRỌNG
//
// Flow:
//   1. Gọi completeBooking() → tạo Booking với payment_status: 'pending'
//   2. Dùng lock_expire_at tính vnp_ExpireDate
//   3. Build URL VNPAY và trả về cho frontend redirect
// ─────────────────────────────────────────────────────────────────────────────
router.post('/create-payment-url', async (req, res) => {
  try {
    const {
      user_id,
      show_id,
      tickets,
      foods           = [],
      voucher_id      = null,
      discount_amount = 0,
      lock_expire_at,          // timestamp ms — thời hạn giữ ghế
    } = req.body;

    // ── Validate ─────────────────────────────────────────────────────────────
    if (!user_id || !show_id || !tickets?.length) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }
    if (!lock_expire_at) {
      return res.status(400).json({ message: 'Thiếu lock_expire_at' });
    }

    const expireDate = new Date(lock_expire_at);
    if (expireDate <= new Date()) {
      return res.status(400).json({ message: 'Phiên giữ ghế đã hết hạn. Vui lòng chọn lại ghế.' });
    }

    // ── Tạo Booking với trạng thái pending ───────────────────────────────────
    const booking = await completeBooking({
      userId:          user_id,
      showId:          show_id,
      tickets,
      foods:           Array.isArray(foods) ? foods : [],
      payment_method:  'VNPAY',
      voucherId:       voucher_id    || null,
      discount_amount: Number(discount_amount) || 0,
      // Ghi đè: thanh toán VNPAY luôn bắt đầu ở pending
      _overridePaymentStatus: 'pending',
    });

    // ── Lấy IP người dùng ─────────────────────────────────────────────────────
    const ipAddr =
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    // ── Build URL redirect sang VNPAY ─────────────────────────────────────────
    const vnpUrl = createVnpayUrl({
      orderId:    booking.booking_code,
      amount:     booking.total_amount,
      orderInfo:  `Dat ve phim ${booking.booking_code}`,
      ipAddr,
      expireDate,                          // ← khớp với thời gian giữ ghế
    });

    return res.json({
      payment_url:  vnpUrl,
      booking_code: booking.booking_code,
      booking_id:   booking._id,
    });

  } catch (err) {
    const code = err.statusCode || 500;
    if (code === 409) {
      return res.status(409).json({
        message:        err.message,
        conflict_seats: err.conflict_seats ?? [],
      });
    }
    console.error('[VNPAY] create-payment-url error:', err.message);
    return res.status(code).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/vnpay/ipn
//
// VNPAY server gọi về (server-to-server) để xác nhận giao dịch.
// Endpoint NÀY phải công khai (không cần auth token).
//
// Phải trả về đúng format:
//   { RspCode: '00', Message: 'Confirm Success' }   → thành công
//   { RspCode: '97', Message: 'Invalid Signature' } → sai chữ ký
//   { RspCode: '02', Message: 'Order not found' }   → không tìm thấy đơn
//   { RspCode: '04', Message: 'Invalid Amount' }    → sai số tiền
//   { RspCode: '02', Message: 'Order already confirmed' } → đã xử lý rồi
//
// Phòng vệ timeout:
//   Nếu VNPAY báo thành công nhưng booking.payment_status !== 'pending'
//   hoặc ghế đã bị nhả (reserved_seats hết hạn) → đánh dấu refund_required
// ─────────────────────────────────────────────────────────────────────────────
router.get('/ipn', async (req, res) => {
  try {
    // ── 1. Xác thực chữ ký VNPAY ─────────────────────────────────────────────
    const { valid, responseCode, orderId, amount, transactionId } =
      verifyVnpayReturn(req.query);

    if (!valid) {
      console.warn('[VNPAY IPN] Invalid signature for order:', orderId);
      return res.json({ RspCode: '97', Message: 'Invalid Signature' });
    }

    // ── 2. Tìm Booking theo booking_code (orderId = booking_code) ─────────────
    const booking = await Booking.findOne({ booking_code: orderId })
      .populate('show', 'reserved_seats booked_seats is_active');

    if (!booking) {
      console.warn('[VNPAY IPN] Order not found:', orderId);
      return res.json({ RspCode: '02', Message: 'Order not found' });
    }

    // ── 3. Kiểm tra số tiền khớp (tránh giả mạo số tiền) ─────────────────────
    if (Math.abs(booking.total_amount - amount) > 1) {
      console.warn('[VNPAY IPN] Amount mismatch:', { expected: booking.total_amount, got: amount });
      return res.json({ RspCode: '04', Message: 'Invalid Amount' });
    }

    // ── 4. Idempotency: nếu đã xử lý rồi → trả thành công ngay ──────────────
    if (booking.payment_status === 'paid') {
      return res.json({ RspCode: '00', Message: 'Confirm Success' });
    }
    if (['failed', 'refunded'].includes(booking.payment_status)) {
      return res.json({ RspCode: '02', Message: 'Order already confirmed' });
    }

    // ── 5. Xử lý kết quả từ VNPAY ────────────────────────────────────────────
    if (responseCode === '00') {
      // ── Thanh toán thành công ──────────────────────────────────────────────
      //
      // Phòng vệ timeout: kiểm tra ghế có còn trong reserved_seats hợp lệ không
      // (cron job có thể đã nhả ghế trong lúc user đang ở VNPAY)
      const show = booking.show;
      const seatIds = booking.seat_ids;
      const now = new Date();

      // Kiểm tra xem ghế đã bị release (không còn trong booked_seats) chưa
      // booked_seats được set bởi completeBooking → nếu mất là bị cron xóa
      const stillBooked = seatIds.every((id) =>
        (show?.booked_seats || []).includes(id)
      );

      if (!stillBooked) {
        // Ghế đã bị nhả bởi cron → cần hoàn tiền
        console.warn('[VNPAY IPN] Seats released before IPN for booking:', orderId);
        booking.payment_status = 'refunded';
        booking.status         = 'cancelled';
        booking.cancelled_at   = now;
        booking.transaction_id = transactionId;
        await booking.save();

        // Cron đã xóa khỏi booked_seats rồi → không cần $pull thêm
        return res.json({ RspCode: '00', Message: 'Confirm Success' }); // vẫn trả 00 cho VNPAY
      }

      // Ghế vẫn còn → xác nhận thanh toán thành công
      booking.payment_status = 'paid';
      booking.status         = 'confirmed';
      booking.transaction_id = transactionId;
      await booking.save();

      // Tăng used_count voucher nếu có (trường hợp chưa tăng ở completeBooking pending)
      if (booking.voucher) {
        Voucher.findByIdAndUpdate(booking.voucher, { $inc: { used_count: 1 } })
          .catch((e) => console.error('[VNPAY IPN] Voucher count error:', e.message));
      }

      console.log('[VNPAY IPN] Payment confirmed:', orderId);
      return res.json({ RspCode: '00', Message: 'Confirm Success' });

    } else {
      // ── Thanh toán thất bại / bị hủy ──────────────────────────────────────
      booking.payment_status = 'failed';
      booking.status         = 'cancelled';
      booking.cancelled_at   = new Date();
      booking.transaction_id = transactionId || null;
      await booking.save();

      // Nhả ghế ra khỏi booked_seats (booking.seat_ids đã được ghi bởi completeBooking)
      if (booking.seat_ids?.length > 0 && booking.show?._id) {
        await Show.updateOne(
          { _id: booking.show._id || booking.show },
          { $pull: { booked_seats: { $in: booking.seat_ids } } }
        ).catch((e) => console.error('[VNPAY IPN] Seat release error:', e.message));
      }

      console.log('[VNPAY IPN] Payment failed/cancelled, responseCode:', responseCode, 'order:', orderId);
      return res.json({ RspCode: '00', Message: 'Confirm Success' }); // vẫn trả 00 cho VNPAY
    }

  } catch (err) {
    console.error('[VNPAY IPN] Unhandled error:', err);
    return res.json({ RspCode: '99', Message: 'Unknown error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/vnpay/release-seats
//
// PUBLIC — Frontend gọi ngay khi phát hiện hủy/thất bại VNPAY,
// KHÔNG chờ IPN server-to-server.
//
// Body: { booking_code }
//
// Logic:
//   1. Tìm booking theo booking_code
//   2. Chỉ xử lý nếu payment_status === 'pending' (tránh double-release)
//   3. Cập nhật booking → status: cancelled, payment_status: failed
//   4. $pull seat_ids ra khỏi show.booked_seats → ghế trở về trạng thái bình thường
// ─────────────────────────────────────────────────────────────────────────────
router.post('/release-seats', async (req, res) => {
  try {
    const { booking_code } = req.body;

    if (!booking_code) {
      return res.status(400).json({ message: 'Thiếu booking_code' });
    }

    const booking = await Booking.findOne({ booking_code });
    if (!booking) {
      // Không tìm thấy → coi như đã xử lý rồi, trả 200
      return res.json({ released: false, message: 'Booking not found' });
    }

    // Chỉ nhả ghế nếu booking đang ở trạng thái pending
    // (idempotent: nếu IPN đã xử lý trước rồi thì bỏ qua)
    if (booking.payment_status !== 'pending') {
      return res.json({ released: false, message: 'Booking already processed' });
    }

    // ── Cập nhật trạng thái booking ────────────────────────────────────────
    booking.payment_status = 'failed';
    booking.status         = 'cancelled';
    booking.cancelled_at   = new Date();
    await booking.save();

    // ── Nhả ghế khỏi booked_seats → ghế về trạng thái available ──────────
    if (booking.seat_ids?.length > 0) {
      await Show.updateOne(
        { _id: booking.show },
        { $pull: { booked_seats: { $in: booking.seat_ids } } }
      );
      console.log(`[VNPAY] Released seats ${booking.seat_ids.join(', ')} for cancelled booking ${booking_code}`);
    }

    return res.json({ released: true, seat_ids: booking.seat_ids });

  } catch (err) {
    console.error('[VNPAY] release-seats error:', err.message);
    return res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/vnpay/booking-status/:bookingCode
//
// Frontend polling sau khi return từ VNPAY để lấy trạng thái booking.
// Trả về: { payment_status, status, booking }
// ─────────────────────────────────────────────────────────────────────────────
router.get('/booking-status/:bookingCode', async (req, res) => {
  try {
    const booking = await Booking.findOne({ booking_code: req.params.bookingCode })
      .populate({
        path: 'show',
        populate: [
          { path: 'movie',   select: 'title poster_path' },
          { path: 'cinema',  select: 'name location' },
          { path: 'room_id', select: 'name screen_type' },
        ],
      })
      .populate('user', 'name email');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    return res.json({
      payment_status: booking.payment_status,
      status:         booking.status,
      booking,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
