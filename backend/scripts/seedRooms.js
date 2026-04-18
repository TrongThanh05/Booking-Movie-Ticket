/**
 * Seed rooms dựa vào dữ liệu theaters thực tế từ Atlas.
 * Logic:
 *  - Xóa toàn bộ rooms cũ
 *  - Với mỗi theater, tạo 5-10 phòng dựa vào amenities (IMAX / 4DX / 3D / Premium / Standard)
 *  - Drop & recreate index theater_id_1_name_1
 * Run: node scripts/seedRooms.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Theater from '../models/Theater.js';
import Room from '../models/Room.js';

dotenv.config();

const MONGO_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/movie-booking';

// ── Layout builders ────────────────────────────────────────────────────────

const makeLayout = (rows, cols, rowConfigs) => ({
  rows,
  columns: cols,
  row_configs: rowConfigs,
});

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Standard 2D — 10 hàng × 14 ghế */
const layout2DStandard = () =>
  makeLayout(10, 14, [
    { row: 'A', type: 'regular', price_multiplier: 1.0 },
    { row: 'B', type: 'regular', price_multiplier: 1.0 },
    { row: 'C', type: 'regular', price_multiplier: 1.0 },
    { row: 'D', type: 'regular', price_multiplier: 1.0 },
    { row: 'E', type: 'regular', price_multiplier: 1.0 },
    { row: 'F', type: 'vip', price_multiplier: 1.5 },
    { row: 'G', type: 'vip', price_multiplier: 1.5 },
    { row: 'H', type: 'vip', price_multiplier: 1.5 },
    { row: 'I', type: 'couple', price_multiplier: 2.0 },
    { row: 'J', type: 'couple', price_multiplier: 2.0 },
  ]);

/** Small 2D — 8 hàng × 10 ghế */
const layout2DSmall = () =>
  makeLayout(8, 10, [
    { row: 'A', type: 'regular', price_multiplier: 1.0 },
    { row: 'B', type: 'regular', price_multiplier: 1.0 },
    { row: 'C', type: 'regular', price_multiplier: 1.0 },
    { row: 'D', type: 'regular', price_multiplier: 1.0 },
    { row: 'E', type: 'vip', price_multiplier: 1.5 },
    { row: 'F', type: 'vip', price_multiplier: 1.5 },
    { row: 'G', type: 'couple', price_multiplier: 2.0 },
    { row: 'H', type: 'couple', price_multiplier: 2.0 },
  ]);

/** 3D — 10 hàng × 12 ghế */
const layout3D = () =>
  makeLayout(10, 12, [
    { row: 'A', type: 'regular', price_multiplier: 1.0 },
    { row: 'B', type: 'regular', price_multiplier: 1.0 },
    { row: 'C', type: 'regular', price_multiplier: 1.0 },
    { row: 'D', type: 'regular', price_multiplier: 1.0 },
    { row: 'E', type: 'regular', price_multiplier: 1.0 },
    { row: 'F', type: 'vip', price_multiplier: 1.5 },
    { row: 'G', type: 'vip', price_multiplier: 1.5 },
    { row: 'H', type: 'vip', price_multiplier: 1.5 },
    { row: 'I', type: 'couple', price_multiplier: 2.0 },
    { row: 'J', type: 'couple', price_multiplier: 2.0 },
  ]);

/** IMAX — 12 hàng × 18 ghế */
const layoutIMAX = () =>
  makeLayout(12, 18, [
    { row: 'A', type: 'regular', price_multiplier: 1.0 },
    { row: 'B', type: 'regular', price_multiplier: 1.0 },
    { row: 'C', type: 'regular', price_multiplier: 1.0 },
    { row: 'D', type: 'regular', price_multiplier: 1.0 },
    { row: 'E', type: 'regular', price_multiplier: 1.0 },
    { row: 'F', type: 'vip', price_multiplier: 1.5 },
    { row: 'G', type: 'vip', price_multiplier: 1.5 },
    { row: 'H', type: 'vip', price_multiplier: 1.5 },
    { row: 'I', type: 'vip', price_multiplier: 1.5 },
    { row: 'J', type: 'couple', price_multiplier: 2.0 },
    { row: 'K', type: 'couple', price_multiplier: 2.0 },
    { row: 'L', type: 'couple', price_multiplier: 2.0 },
  ]);

/** 4DX — 6 hàng × 8 ghế (ghế to nên ít hơn) */
const layout4DX = () =>
  makeLayout(6, 8, [
    { row: 'A', type: 'regular', price_multiplier: 1.2 },
    { row: 'B', type: 'regular', price_multiplier: 1.2 },
    { row: 'C', type: 'vip', price_multiplier: 1.8 },
    { row: 'D', type: 'vip', price_multiplier: 1.8 },
    { row: 'E', type: 'vip', price_multiplier: 1.8 },
    { row: 'F', type: 'couple', price_multiplier: 2.5 },
  ]);

/** Premium / First Class — 6 hàng × 10 ghế (toàn VIP + couple) */
const layoutPremium = () =>
  makeLayout(6, 10, [
    { row: 'A', type: 'vip', price_multiplier: 1.8 },
    { row: 'B', type: 'vip', price_multiplier: 1.8 },
    { row: 'C', type: 'vip', price_multiplier: 2.0 },
    { row: 'D', type: 'vip', price_multiplier: 2.0 },
    { row: 'E', type: 'couple', price_multiplier: 2.5 },
    { row: 'F', type: 'couple', price_multiplier: 2.5 },
  ]);

