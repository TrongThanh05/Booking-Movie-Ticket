import mongoose from 'mongoose';
import crypto from 'crypto';

// ── Sub-schema: từng vé trong booking ─────────────────────────────────────────
const ticketSchema = new mongoose.Schema(
  {
    seat_id:   { type: String, required: true },
    seat_type: {
      type:    String,
      enum:    ['regular', 'vip', 'couple'],
      default: 'regular',
    },
    price: { type: Number, required: true },
  },
  { _id: false },
);

// ── Sub-schema: từng món F&B trong booking ────────────────────────────────────
const foodItemSchema = new mongoose.Schema(
  {
    foodId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Food', required: true },
    quantity:        { type: Number, required: true, min: 1 },
    priceAtPurchase: { type: Number, required: true, min: 0 }, // snapshot giá lúc mua
  },
  { _id: false },
);

// ── Helper: sinh booking_code duy nhất ────────────────────────────────────────
/**
 * Tạo mã booking dạng BK-XXXXXX (6 ký tự alphanumeric hoa).
 * Sử dụng crypto.randomBytes thay vì Math.random() để tránh trùng lặp.
 */
export const generateBookingCode = () => {
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 hex chars
  return `BK-${rand}`;
};

/**
 * Sinh booking_code đảm bảo unique bằng retry loop.
 * Dùng trong controller/service TRƯỚC khi Booking.create().
 * @param {number} maxRetries - Số lần thử tối đa (mặc định 5)
 * @returns {Promise<string>} Mã booking_code unique
 */
export const generateUniqueBookingCode = async (maxRetries = 5) => {
  for (let i = 0; i < maxRetries; i++) {
    const code = generateBookingCode();
    const exists = await mongoose.model('Booking').findOne({ booking_code: code }).lean();
    if (!exists) return code;
  }
  // Fallback: dùng timestamp + random để đảm bảo unique
  return `BK-${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
};

// ── Main schema ───────────────────────────────────────────────────────────────
const bookingSchema = new mongoose.Schema(
  {
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    show: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Show',
      required: true,
    },
    tickets:        [ticketSchema],
    foods:          { type: [foodItemSchema], default: [] }, // Danh sách F&B đã chọn
    total_amount:   { type: Number, required: true }, // Số tiền cuối cùng khách phải trả
    
    // Voucher & giảm giá
    voucher: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Voucher',
      default:  null,
    },
    discount_amount: { type: Number, default: 0 }, // Số tiền giảm từ voucher

    status: {
      type:    String,
      enum:    ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'confirmed',
    },

    // Chi tiết thanh toán cổng điện tử (VNPAY/MoMo/Stripe)
    payment_method: { type: String },
    payment_status: {
      type:    String,
      enum:    ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    transaction_id: { type: String }, // Mã giao dịch đối tác thanh toán trả về

    booking_code:   { type: String, required: true, unique: true },

    // Trạng thái soát vé tại rạp
    checked_in:     { type: Boolean, default: false },
    checked_in_at:  { type: Date },
    checked_in_by: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      default:  null,
    },

    // seat_ids snapshot — dùng để release nhanh khi cancel
    seat_ids:       { type: [String], default: [] },

    booked_at:      { type: Date, default: Date.now },
    cancelled_at:   { type: Date },
  },
  { timestamps: true },
);

// ── Pre-save fallback (cho trường hợp tạo booking không qua service) ──────────
bookingSchema.pre('save', async function (next) {
  // Sinh booking_code nếu chưa có (fallback, service nên set trước)
  if (!this.booking_code) {
    this.booking_code = generateBookingCode();
  }
  // Snapshot seat_ids từ tickets
  if (this.seat_ids.length === 0 && this.tickets.length > 0) {
    this.seat_ids = this.tickets.map((t) => t.seat_id);
  }
  next();
});

// ── Indexes ───────────────────────────────────────────────────────────────────
bookingSchema.index({ user: 1, booked_at: -1 });
bookingSchema.index({ show: 1 });
// booking_code already has unique: true in schema → auto index

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
