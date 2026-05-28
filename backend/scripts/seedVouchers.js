/**
 * scripts/seedVouchers.js
 *
 * Seed thêm dữ liệu còn thiếu vào database:
 *   1. Vouchers (collection mới, chưa có trong seedData.js ban đầu)
 *   2. Super-admin account (admin không có theater_id)
 *   3. Cập nhật sample Bookings để có đủ: voucher, payment_status, transaction_id
 *
 * Run: node scripts/seedVouchers.js
 *
 * LƯU Ý: Script này KHÔNG xóa data hiện có, chỉ thêm/cập nhật những gì còn thiếu.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Theater  from '../models/Theater.js';
import Movie    from '../models/Movie.js';
import User     from '../models/User.js';
import Voucher  from '../models/Voucher.js';
import Booking, { generateUniqueBookingCode } from '../models/Booking.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/movie-booking';

// ── Helper ─────────────────────────────────────────────────────────────────────
const log  = (msg) => console.log(`  ✔ ${msg}`);
const warn = (msg) => console.log(`  ⚠ ${msg}`);
const sep  = (t)   => console.log(`\n────────────────────────────────────────\n📌 ${t}\n────────────────────────────────────────`);

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════
const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // ── 1. Đảm bảo có Super-Admin (admin không có theater_id) ─────────────────
  sep('1. Super-Admin Account');

  const SUPER_ADMIN_EMAIL = 'superadmin@tcine.vn';
  let superAdmin = await User.findOne({ email: SUPER_ADMIN_EMAIL });
  if (superAdmin) {
    warn(`Super-admin đã tồn tại: ${SUPER_ADMIN_EMAIL}`);
  } else {
    superAdmin = await User.create({
      name:       'Super Admin',
      email:      SUPER_ADMIN_EMAIL,
      password:   'SuperAdmin@2026',
      phone:      '0900000099',
      role:       'admin',
      theater_id: null,   // null = super-admin (không ràng buộc rạp nào)
    });
    log(`Super-admin tạo OK → ${superAdmin.email}`);
  }

  // Đảm bảo 2 admin cũ từ seedData không có theater_id (họ là super-admin level)
  const adminEmails = ['admin@cinemax.vn', 'manager@cgv.vn'];
  for (const email of adminEmails) {
    const admin = await User.findOne({ email });
    if (admin && admin.theater_id) {
      warn(`Admin "${email}" đang có theater_id=${admin.theater_id}. Giữ nguyên (theater-owner).`);
    } else if (admin) {
      log(`Admin "${email}" — OK (super-admin, không có theater_id)`);
    } else {
      warn(`Không tìm thấy admin: ${email} (có thể chưa seed users)`);
    }
  }

  // ── 2. Seed Vouchers ───────────────────────────────────────────────────────
  sep('2. Vouchers Collection');

  // Lấy dữ liệu tham chiếu
  const theaters = await Theater.find().lean();
  const movies   = await Movie.find().lean();

  if (theaters.length === 0) {
    warn('Không tìm thấy theaters. Hãy chạy seedData.js trước!');
    process.exit(1);
  }

  // Xóa vouchers cũ (nếu có) để tránh duplicate code
  const existingCount = await Voucher.countDocuments();
  if (existingCount > 0) {
    warn(`Tìm thấy ${existingCount} voucher cũ → xóa để seed lại`);
    await Voucher.deleteMany({});
  }

  const now = new Date();
  const nextMonth    = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const nextQuarter  = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
  const nextYear     = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

  const vouchersData = [
    // ── Voucher toàn hệ thống (applicable_cinemas rỗng = áp dụng mọi rạp) ──
    {
      code:               'WELCOME2026',
      discount:           50000,
      discount_type:      'fixed',
      description:        'Chào mừng thành viên mới! Giảm 50,000đ cho lần đặt vé đầu tiên.',
      expires_at:         nextYear,
      limit_per_user:     1,
      usage_limit:        500,
      min_order_value:    100000,
      is_active:          true,
      applicable_cinemas: [],   // toàn hệ thống
      applicable_movies:  [],
    },
    {
      code:               'SUMMER20',
      discount:           20,
      discount_type:      'percentage',
      description:        'Khuyến mãi mùa hè — giảm 20% tổng đơn hàng, tối đa 80,000đ.',
      expires_at:         nextQuarter,
      limit_per_user:     2,
      usage_limit:        1000,
      min_order_value:    150000,
      max_discount_amount: 80000,
      is_active:          true,
      applicable_cinemas: [],
      applicable_movies:  [],
    },
    {
      code:               'WEEKEND15',
      discount:           15,
      discount_type:      'percentage',
      description:        'Giảm 15% cuối tuần cho mọi suất chiếu. Tối đa 60,000đ.',
      expires_at:         nextYear,
      limit_per_user:     5,
      usage_limit:        2000,
      min_order_value:    120000,
      max_discount_amount: 60000,
      is_active:          true,
      applicable_cinemas: [],
      applicable_movies:  [],
    },
    {
      code:               'COUPLE100K',
      discount:           100000,
      discount_type:      'fixed',
      description:        'Giảm 100,000đ khi đặt vé đôi (couple seat). Dành riêng cho ghế đôi.',
      expires_at:         nextQuarter,
      limit_per_user:     1,
      usage_limit:        300,
      min_order_value:    300000,
      is_active:          true,
      applicable_cinemas: [],
      applicable_movies:  [],
    },

    // ── Voucher gắn với theater cụ thể ──────────────────────────────────────
    ...(theaters[0] ? [{
      code:               'CGV2026',
      discount:           30000,
      discount_type:      'fixed',
      description:        `Voucher độc quyền tại ${theaters[0].name}. Giảm 30,000đ.`,
      expires_at:         nextMonth,
      limit_per_user:     1,
      usage_limit:        200,
      min_order_value:    85000,
      is_active:          true,
      applicable_cinemas: [theaters[0]._id],
      applicable_movies:  [],
    }] : []),

    ...(theaters[1] ? [{
      code:               'LOTTE25',
      discount:           25,
      discount_type:      'percentage',
      description:        `Độc quyền Lotte Cinema — giảm 25% tối đa 100,000đ tại ${theaters[1].name}.`,
      expires_at:         nextQuarter,
      limit_per_user:     2,
      usage_limit:        500,
      min_order_value:    200000,
      max_discount_amount: 100000,
      is_active:          true,
      applicable_cinemas: [theaters[1]._id],
      applicable_movies:  [],
    }] : []),

    // ── Voucher áp dụng cho phim cụ thể ─────────────────────────────────────
    ...(movies[0] ? [{
      code:               'AVENGERS50K',
      discount:           50000,
      discount_type:      'fixed',
      description:        `Giảm 50,000đ khi xem ${movies[0].title}. Áp dụng mọi rạp.`,
      expires_at:         nextMonth,
      limit_per_user:     1,
      usage_limit:        100,
      min_order_value:    85000,
      is_active:          true,
      applicable_cinemas: [],
      applicable_movies:  [movies[0]._id],
    }] : []),

    // ── Voucher hết hạn (để test UI "Voucher không hợp lệ") ─────────────────
    {
      code:               'EXPIRED2025',
      discount:           10,
      discount_type:      'percentage',
      description:        'Voucher đã hết hạn — chỉ dùng cho mục đích kiểm thử.',
      expires_at:         new Date('2025-01-01'),
      limit_per_user:     1,
      usage_limit:        100,
      min_order_value:    0,
      is_active:          false,
      applicable_cinemas: [],
      applicable_movies:  [],
    },

    // ── Voucher inactive (admin tắt) ─────────────────────────────────────────
    {
      code:               'INACTIVE_TEST',
      discount:           99,
      discount_type:      'percentage',
      description:        'Voucher bị vô hiệu hóa — chỉ dùng để test.',
      expires_at:         nextYear,
      limit_per_user:     1,
      usage_limit:        1,
      min_order_value:    0,
      is_active:          false,
      applicable_cinemas: [],
      applicable_movies:  [],
    },
  ];

  const vouchers = await Voucher.create(vouchersData);
  log(`Đã tạo ${vouchers.length} vouchers`);
  for (const v of vouchers) {
    const scope = v.applicable_cinemas.length > 0
      ? `rạp cụ thể (${v.applicable_cinemas.length})`
      : 'toàn hệ thống';
    log(`  [${v.discount_type === 'fixed' ? `-${v.discount.toLocaleString()}đ` : `-${v.discount}%`}] ${v.code} — ${scope} — active:${v.is_active}`);
  }

  // ── 3. Cập nhật Bookings còn thiếu payment_status / transaction_id ─────────
  sep('3. Cập nhật Bookings thiếu payment_status');

  const bookings = await Booking.find({ payment_status: { $exists: false } });
  if (bookings.length === 0) {
    log('Tất cả bookings đã có payment_status — không cần cập nhật');
  } else {
    for (const b of bookings) {
      if (b.status === 'cancelled') {
        b.payment_status = 'failed';
      } else if (b.status === 'completed' || b.status === 'confirmed') {
        b.payment_status = 'paid';
        b.transaction_id = `TXN_SEED_${b._id.toString().slice(-8).toUpperCase()}`;
      } else {
        b.payment_status = 'pending';
      }
      await b.save();
    }
    log(`Đã cập nhật payment_status cho ${bookings.length} bookings`);
  }

  // ── 4. Tạo 1 Booking mẫu có gắn Voucher ──────────────────────────────────
  sep('4. Booking mẫu có Voucher');

  const sampleBookingExists = await Booking.findOne({ voucher: { $ne: null } });
  if (sampleBookingExists) {
    warn('Đã tồn tại booking có voucher → bỏ qua');
  } else {
    // Lấy user đầu tiên
    const sampleUser = await User.findOne({ role: 'user' });
    const { default: Show } = await import('../models/Show.js');
    const sampleShow = await Show.findOne({ is_active: true });
    const globalVoucher = vouchers.find(v => v.code === 'WELCOME2026');

    if (sampleUser && sampleShow && globalVoucher) {
      const code = await generateUniqueBookingCode();
      const discountAmount = Math.min(globalVoucher.discount, 50000);
      const rawTotal = sampleShow.base_price * 2;
      const finalTotal = Math.max(rawTotal - discountAmount, 0);

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
        discount_amount: discountAmount,
        payment_method:  'VNPAY',
        payment_status:  'paid',
        transaction_id:  `VNPAY_VOUCHER_${Date.now()}`,
        status:          'confirmed',
        checked_in:      false,
      });
      log(`Booking có voucher tạo OK → code: ${booking.booking_code} | discount: -${discountAmount.toLocaleString()}đ`);
    } else {
      warn('Không đủ data để tạo booking mẫu có voucher (thiếu user/show/voucher)');
    }
  }

  // ── SUMMARY ────────────────────────────────────────────────────────────────
  console.log('\n🎉 ══════════════════════════════════════════════');
  console.log('   SEED VOUCHERS & EXTRAS HOÀN THÀNH!');
  console.log('══════════════════════════════════════════════════');

  const counts = await Promise.all([
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ role: 'admin' }),
    Voucher.countDocuments(),
    Booking.countDocuments(),
  ]);
  console.log(`  👤 Users (user role):   ${counts[0]}`);
  console.log(`  🔑 Admins:              ${counts[1]}`);
  console.log(`  🎟  Vouchers:            ${counts[2]}`);
  console.log(`  🎫 Bookings:            ${counts[3]}`);
  console.log('══════════════════════════════════════════════════');
  console.log('\n📧 Tài khoản test:');
  console.log('  Super-Admin: superadmin@tcine.vn / SuperAdmin@2026');
  console.log('  Admin:       admin@cinemax.vn    / admin123');
  console.log('  Admin:       manager@cgv.vn      / admin123');
  console.log('');
  console.log('  Voucher codes:');
  for (const v of vouchers.filter(v => v.is_active)) {
    console.log(`    ${v.code}`);
  }
  console.log('');

  await mongoose.disconnect();
  console.log('🔌 Disconnected.\n');
};

run().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
