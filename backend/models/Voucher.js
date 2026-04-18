import mongoose from "mongoose";

const voucherSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    discount: { type: Number, required: true },
    description: { type: String },
    expires_at: { type: Date },
    limit_per_user: { type: Number, default: 1 },
    usage_limit: { type: Number, default: 100 },
    used_count: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    applicable_cinemas: [{ type: String }],
    applicable_movies: [{type: String}]
});

const Voucher = mongoose.model('Voucher', voucherSchema);

export default Voucher;