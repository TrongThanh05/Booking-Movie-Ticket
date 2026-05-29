/**
 * completeBooking.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Service function: Hoàn tất quá trình đặt vé (Checkout)
 *
 * 2 pha trong một MongoDB Session/Transaction:
 *   Phase 1 – Concurrency check + cập nhật shows (reserved/booked seats)
 *   Phase 2 – Tạo Booking document
 *
 * Sử dụng:
 *   import completeBooking from '../services/completeBooking.js';
 *   const booking = await completeBooking({ userId, showId, tickets, total_amount, payment_method });
 */

import mongoose from 'mongoose';
import Show     from '../models/Show.js';
import Booking, { generateUniqueBookingCode } from '../models/Booking.js';
import Food from '../models/Food.js';

/**
 * @typedef {Object} TicketInput
 * @property {string} seat_id   - ID ghế (VD: "A1", "F5")
 * @property {string} seat_type - 'regular' | 'vip' | 'couple'
 * @property {number} price     - Giá vé đã tính (base_price × multiplier)
 *
 * @typedef {Object} FoodInput
 * @property {string} foodId   - ObjectId của món Food
 * @property {number} quantity - Số lượng
 *
 * @param {{ userId: string, showId: string, tickets: TicketInput[], foods?: FoodInput[], payment_method?: string }} bookingData
 * @returns {Promise<import('../models/Booking.js').default>} Booking document đã populate
 */
// Map mọi variant → giá trị enum chuẩn (chữ thường)
const SEAT_TYPE_MAP = {
  standard: 'regular', regular: 'regular',
  vip: 'vip',
  couple: 'couple',
};
const normalizeType = (raw) => {
  if (!raw) return 'regular';
  return SEAT_TYPE_MAP[raw.toLowerCase()] || 'regular';
};

