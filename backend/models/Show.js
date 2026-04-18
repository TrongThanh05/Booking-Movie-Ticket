import mongoose from 'mongoose';

// ──────────────────────────────────────────────────────────────────────────────
// Sub-schema: ghế đang được GIỮ tạm (locked) — chống race condition
// Bị xóa tự động sau khi hold_until hết hạn (TTL logic xử lý bằng cron)
// ──────────────────────────────────────────────────────────────────────────────
const lockedSeatSchema = new mongoose.Schema(
  {
    seat_id:   { type: String, required: true },   // VD: "F5", "A3"
    user_id: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    hold_until:  { type: Date, required: true },   // hết hạn lock sau N phút
    locked_at:   { type: Date, default: Date.now },
  },
  { _id: false },
);

// ──────────────────────────────────────────────────────────────────────────────
// Show Schema
// ──────────────────────────────────────────────────────────────────────────────
const showSchema = new mongoose.Schema(
  {
    movie: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Movie',
      required: true,
    },

    cinema: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Theater',
      required: true,
    },

    room_id: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Room',
      required: true,
    },

    showDateTime: { type: Date, required: true },
    base_price:   { type: Number, required: true }, // Giá gốc (VND)
    duration:     { type: Number },                 // phút
    language:     { type: String, default: 'Phụ đề Việt' },
    format:       { type: String, default: '2D' },  // 2D, 3D, IMAX, 4DX
    is_active:    { type: Boolean, default: true },

    /**
     * reserved_seats[]: ghế đang bị LOCK tạm thời
     * ─ Khi user chọn ghế và bắt đầu thanh toán → push vào đây
     * ─ Khi thanh toán thất bại / timeout → xóa khỏi đây (cron / endpoint unlock)
     * ─ Khi thanh toán thành công → xóa khỏi đây và push seat_id vào booked_seats
     */
    reserved_seats: { type: [lockedSeatSchema], default: [] },

    /**
     * booked_seats[]: danh sách seat_id ĐÃ THANH TOÁN THÀNH CÔNG
     * ─ Bất biến sau khi được ghi (chỉ thêm, không xóa)
     * ─ Dùng để render sơ đồ ghế: nếu seat_id nằm ở đây → màu đỏ (Đã đặt)
     * ─ Update bằng $addToSet để đảm bảo không trùng lặp (atomic)
     */
    booked_seats: {
      type:    [String],  // mảng seat_id string: ["A1", "A2", "B5"]
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// Indexes
// ──────────────────────────────────────────────────────────────────────────────

// Truy vấn nhanh theo ngày chiếu
showSchema.index({ showDateTime: 1 });

// Tìm shows theo phim + ngày
showSchema.index({ movie: 1, showDateTime: 1 });

// Tìm shows theo rạp + ngày (dùng cho trang lịch chiếu)
showSchema.index({ cinema: 1, showDateTime: 1 });

// Kiểm tra ghế đã đặt nhanh (nếu dùng $elemMatch)
showSchema.index({ booked_seats: 1 });

const Show = mongoose.model('Show', showSchema);

export default Show;
