/**
 * @file test-db-schemas.js
 * @description Script kiểm thử tự động các Schema đã nâng cấp theo database_implementation_plan.md
 *
 * Chạy bằng lệnh (từ thư mục backend/):
 *   node scripts/test-db-schemas.js
 *
 * Bao gồm 3 kịch bản kiểm thử chính:
 *   [Test 1] Tạo Voucher và .populate('applicable_cinemas') → xác nhận ref: 'Theater' đúng
 *   [Test 2] Tạo 2 suất chiếu trùng lịch trong cùng phòng → xác nhận pre-save hook chặn thành công
 *   [Test 3] Tạo Booking gắn Voucher + payment_status + check-in fields → xác nhận schema đầy đủ
 */

import 'dotenv/config';
import mongoose from 'mongoose';

// ── Import Models ─────────────────────────────────────────────────────────────
import Theater  from '../models/Theater.js';
import Room     from '../models/Room.js';
import Movie    from '../models/Movie.js';
import User     from '../models/User.js';
import Voucher  from '../models/Voucher.js';
import Show     from '../models/Show.js';
import Booking  from '../models/Booking.js';
import { generateUniqueBookingCode } from '../models/Booking.js';

// ── Logging Helpers ───────────────────────────────────────────────────────────
const log  = (msg)        => console.log(`   ${msg}`);
const pass = (msg)        => console.log(`   ✅ PASS: ${msg}`);
const fail = (msg, err)   => console.error(`   ❌ FAIL: ${msg}`, err?.message || err || '');
const sep  = (title)      => console.log(`\n${'─'.repeat(60)}\n🧪 ${title}\n${'─'.repeat(60)}`);

// ── ID lưu tạm để cleanup sau khi test ────────────────────────────────────────
const createdIds = {
  theater : null,
  room    : null,
  movie   : null,
  user    : null,
  voucher : null,
  shows   : [],
  booking : null,
};