const completeBooking = async ({
  userId,
  showId,
  tickets,
  foods = [],       // mảng [{ foodId, quantity }] từ frontend
  payment_method = 'cash',
}) => {
  // Chuẩn hóa seat_type trước khi vào logic
  const normalizedTickets = tickets.map((t) => ({
    ...t,
    seat_type: normalizeType(t.seat_type),
  }));
  const seatIds = normalizedTickets.map((t) => t.seat_id);

  // ── Server-side: xác thực giá vé từ DB (đảm bảo data integrity) ──────────────
  // [Để đơn giản, dùng giá từ ticket client nhưng vẫn tính lại total từ server]
  const seatsTotalAmount = normalizedTickets.reduce((sum, t) => sum + (t.price || 0), 0);

  // ── Server-side: xác thực và tính giá F&B từ DB ──────────────────────────────
  let normalizedFoods = [];
  let foodsTotalAmount = 0;

  if (foods && foods.length > 0) {
    const foodIds = foods.map((f) => f.foodId);
    const foodDocs = await Food.find({ _id: { $in: foodIds }, isActive: true }).lean();
    const foodMap = {};
    for (const doc of foodDocs) foodMap[doc._id.toString()] = doc;

    for (const item of foods) {
      const doc = foodMap[item.foodId?.toString()];
      if (!doc) throw Object.assign(new Error(`Món đồ ăn ${item.foodId} không tồn tại hoặc đã ngừng bán`), { statusCode: 400 });
      const qty = Math.max(1, Math.floor(item.quantity || 1));
      normalizedFoods.push({
        foodId:          doc._id,
        quantity:        qty,
        priceAtPurchase: doc.price,
      });
      foodsTotalAmount += doc.price * qty;
    }
  }

  // Tổng tiền = vé + F&B (server-side calculated)
  const total_amount = seatsTotalAmount + foodsTotalAmount;

  // ── Bắt đầu MongoDB Session ────────────────────────────────────────────────
  const session = await mongoose.startSession();

  try {
    // withTransaction tự động: startTransaction → commitTransaction (hoặc abortTransaction nếu throw)
    const booking = await session.withTransaction(async () => {

      // ════════════════════════════════════════════════════════════════════════
      // PHASE 1 — Kiểm tra concurrency & cập nhật shows
      // ════════════════════════════════════════════════════════════════════════

      // 1a. Lấy show mới nhất trong session (đảm bảo đọc dữ liệu cập nhật nhất)
      const show = await Show.findById(showId).session(session);
      if (!show) throw new Error('Show not found');
      if (!show.is_active) throw new Error('Suất chiếu này không còn hoạt động');

      const now = new Date();

      // 1b. Kiểm tra lần cuối trước khi ghi:
      //     Nếu seat đã có trong booked_seats → người khác vừa mua → conflict
      const alreadyBooked = seatIds.filter((id) => show.booked_seats.includes(id));
      if (alreadyBooked.length > 0) {
        throw Object.assign(new Error('Một số ghế vừa được người khác đặt thành công'), {
          statusCode: 409,
          conflict_seats: alreadyBooked,
        });
      }

      // 1c. Kiểm tra ghế có đang được GIỮ bởi chính user này không
      //     (Lock phải còn hiệu lực — hold_until > now)
      for (const seatId of seatIds) {
        const lock = show.reserved_seats.find(
          (rs) =>
            rs.seat_id === seatId &&
            rs.user_id.toString() === userId.toString() &&
            rs.hold_until > now,
        );
        if (!lock) {
          throw Object.assign(
            new Error(`Ghế ${seatId} chưa được giữ bởi bạn hoặc đã hết hạn giữ chỗ`),
            { statusCode: 400 },
          );
        }
      }

      // ──────────────────────────────────────────────────────────────────────
      // 1d. Atomic update shows — 2 operations in one session:
      //
      //   Operation A: $addToSet booked_seats (xác nhận ghế đã mua, no-dup)
      //   Operation B: $pull reserved_seats   (giải phóng lock của user này)
      //
      // Tại sao dùng $addToSet thay vì $set vào reserved_seats?
      //   → booked_seats là mảng String đơn giản, $addToSet atomic, không cần arrayFilters.
      //   → reserved_seats dùng $pull để xóa toàn bộ lock của user, sạch hơn $set status.
      //
      // ── Giải thích arrayFilters (để tham khảo khi cần) ──────────────────
      //   Nếu muốn UPDATE field bên trong phần tử mảng nhúng (thay vì pull),
      //   ta dùng positional operator + arrayFilters:
      //
      //   await Show.updateOne(
      //     { _id: showId },
      //     { $set: { 'reserved_seats.$[elem].hold_until': null } },
      //     {
      //       arrayFilters: [{ 'elem.seat_id': { $in: seatIds }, 'elem.user_id': userId }],
      //       session,
      //     },
      //   );
      //
      //   $[elem] là "positional filtered operator" — chỉ áp dụng $set lên những
      //   phần tử trong mảng THỎA MÃN điều kiện trong arrayFilters, không ảnh
      //   hưởng các phần tử khác (an toàn khi array có nhiều user cùng lock).
      // ────────────────────────────────────────────────────────────────────

      await Show.updateOne(
        { _id: showId },
        {
          // A: Ghi vĩnh viễn seat đã thanh toán
          $addToSet: { booked_seats: { $each: seatIds } },
          // B: Giải phóng lock tạm của user (tất cả, bao gồm cả seats khác nếu có)
          $pull:     { reserved_seats: { user_id: userId } },
        },
        { session },
      );

      // ════════════════════════════════════════════════════════════════════════
      // PHASE 2 — Tạo Booking document
      // ════════════════════════════════════════════════════════════════════════

      // Sinh booking_code unique TRƯỚC khi create (không để pre-save tự sinh
      // vì trong transaction, nếu bị null sẽ gây E11000 duplicate key)
      const bookingCode = await generateUniqueBookingCode();

      const [newBooking] = await Booking.create(
        [
          {
            user:           userId,
            show:           showId,
            tickets:        normalizedTickets,
            foods:          normalizedFoods,
            total_amount,
            payment_method,
            status:         'confirmed',
            seat_ids:       seatIds,
            booking_code:   bookingCode,
          },
        ],
        { session },
      );

      // Populate trước khi trả về
      await newBooking.populate([
        {
          path:     'show',
          populate: [
            { path: 'movie',   select: 'title poster_path' },
            { path: 'cinema',  select: 'name location' },
            { path: 'room_id', select: 'name screen_type' },
          ],
        },
        { path: 'user', select: 'name email' },
      ]);

      return newBooking;
    });

    return booking;

  } finally {
    // Luôn đóng session dù thành công hay thất bại
    await session.endSession();
  }
};

export default completeBooking;
