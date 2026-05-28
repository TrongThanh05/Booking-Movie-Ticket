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
    endDateTime:  { type: Date },                   // Giờ kết thúc (tự động tính)
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

// Sắp xếp theo thời gian kết thúc
showSchema.index({ endDateTime: 1 });

// ──────────────────────────────────────────────────────────────────────────────
// Pre-save hook: Tự động tính endDateTime và kiểm tra trùng lịch phòng chiếu
// ──────────────────────────────────────────────────────────────────────────────
showSchema.pre('save', async function (next) {
  if (this.duration && this.showDateTime) {
    // endDateTime = showDateTime + duration (phút)
    this.endDateTime = new Date(this.showDateTime.getTime() + this.duration * 60000);
  }

  // Kiểm tra trùng lịch phòng chiếu
  if (this.room_id && this.showDateTime && this.endDateTime) {
    try {
      const overlap = await mongoose.model('Show').findOne({
        _id: { $ne: this._id }, // loại trừ suất chiếu hiện tại
        room_id: this.room_id,
        is_active: true,
        $or: [
          // 1. Suất chiếu khác bắt đầu trong lúc suất chiếu này đang chiếu
          { showDateTime: { $lt: this.endDateTime, $gte: this.showDateTime } },
          // 2. Suất chiếu khác kết thúc trong lúc suất chiếu này đang chiếu
          { endDateTime: { $gt: this.showDateTime, $lte: this.endDateTime } },
          // 3. Suất chiếu khác bao trọn hoàn toàn suất chiếu này
          { showDateTime: { $lte: this.showDateTime }, endDateTime: { $gte: this.endDateTime } },
        ],
      });

      if (overlap) {
        return next(
          new Error(
            `Trùng lịch chiếu! Phòng chiếu này đã được xếp lịch chiếu phim khác trong khoảng thời gian từ ${overlap.showDateTime.toLocaleTimeString('vi-VN')} đến ${overlap.endDateTime.toLocaleTimeString('vi-VN')}.`
          )
        );
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

const Show = mongoose.model('Show', showSchema);

export default Show;
