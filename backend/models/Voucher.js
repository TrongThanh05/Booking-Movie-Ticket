import mongoose from "mongoose";

const voucherSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discount: { type: Number, required: true }, // Số tiền giảm hoặc phần trăm giảm
    discount_type: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' }, // Loại giảm giá
    description: { type: String },

    // Thời hạn hiệu lực
    start_date: { type: Date, default: Date.now },    // Ngày bắt đầu có hiệu lực
    expires_at:  { type: Date },                      // Ngày hết hạn

    // Giới hạn sử dụng
    usage_limit:    { type: Number, default: 100 },   // Tổng số lượt phát hành
    used_count:     { type: Number, default: 0 },     // Số lượt đã dùng
    limit_per_user: { type: Number, default: 1 },     // Tối đa mỗi user

    // Điều kiện giá trị đơn hàng
    min_order_value:     { type: Number, default: 0    }, // Giá trị tối thiểu để áp dụng
    max_discount_amount: { type: Number, default: null }, // Mức giảm tối đa (áp dụng cho percentage)

    is_active:  { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },

    // Ràng buộc phạm vi áp dụng (mảng rỗng = áp dụng tất cả)
    applicable_cinemas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Theater' }], // Rạp
    applicable_movies:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Movie'   }], // Phim cụ thể
    applicable_genres:  [{ type: String }],                                          // Thể loại phim
});

const Voucher = mongoose.model('Voucher', voucherSchema);

export default Voucher;