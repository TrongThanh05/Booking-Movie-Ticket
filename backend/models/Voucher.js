import mongoose from "mongoose";

const voucherSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    discount: { type: Number, required: true }, // Số tiền giảm hoặc phần trăm giảm
    discount_type: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' }, // Loại giảm giá
    description: { type: String },
    expires_at: { type: Date },
    limit_per_user: { type: Number, default: 1 },
    usage_limit: { type: Number, default: 100 },
    used_count: { type: Number, default: 0 },
    min_order_value: { type: Number, default: 0 }, // Giá trị đơn hàng tối thiểu
    max_discount_amount: { type: Number }, // Mức giảm tối đa (áp dụng cho discount_type: 'percentage')
    is_active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    applicable_cinemas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Theater' }], // Sửa ref từ 'Cinema' -> 'Theater'
    applicable_movies: [{type: mongoose.Schema.Types.ObjectId, ref: 'Movie'}]
});

const Voucher = mongoose.model('Voucher', voucherSchema);

export default Voucher;