// ── Helpers ────────────────────────────────────────────────────────────────

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const hasAmenity = (amenities, keyword) =>
  amenities.some((a) => a.toLowerCase().includes(keyword.toLowerCase()));

/**
 * Xây danh sách room templates cho một theater dựa vào amenities.
 * Mỗi template: { label, screen_type, layoutFn }
 */
const buildRoomTemplates = (amenities) => {
  const templates = [];

  const hasIMAX     = hasAmenity(amenities, 'IMAX');
  const has4DX      = hasAmenity(amenities, '4DX');
  const has3D       = hasAmenity(amenities, '3D');
  const hasPremium  =
    hasAmenity(amenities, 'Premium') ||
    hasAmenity(amenities, 'First Class') ||
    hasAmenity(amenities, 'cao cấp');

  // Tổng số phòng mục tiêu: 5-10
  const targetTotal = rand(5, 10);

  // Phân bổ ưu tiên theo amenities
  if (hasIMAX) {
    templates.push({ label: 'IMAX', screen_type: 'IMAX', layoutFn: layoutIMAX });
    if (targetTotal >= 7)
      templates.push({ label: 'IMAX Premium', screen_type: 'IMAX', layoutFn: layoutIMAX });
  }
  if (has4DX) {
    templates.push({ label: '4DX', screen_type: '4DX', layoutFn: layout4DX });
    if (targetTotal >= 8)
      templates.push({ label: '4DX VIP', screen_type: '4DX', layoutFn: layout4DX });
  }
  if (has3D) {
    templates.push({ label: '3D', screen_type: '3D', layoutFn: layout3D });
    if (targetTotal >= 6)
      templates.push({ label: '3D Deluxe', screen_type: '3D', layoutFn: layout3D });
  }
  if (hasPremium) {
    templates.push({ label: 'Premium', screen_type: '2D', layoutFn: layoutPremium });
  }

  // Phòng 2D tiêu chuẩn lấp đầy để đạt targetTotal
  const stdCount = Math.max(2, targetTotal - templates.length);
  for (let i = 1; i <= stdCount; i++) {
    const isSmall = i > 3; // phòng nhỏ hơn cho số thứ tự cao
    templates.push({
      label: `Standard ${i}`,
      screen_type: '2D',
      layoutFn: isSmall ? layout2DSmall : layout2DStandard,
    });
  }

  // Cắt đúng targetTotal
  return templates.slice(0, targetTotal);
};

// ── Main seed ─────────────────────────────────────────────────────────────

const seedRooms = async () => {
  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected:', mongoose.connection.host);

    // 1. Xóa toàn bộ rooms cũ
    console.log('\n🗑️  Clearing old rooms...');
    const deleteResult = await Room.deleteMany({});
    console.log(`   ✔ Deleted ${deleteResult.deletedCount} old rooms`);

    // 2. Drop index cũ (nếu còn) và tạo lại để tránh lỗi
    const roomColl = mongoose.connection.db.collection('rooms');
    const indexes = await roomColl.indexes();
    const oldIndexNames = [
      'theater_id_1_name_1',
      'cinema_id_1_name_1',
    ];
    for (const idxName of oldIndexNames) {
      if (indexes.find((i) => i.name === idxName)) {
        await roomColl.dropIndex(idxName);
        console.log(`   ✔ Dropped index: ${idxName}`);
      }
    }

    // 3. Lấy tất cả theaters
    console.log('\n🏢 Fetching theaters...');
    const theaters = await Theater.find().lean();
    console.log(`   ✔ Found ${theaters.length} theaters`);

    // 4. Tạo rooms cho từng theater
    console.log('\n🚪 Creating rooms...');
    const roomsToInsert = [];

    for (const theater of theaters) {
      const amenities = theater.amenities || [];
      const templates = buildRoomTemplates(amenities);

      console.log(
        `   📍 ${theater.name} — amenities: [${amenities.join(', ')}]`,
      );
      console.log(
        `      → Creating ${templates.length} rooms: ${templates.map((t) => t.label).join(', ')}`,
      );

      for (const tmpl of templates) {
        roomsToInsert.push({
          theater_id: theater._id,
          name: `Phòng ${tmpl.label}`,
          screen_type: tmpl.screen_type,
          layout: tmpl.layoutFn(),
          status: 'active',
        });
      }
    }

    // 5. Insert tất cả
    const inserted = await Room.insertMany(roomsToInsert, { ordered: false });
    console.log(`\n✅ Total rooms created: ${inserted.length}`);

    // 6. Recreate unique index
    console.log('\n📌 Recreating unique index theater_id_1_name_1...');
    await roomColl.createIndex(
      { theater_id: 1, name: 1 },
      { unique: true, name: 'theater_id_1_name_1' },
    );
    console.log('   ✔ Index created.');

    // 7. Summary
    console.log('\n📊 Summary per theater:');
    for (const theater of theaters) {
      const count = await Room.countDocuments({ theater_id: theater._id });
      console.log(`   ${theater.name}: ${count} phòng`);
    }

    await mongoose.disconnect();
    console.log('\n🏁 Seed complete!\n');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    console.error(err);
    process.exit(1);
  }
};

seedRooms();