// ─────────────────────────────────────────────────────────────────────────────
// SETUP: Tạo dữ liệu cơ sở (Theater, Room, Movie, User) dùng chung cho các test
// ─────────────────────────────────────────────────────────────────────────────
async function setup() {
  console.log('\n⚙️  Đang khởi tạo dữ liệu test cơ sở...');

  // Theater — phải cung cấp đủ cả `location` lẫn `address` (required)
  const theater = await Theater.create({
    name    : '__TEST__ Rạp CGV Quận 1',
    location: 'TP. Hồ Chí Minh',
    address : '123 Nguyễn Huệ, Q.1, TP.HCM',
  });
  createdIds.theater = theater._id;
  log(`Theater tạo OK → _id: ${theater._id}`);

  // Room
  const room = await Room.create({
    theater_id  : theater._id,
    name        : '__TEST__ Phòng 1',
    screen_type : '2D',
    layout: {
      rows       : 3,
      columns    : 4,
      row_configs: [
        { row: 'A', type: 'regular', price_multiplier: 1.0 },
        { row: 'B', type: 'vip',     price_multiplier: 1.5 },
        { row: 'C', type: 'couple',  price_multiplier: 2.0 },
      ],
    },
  });
  createdIds.room = room._id;
  log(`Room tạo OK → _id: ${room._id} | capacity: ${room.capacity} | seats: ${room.seats.length}`);

  // Kiểm tra trạng thái ghế từ pre-save hook Room
  const hasStatus = room.seats.every(s => ['active', 'broken', 'maintenance'].includes(s.status));
  if (hasStatus) {
    log(`  → Tất cả ${room.seats.length} ghế có trường status hợp lệ ✓`);
  }

  // Movie
  const movie = await Movie.create({
    title          : '__TEST__ Avengers: Endgame',
    runtime        : 182,
    release_date   : new Date('2019-04-26'),
    age_rating     : 'T13',
    status         : 'now_showing',
    vote_average   : 8.4,
  });
  createdIds.movie = movie._id;
  log(`Movie tạo OK → age_rating: ${movie.age_rating} | status: ${movie.status}`);

  // User
  const user = await User.create({
    name     : '__TEST__ Nguyễn Văn A',
    email    : `test_${Date.now()}@schemas.local`,
    password : 'hashed_password_placeholder',
  });
  createdIds.user = user._id;
  log(`User tạo OK → _id: ${user._id}`);

  console.log('\n✅ Setup hoàn tất.\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1: Voucher → ref: 'Theater' & populate
// ─────────────────────────────────────────────────────────────────────────────
async function test1_voucher() {
  sep('TEST 1 — Voucher: ref Theater & populate()');

  try {
    const voucher = await Voucher.create({
      code               : `SCHEMA_TEST_${Date.now()}`,
      discount           : 20,
      discount_type      : 'percentage',
      min_order_value    : 100_000,
      max_discount_amount: 50_000,
      usage_limit        : 10,
      is_active          : true,
      applicable_cinemas : [createdIds.theater],   // trỏ đến Theater._id
      applicable_movies  : [createdIds.movie],
    });
    createdIds.voucher = voucher._id;
    pass(`Voucher tạo thành công | code: ${voucher.code}`);

    // populate()
    const populated = await Voucher.findById(voucher._id).populate('applicable_cinemas');
    const theater   = populated.applicable_cinemas[0];

    if (theater && theater.name) {
      pass(`populate('applicable_cinemas') thành công → Theater name: "${theater.name}"`);
    } else {
      fail('populate() không trả về Theater document đúng cách');
    }

    // Xác nhận các trường mới
    const checks = [
      { field: 'discount_type',       val: voucher.discount_type,       expected: 'percentage' },
      { field: 'min_order_value',     val: voucher.min_order_value,     expected: 100_000 },
      { field: 'max_discount_amount', val: voucher.max_discount_amount, expected: 50_000 },
    ];
    for (const c of checks) {
      if (c.val === c.expected) {
        pass(`Trường "${c.field}" = ${c.val} ✓`);
      } else {
        fail(`Trường "${c.field}" = ${c.val}, expected ${c.expected}`);
      }
    }

  } catch (err) {
    fail('Test 1 thất bại với lỗi không mong đợi', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2: Show → pre-save hook tính endDateTime + chặn overlap
// ─────────────────────────────────────────────────────────────────────────────
async function test2_showOverlap() {
  sep('TEST 2 — Show: endDateTime tự động & chặn trùng lịch phòng');

  const baseTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 ngày sau

  // Suất chiếu 1: 19:00 → 19:00 + 120 phút = 21:00
  const show1StartTime = new Date(baseTime);
  show1StartTime.setHours(19, 0, 0, 0);

  try {
    const show1 = await Show.create({
      movie       : createdIds.movie,
      cinema      : createdIds.theater,
      room_id     : createdIds.room,
      showDateTime: show1StartTime,
      duration    : 120,
      base_price  : 85_000,
    });
    createdIds.shows.push(show1._id);
    pass(`Show 1 tạo OK: ${show1.showDateTime.toLocaleTimeString('vi-VN')} → ${show1.endDateTime.toLocaleTimeString('vi-VN')}`);

    // Kiểm tra endDateTime được tính đúng
    const expectedEnd = new Date(show1StartTime.getTime() + 120 * 60_000);
    if (show1.endDateTime.getTime() === expectedEnd.getTime()) {
      pass(`endDateTime = showDateTime + 120 phút ✓ (${show1.endDateTime.toISOString()})`);
    } else {
      fail('endDateTime không khớp với showDateTime + duration');
    }

    // Suất chiếu 2: 20:00 → chồng lấp với show 1 (19:00–21:00)
    const show2StartTime = new Date(baseTime);
    show2StartTime.setHours(20, 0, 0, 0);

    log(`Đang thử tạo Show 2 trùng lịch (20:00, cùng phòng)...`);
    try {
      const show2 = await Show.create({
        movie       : createdIds.movie,
        cinema      : createdIds.theater,
        room_id     : createdIds.room,
        showDateTime: show2StartTime,
        duration    : 90,
        base_price  : 85_000,
      });
      // Nếu tạo thành công → hook KHÔNG chặn được → fail
      createdIds.shows.push(show2._id);
      fail('Show trùng lịch được tạo thành công (hook không hoạt động!)');
    } catch (overlapErr) {
      if (overlapErr.message.includes('Trùng lịch chiếu')) {
        pass(`Hook pre-save chặn thành công! Lỗi: "${overlapErr.message.substring(0, 70)}..."`);
      } else {
        fail('Lỗi không đúng loại (không phải "Trùng lịch chiếu")', overlapErr);
      }
    }

  } catch (err) {
    fail('Test 2 thất bại với lỗi không mong đợi', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3: Booking → Voucher, payment_status, transaction_id, check-in
// ─────────────────────────────────────────────────────────────────────────────
async function test3_booking() {
  sep('TEST 3 — Booking: Voucher, Payment Gateway & Check-in fields');

  if (createdIds.shows.length === 0) {
    fail('Không có Show để test Booking (Test 2 có thể đã thất bại toàn bộ)');
    return;
  }

  try {
    const bookingCode = await generateUniqueBookingCode();

    const booking = await Booking.create({
      user         : createdIds.user,
      show         : createdIds.shows[0],
      booking_code : bookingCode,
      tickets: [
        { seat_id: 'A1', seat_type: 'regular', price: 85_000 },
        { seat_id: 'B2', seat_type: 'vip',     price: 127_500 },
      ],
      total_amount  : 170_000,
      voucher       : createdIds.voucher,
      discount_amount: 34_000,        // 20% của 170_000
      payment_method: 'VNPAY',
      payment_status: 'paid',
      transaction_id: 'VNPAY_TXN_TEST_12345',
      checked_in    : false,
    });
    createdIds.booking = booking._id;
    pass(`Booking tạo OK | code: ${booking.booking_code}`);

    // Xác nhận populate voucher
    const populated = await Booking.findById(booking._id).populate('voucher');
    if (populated.voucher && populated.voucher.code) {
      pass(`populate('voucher') OK → code: "${populated.voucher.code}"`);
    } else {
      fail('populate voucher không trả về document đúng');
    }

    // Xác nhận các trường mới
    const fields = [
      { name: 'discount_amount', val: booking.discount_amount, expected: 34_000 },
      { name: 'payment_status',  val: booking.payment_status,  expected: 'paid' },
      { name: 'transaction_id',  val: booking.transaction_id,  expected: 'VNPAY_TXN_TEST_12345' },
      { name: 'checked_in',      val: booking.checked_in,      expected: false },
    ];
    for (const f of fields) {
      if (f.val === f.expected) {
        pass(`Trường "${f.name}" = ${JSON.stringify(f.val)} ✓`);
      } else {
        fail(`Trường "${f.name}" = ${JSON.stringify(f.val)}, expected ${JSON.stringify(f.expected)}`);
      }
    }

    // Mô phỏng check-in
    booking.checked_in    = true;
    booking.checked_in_at = new Date();
    booking.checked_in_by = createdIds.user; // nhân viên soát vé
    await booking.save();
    pass(`Cập nhật check-in OK → checked_in_at: ${booking.checked_in_at.toISOString()}`);

    // Xác nhận seat_ids snapshot được sinh tự động
    if (booking.seat_ids.length === 2 && booking.seat_ids.includes('A1')) {
      pass(`seat_ids snapshot OK → ${JSON.stringify(booking.seat_ids)}`);
    } else {
      fail(`seat_ids không khớp: ${JSON.stringify(booking.seat_ids)}`);
    }

  } catch (err) {
    fail('Test 3 thất bại với lỗi không mong đợi', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEARDOWN: Xóa toàn bộ dữ liệu test
// ─────────────────────────────────────────────────────────────────────────────
async function teardown() {
  console.log('\n🧹 Đang dọn dẹp dữ liệu test...');
  try {
    if (createdIds.booking) await Booking.deleteOne({ _id: createdIds.booking });
    if (createdIds.shows.length) await Show.deleteMany({ _id: { $in: createdIds.shows } });
    if (createdIds.voucher) await Voucher.deleteOne({ _id: createdIds.voucher });
    if (createdIds.room)    await Room.deleteOne({ _id: createdIds.room });
    if (createdIds.movie)   await Movie.deleteOne({ _id: createdIds.movie });
    if (createdIds.user)    await User.deleteOne({ _id: createdIds.user });
    if (createdIds.theater) await Theater.deleteOne({ _id: createdIds.theater });
    console.log('✅ Dọn dẹp hoàn tất. Không có dữ liệu rác nào còn lại.\n');
  } catch (err) {
    console.error('⚠️  Lỗi khi dọn dẹp:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║      🎬 Schema Upgrade Verification — TCineBook          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ Không tìm thấy MONGODB_URI trong .env. Dừng script.');
    process.exit(1);
  }

  console.log(`\n🔌 Đang kết nối MongoDB...`);
  await mongoose.connect(uri);
  console.log('✅ Kết nối MongoDB thành công!\n');

  try {
    await setup();
    await test1_voucher();
    await test2_showOverlap();
    await test3_booking();
  } finally {
    await teardown();
    await mongoose.disconnect();
    console.log('🔌 Đã ngắt kết nối MongoDB.');
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║              ✅ Script kiểm thử kết thúc                 ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
  }
}

main().catch((err) => {
  console.error('\n💥 Lỗi nghiêm trọng khi chạy script:', err);
  process.exit(1);
});
