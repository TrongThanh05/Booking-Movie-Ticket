/**
 * scripts/seedVouchers.js
 *
 * Xóa toàn bộ voucher cũ và seed lại theo Voucher schema mới:
 *   - start_date      (Date)   : Ngày bắt đầu hiệu lực
 *   - expires_at      (Date)   : Ngày hết hạn
 *   - applicable_genres ([String]): Thể loại phim
 *   - uppercase / trim code
 *
 * Run: node scripts/seedVouchers.js
 */

import mongoose from 'mongoose';
import dotenv   from 'dotenv';
import Theater  from '../models/Theater.js';
import Movie    from '../models/Movie.js';
import User     from '../models/User.js';
import Voucher  from '../models/Voucher.js';
import Booking, { generateUniqueBookingCode } from '../models/Booking.js';
import Show     from '../models/Show.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/movie-booking';

const log  = (msg) => console.log(`  ✔  ${msg}`);
const warn = (msg) => console.log(`  ⚠  ${msg}`);
const sep  = (t)   => console.log(`\n${'─'.repeat(50)}\n📌 ${t}\n${'─'.repeat(50)}`);

// ══════════════════════════════════════════════════════════════════════════════
const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Kết nối MongoDB thành công');

  // ── Lấy dữ liệu tham chiếu từ DB ──────────────────────────────────────────
  const theaters = await Theater.find().lean();
  const movies   = await Movie.find().lean();

  if (theaters.length === 0) {
    warn('Không tìm thấy theaters. Chạy seedData.js / seedTheaters.js trước!');
    process.exit(1);
  }

  // ── Xóa voucher cũ ────────────────────────────────────────────────────────
  sep('1. Dọn dẹp collection Voucher');
  const oldCount = await Voucher.countDocuments();
  if (oldCount > 0) {
    await Voucher.deleteMany({});
    warn(`Đã xóa ${oldCount} voucher cũ`);
  } else {
    log('Collection đang rỗng — tiến hành seed mới');
  }

  // ── Tính các mốc thời gian ────────────────────────────────────────────────
  sep('2. Seed Vouchers mới');

  const now         = new Date();
  const yesterday   = new Date(now - 86_400_000);          // hôm qua
  const nextWeek    = new Date(now.getTime() + 7  * 86_400_000);
  const nextMonth   = new Date(now.getTime() + 30 * 86_400_000);
  const nextQuarter = new Date(now.getTime() + 90 * 86_400_000);
  const nextYear    = new Date(now.getTime() + 365 * 86_400_000);

  // Helper tạo đối tượng voucher sạch
  const v = (data) => ({
    start_date:          now,           // mặc định: bắt đầu từ bây giờ
    used_count:          0,
    is_active:           true,
    applicable_cinemas:  [],
    applicable_movies:   [],
    applicable_genres:   [],
    ...data,
  });

  const vouchersData = [

    // ════════════════════════════════════════════════════════════════════════
    // NHÓM 1 — TOÀN HỆ THỐNG (applicable_cinemas rỗng = mọi rạp)
    // ════════════════════════════════════════════════════════════════════════

    v({
      code:            'WELCOME50K',
      discount:        50_000,
      discount_type:   'fixed',
      description:     'Chào mừng thành viên mới! Giảm 50.000đ cho lần đặt đầu tiên.',
      expires_at:      nextYear,
      usage_limit:     500,
      limit_per_user:  1,
      min_order_value: 100_000,
    }),

    v({
      code:               'SUMMER20',
      discount:           20,
      discount_type:      'percentage',
      description:        'Khuyến mãi mùa hè — giảm 20% tổng đơn, tối đa 80.000đ.',
      expires_at:         nextQuarter,
      usage_limit:        1_000,
      limit_per_user:     2,
      min_order_value:    150_000,
      max_discount_amount:80_000,
    }),

    v({
      code:               'WEEKEND15',
      discount:           15,
      discount_type:      'percentage',
      description:        'Giảm 15% cuối tuần cho mọi suất chiếu. Tối đa 60.000đ.',
      expires_at:         nextYear,
      usage_limit:        2_000,
      limit_per_user:     5,
      min_order_value:    120_000,
      max_discount_amount:60_000,
    }),

    v({
      code:            'FLASH30K',
      discount:        30_000,
      discount_type:   'fixed',
      description:     'Flash sale! Giảm 30.000đ — chỉ còn 7 ngày.',
      start_date:      now,
      expires_at:      nextWeek,
      usage_limit:     100,
      limit_per_user:  1,
      min_order_value: 85_000,
    }),

    v({
      code:            'COUPLE100K',
      discount:        100_000,
      discount_type:   'fixed',
      description:     'Giảm 100.000đ khi đặt ghế đôi. Giá trị đơn tối thiểu 300.000đ.',
      expires_at:      nextQuarter,
      usage_limit:     300,
      limit_per_user:  1,
      min_order_value: 300_000,
    }),

    // ════════════════════════════════════════════════════════════════════════
    // NHÓM 2 — THEO THỂ LOẠI PHIM
    // ════════════════════════════════════════════════════════════════════════

    v({
      code:             'ACTION25',
      discount:         25,
      discount_type:    'percentage',
      description:      'Giảm 25% khi xem phim Hành động (Action). Tối đa 75.000đ.',
      expires_at:       nextQuarter,
      usage_limit:      500,
      limit_per_user:   3,
      min_order_value:  100_000,
      max_discount_amount: 75_000,
      applicable_genres:['Action', 'Hành động'],
    }),

    v({
      code:             'HORROR30K',
      discount:         30_000,
      discount_type:    'fixed',
      description:      'Giảm 30.000đ khi xem phim Kinh dị (Horror).',
      expires_at:       nextMonth,
      usage_limit:      200,
      limit_per_user:   2,
      min_order_value:  80_000,
      applicable_genres:['Horror', 'Kinh dị'],
    }),

    // ════════════════════════════════════════════════════════════════════════
    // NHÓM 3 — THEO RẠP CỤ THỂ
    // ════════════════════════════════════════════════════════════════════════

    ...(theaters[0] ? [v({
      code:               'RAP1VIP30',
      discount:           30_000,
      discount_type:      'fixed',
      description:        `Voucher độc quyền tại ${theaters[0].name}. Giảm 30.000đ.`,
      expires_at:         nextMonth,
      usage_limit:        200,
      limit_per_user:     1,
      min_order_value:    85_000,
      applicable_cinemas: [theaters[0]._id],
    })] : []),

    ...(theaters[1] ? [v({
      code:               'RAP2DEAL25',
      discount:           25,
      discount_type:      'percentage',
      description:        `Độc quyền ${theaters[1].name} — giảm 25%, tối đa 100.000đ.`,
      expires_at:         nextQuarter,
      usage_limit:        500,
      limit_per_user:     2,
      min_order_value:    200_000,
      max_discount_amount:100_000,
      applicable_cinemas: [theaters[1]._id],
    })] : []),

    // ════════════════════════════════════════════════════════════════════════
    // NHÓM 4 — THEO PHIM CỤ THỂ
    // ════════════════════════════════════════════════════════════════════════

    ...(movies[0] ? [v({
      code:              'PHIM1GIAM50K',
      discount:          50_000,
      discount_type:     'fixed',
      description:       `Giảm 50.000đ khi xem "${movies[0].title}". Áp dụng mọi rạp.`,
      expires_at:        nextMonth,
      usage_limit:       100,
      limit_per_user:    1,
      min_order_value:   85_000,
      applicable_movies: [movies[0]._id],
    })] : []),

    ...(movies[1] ? [v({
      code:              'PHIM2GIAM10',
      discount:          10,
      discount_type:     'percentage',
      description:       `Giảm 10% khi xem "${movies[1].title}". Không giới hạn giảm tối đa.`,
      expires_at:        nextQuarter,
      usage_limit:       150,
      limit_per_user:    2,
      min_order_value:   70_000,
      applicable_movies: [movies[1]._id],
    })] : []),

    // ════════════════════════════════════════════════════════════════════════
    // NHÓM 5 — DÀNH CHO KIỂM THỬ (TEST CASES)
    // ════════════════════════════════════════════════════════════════════════

    v({
      code:           'EXPIRED_OLD',
      discount:       10,
      discount_type:  'percentage',
      description:    '[TEST] Voucher đã hết hạn.',
      start_date:     new Date('2024-01-01'),
      expires_at:     new Date('2025-01-01'),
      usage_limit:    100,
      limit_per_user: 1,
      min_order_value:0,
      is_active:      true,   // active nhưng đã quá expires_at → server reject
    }),

    v({
      code:           'NOT_STARTED',
      discount:       50,
      discount_type:  'percentage',
      description:    '[TEST] Voucher chưa đến ngày bắt đầu.',
      start_date:     nextYear,         // bắt đầu 1 năm sau
      expires_at:     new Date(nextYear.getTime() + 30 * 86_400_000),
      usage_limit:    100,
      limit_per_user: 1,
      min_order_value:0,
      is_active:      true,
    }),

    v({
      code:           'INACTIVE_OFF',
      discount:       99,
      discount_type:  'percentage',
      description:    '[TEST] Voucher bị admin tắt (is_active=false).',
      expires_at:     nextYear,
      usage_limit:    1,
      limit_per_user: 1,
      min_order_value:0,
      is_active:      false,
    }),

    v({
      code:           'USED_UP',
      discount:       20_000,
      discount_type:  'fixed',
      description:    '[TEST] Voucher đã hết lượt sử dụng (used_count >= usage_limit).',
      expires_at:     nextYear,
      usage_limit:    5,
      used_count:     5,        // đã dùng hết
      limit_per_user: 1,
      min_order_value:0,
      is_active:      true,
    }),

    v({
      code:            'MINORDER500K',
      discount:        150_000,
      discount_type:   'fixed',
      description:     '[TEST] Yêu cầu đơn tối thiểu 500.000đ.',
      expires_at:      nextYear,
      usage_limit:     50,
      limit_per_user:  1,
      min_order_value: 500_000,
      is_active:       true,
    }),
  ];

  const vouchers = await Voucher.insertMany(vouchersData);
  log(`Đã tạo ${vouchers.length} vouchers`);

  // In bảng tóm tắt
  console.log('');
  console.log('  Code              │ Loại       │ Giảm          │ Scope            │ Active');
  console.log('  ──────────────────┼────────────┼───────────────┼──────────────────┼───────');
  for (const vc of vouchers) {
    const discStr = vc.discount_type === 'fixed'
      ? `-${(vc.discount / 1000).toFixed(0)}K`.padEnd(13)
      : `-${vc.discount}%`.padEnd(13);
    const scopeParts = [];
    if (vc.applicable_cinemas.length > 0) scopeParts.push(`${vc.applicable_cinemas.length} rạp`);
    if (vc.applicable_movies.length  > 0) scopeParts.push(`${vc.applicable_movies.length} phim`);
    if (vc.applicable_genres.length  > 0) scopeParts.push(`genre`);
    const scope = scopeParts.length > 0 ? scopeParts.join('+') : 'Toàn hệ thống';
    console.log(
      `  ${vc.code.padEnd(17)} │ ${vc.discount_type.padEnd(10)} │ ${discStr} │ ${scope.padEnd(16)} │ ${vc.is_active ? '✅' : '❌'}`
    );
  }

  // ── Seed 1 booking mẫu có voucher (nếu chưa có) ──────────────────────────
  sep('3. Booking mẫu có Voucher');

  const existingVoucherBooking = await Booking.findOne({ voucher: { $ne: null } }).lean();
  if (existingVoucherBooking) {
    warn('Đã tồn tại booking gắn voucher → bỏ qua bước này');
  } else {
    const sampleUser  = await User.findOne({ role: 'user' }).lean();
    const sampleShow  = await Show.findOne({ is_active: true }).lean();
    const globalVoucher = vouchers.find((vc) => vc.code === 'WELCOME50K');

    if (sampleUser && sampleShow && globalVoucher) {
      const code          = await generateUniqueBookingCode();
      const rawTotal      = sampleShow.base_price * 2;
      const discountAmt   = Math.min(globalVoucher.discount, rawTotal);
      const finalTotal    = Math.max(rawTotal - discountAmt, 0);

      const booking = await Booking.create({
        user:            sampleUser._id,
        show:            sampleShow._id,
        booking_code:    code,
        tickets: [
          { seat_id: 'F1', seat_type: 'vip', price: sampleShow.base_price * 1.5 },
          { seat_id: 'F2', seat_type: 'vip', price: sampleShow.base_price * 1.5 },
        ],
        total_amount:    finalTotal,
        voucher:         globalVoucher._id,
        discount_amount: discountAmt,
        payment_method:  'VNPAY',
        payment_status:  'paid',
        transaction_id:  `VNPAY_SEED_${Date.now()}`,
        status:          'confirmed',
      });
      log(`Booking mẫu OK → ${booking.booking_code} | giảm -${discountAmt.toLocaleString()}đ | total: ${finalTotal.toLocaleString()}đ`);
    } else {
      warn('Thiếu user / show / voucher — bỏ qua tạo booking mẫu');
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n🎉  ══════════════════════════════════════════════');
  console.log('    SEED HOÀN TẤT');
  console.log('══════════════════════════════════════════════════');

  const total = await Voucher.countDocuments();
  const active = await Voucher.countDocuments({ is_active: true });
  console.log(`  🎟  Tổng voucher trong DB : ${total}`);
  console.log(`  ✅  Đang hoạt động        : ${active}`);
  console.log(`  ❌  Vô hiệu / test        : ${total - active}`);
  console.log('');
  console.log('  Mã test ngay trên giao diện (toàn hệ thống):');
  for (const vc of vouchers.filter((vc) => vc.is_active && vc.applicable_cinemas.length === 0 && vc.applicable_movies.length === 0 && vc.applicable_genres.length === 0)) {
    const discStr = vc.discount_type === 'fixed'
      ? `giảm ${vc.discount.toLocaleString()}đ`
      : `giảm ${vc.discount}%`;
    console.log(`    ${vc.code.padEnd(18)} → ${discStr}`);
  }
  console.log('══════════════════════════════════════════════════\n');

  await mongoose.disconnect();
  console.log('🔌 Đã ngắt kết nối MongoDB.\n');
};

run().catch((err) => {
  console.error('❌ Seed thất bại:', err);
  process.exit(1);
});
