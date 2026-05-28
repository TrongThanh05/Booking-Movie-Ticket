import mongoose from 'mongoose';

// ──────────────────────────────────────────────────────────────────────────────
// Sub-schema: một ghế cụ thể trong phòng (sơ đồ gốc, bất biến)
// ──────────────────────────────────────────────────────────────────────────────
const seatSchema = new mongoose.Schema(
  {
    seat_id: { type: String, required: true }, // VD: "A1", "B12", "VIP-C3"
    row:     { type: String, required: true }, // "A", "B", "C", ...
    number:  { type: Number, required: true }, // 1, 2, 3, ...
    type: {
      type: String,
      enum: ['regular', 'vip', 'couple'],
      default: 'regular',
    },
    price_multiplier: { type: Number, default: 1.0 }, // 1.0 Standard, 1.5 VIP, 2.0 Couple
    status: {
      type: String,
      enum: ['active', 'broken', 'maintenance'],
      default: 'active',
    },
  },
  { _id: false }, // không cần _id riêng cho mỗi ghế
);

// ──────────────────────────────────────────────────────────────────────────────
// Sub-schema: cấu hình từng hàng ghế (dùng để tạo seats[])
// ──────────────────────────────────────────────────────────────────────────────
const rowConfigSchema = new mongoose.Schema(
  {
    row:              { type: String, required: true }, // "A", "B", ...
    type:             { type: String, enum: ['regular', 'vip', 'couple'], default: 'regular' },
    price_multiplier: { type: Number, default: 1.0 },
  },
  { _id: false },
);

// ──────────────────────────────────────────────────────────────────────────────
// Sub-schema: bố cục phòng (dùng bởi seat-map renderer)
// ──────────────────────────────────────────────────────────────────────────────
const layoutSchema = new mongoose.Schema(
  {
    rows:        { type: Number, required: true }, // tổng số hàng
    columns:     { type: Number, required: true }, // số ghế/hàng
    row_configs: [rowConfigSchema],                // chi tiết từng hàng
  },
  { _id: false },
);

// ──────────────────────────────────────────────────────────────────────────────
// Room Schema
// ──────────────────────────────────────────────────────────────────────────────
const roomSchema = new mongoose.Schema(
  {
    theater_id: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Theater',
      required: true,
    },

    name: { type: String, required: true }, // "Phòng chiếu 1", "IMAX Hall"

    screen_type: {
      type:    String,
      enum:    ['2D', '3D', 'IMAX', '4DX'],
      default: '2D',
    },

    /**
     * layout: dùng để render seat-map (số hàng, số cột, loại từng hàng).
     * Đây là cấu hình gốc — không đổi trừ khi phòng được cải tạo.
     */
    layout: { type: layoutSchema, required: true },

    /**
     * seats[]: mảng ghế vật lý thực tế của phòng.
     * Mỗi ghế có seat_id duy nhất, row, number, type, price_multiplier.
     *
     * Ưu điểm so với chỉ dùng layout:
     *   - Có thể query trực tiếp: Room.findById(id).select('seats')
     *   - Tham chiếu seat_id chính xác khi push vào shows.booked_seats
     *   - Hỗ trợ phòng không đều (ghế bị khuyết, hàng đặc biệt)
     *
     * Cách sinh: gọi helper generateSeats(layout) khi tạo phòng.
     */
    seats: { type: [seatSchema], default: [] },

    status: {
      type:    String,
      enum:    ['active', 'maintenance', 'inactive'],
      default: 'active',
    },

    capacity: { type: Number, default: 0 }, // tổng ghế, auto-set bởi pre-save hook
  },
  {
    timestamps: true,
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// Helper: sinh danh sách ghế từ layout
// ──────────────────────────────────────────────────────────────────────────────
export const generateSeats = (layout) => {
  const seats = [];
  for (const rowCfg of layout.row_configs) {
    for (let col = 1; col <= layout.columns; col++) {
      seats.push({
        seat_id:          `${rowCfg.row}${col}`,
        row:              rowCfg.row,
        number:           col,
        type:             rowCfg.type || 'regular',
        price_multiplier: rowCfg.price_multiplier ?? 1.0,
        status:           'active',
      });
    }
  }
  return seats;
};

// ──────────────────────────────────────────────────────────────────────────────
// Pre-save hook: tự động sinh seats[] và capacity nếu chưa có
// ──────────────────────────────────────────────────────────────────────────────
roomSchema.pre('save', function (next) {
  if (this.isModified('layout') || this.seats.length === 0) {
    this.seats    = generateSeats(this.layout);
    this.capacity = this.seats.length;
  }
  next();
});

// ──────────────────────────────────────────────────────────────────────────────
// Indexes
// ──────────────────────────────────────────────────────────────────────────────

// Mỗi theater không có 2 phòng trùng tên
roomSchema.index({ theater_id: 1, name: 1 }, { unique: true });

// Tìm ghế theo seat_id trong một phòng (dùng cho validation)
roomSchema.index({ 'seats.seat_id': 1 });

const Room = mongoose.model('Room', roomSchema);

export default Room;
