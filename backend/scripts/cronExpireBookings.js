/**
 * cronExpireBookings.js — Tự động hủy & dọn dẹp Booking bị bỏ (Abandoned Checkout)
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Problem:
 *   Khi user vào trang VNPAY nhưng không thanh toán (đóng tab, hết giờ...), booking
 *   được tạo với status='confirmed', payment_status='pending' nhưng không bao giờ
 *   được cập nhật → dữ liệu "treo" tích lũy dần, ghế vẫn bị giữ trong booked_seats.
 *
 * Solution:
 *   Quét định kỳ (mỗi 5 phút) → tìm booking thỏa:
 *     1. payment_status = 'pending'
 *     2. status ≠ 'cancelled'
 *     3. booked_at < now - EXPIRE_MINUTES
 *   → Soft-cancel booking (status='cancelled', payment_status='failed')
 *   → Giải phóng ghế khỏi show.booked_seats
 *
 * Tích hợp: Gọi startCronExpireBookings() trong server.js sau khi kết nối DB.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import Booking from '../models/Booking.js';
import Show    from '../models/Show.js';

// ── CONFIG ────────────────────────────────────────────────────────────────────
/**
 * Thời gian chờ tối đa cho một booking chưa thanh toán (phút).
 * VNPAY timeout mặc định là 15 phút — đặt 30 phút để an toàn.
 */
const EXPIRE_MINUTES = 30;

// ── CORE JOB ──────────────────────────────────────────────────────────────────
/**
 * Tìm và hủy tất cả booking "treo" (pending payment quá hạn).
 *
 * @returns {{ expired: number, seatsReleased: number }}
 */
const expireStaleBookings = async () => {
  try {
    const cutoff = new Date(Date.now() - EXPIRE_MINUTES * 60 * 1000);

    // ── 1. Tìm booking hết hạn ─────────────────────────────────────────────
    // Điều kiện:
    //   • payment_status = 'pending'  → chưa thanh toán
    //   • status ≠ 'cancelled'        → chưa bị hủy
    //   • booked_at < cutoff          → đã qua thời hạn
    const staleBookings = await Booking.find({
      payment_status: 'pending',
      status:         { $ne: 'cancelled' },
      booked_at:      { $lt: cutoff },
    })
      .select('_id show seat_ids booking_code status')
      .lean();

    if (staleBookings.length === 0) return { expired: 0, seatsReleased: 0 };

    const now = new Date();
    let seatsReleased = 0;

    // ── 2. Xử lý từng booking ─────────────────────────────────────────────
    for (const booking of staleBookings) {
      // 2a. Soft-cancel booking
      await Booking.updateOne(
        { _id: booking._id },
        {
          $set: {
            status:         'cancelled',
            payment_status: 'failed',
            cancelled_at:   now,
          },
        },
      );

      // 2b. Giải phóng ghế khỏi show.booked_seats (nếu có seat_ids)
      if (booking.show && booking.seat_ids?.length > 0) {
        await Show.updateOne(
          { _id: booking.show },
          {
            $pull: {
              booked_seats: { $in: booking.seat_ids },
            },
          },
        );
        seatsReleased += booking.seat_ids.length;
      }
    }

    // ── 3. Log kết quả ────────────────────────────────────────────────────
    console.log(
      `🗑️  [ExpireBookings] Đã hủy ${staleBookings.length} booking treo` +
      (seatsReleased > 0 ? `, giải phóng ${seatsReleased} ghế` : ''),
    );

    if (process.env.NODE_ENV === 'development') {
      staleBookings.forEach(b =>
        console.log(`   ↳ ${b.booking_code} (status: ${b.status})`),
      );
    }

    return { expired: staleBookings.length, seatsReleased };
  } catch (error) {
    console.error('❌ [ExpireBookings] Lỗi:', error.message);
    return { expired: 0, seatsReleased: 0 };
  }
};

// ── CRON STARTER ──────────────────────────────────────────────────────────────
/**
 * Khởi chạy cron job tự động hủy booking treo.
 *
 * Tích hợp vào server.js:
 *   import { startCronExpireBookings } from './scripts/cronExpireBookings.js';
 *   connectDB().then(() => { startCronExpireBookings(); });
 *
 * @param {number} intervalMs  Khoảng cách mỗi lần quét (ms). Mặc định 5 phút.
 * @param {number} expireMin   Thời gian chờ tối đa (phút). Mặc định 30 phút.
 */
export const startCronExpireBookings = (
  intervalMs = 10 * 1000,   // 10 giây
  expireMin  = EXPIRE_MINUTES,
) => {
  const mins = Math.round(intervalMs / 60_000);
  console.log(
    `⏰ [ExpireBookings] Khởi động auto-expire booking treo` +
    ` (timeout=${expireMin}ph, quét mỗi ${mins}ph)`,
  );

  expireStaleBookings(); // Chạy ngay khi server khởi động
  setInterval(expireStaleBookings, intervalMs);
};

export default expireStaleBookings;
