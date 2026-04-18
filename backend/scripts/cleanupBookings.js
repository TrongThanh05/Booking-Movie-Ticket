/**
 * cleanupBookings.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Chạy 1 lần để:
 *   1. Xóa stale index `bookingCode_1` (camelCase - từ schema cũ)
 *   2. Xóa bookings có booking_code: null (records lỗi)
 *   3. Rebuild index `booking_code_1` (snake_case - schema mới)
 *
 * Usage:
 *   cd backend
 *   node scripts/cleanupBookings.js
 */
import mongoose from 'mongoose';
import dotenv   from 'dotenv';
import Booking  from '../models/Booking.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

async function cleanup() {
  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected!\n');

  const collection = mongoose.connection.db.collection('bookings');

  // ── Step 1: Liệt kê tất cả index hiện có ──────────────────────────────────
  const indexes = await collection.indexes();
  console.log('📋 Current indexes:');
  indexes.forEach((idx) => console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`));
  console.log('');

  // ── Step 2: Drop stale index bookingCode_1 (nếu tồn tại) ──────────────────
  const staleIndex = indexes.find((i) => i.name === 'bookingCode_1');
  if (staleIndex) {
    console.log('🗑️  Dropping stale index: bookingCode_1...');
    await collection.dropIndex('bookingCode_1');
    console.log('   ✅ Dropped!\n');
  } else {
    console.log('ℹ️  Index bookingCode_1 không tồn tại (đã được cleanup trước đó)\n');
  }

  // ── Step 3: Xóa bookings có booking_code null hoặc missing ────────────────
  const nullCount = await collection.countDocuments({
    $or: [
      { booking_code: null },
      { booking_code: { $exists: false } },
    ],
  });

  if (nullCount > 0) {
    console.log(`🗑️  Deleting ${nullCount} bookings with null/missing booking_code...`);
    const result = await collection.deleteMany({
      $or: [
        { booking_code: null },
        { booking_code: { $exists: false } },
      ],
    });
    console.log(`   ✅ Deleted ${result.deletedCount} records\n`);
  } else {
    console.log('ℹ️  Không có booking nào bị null booking_code\n');
  }

  // Cũng drop bookingCode khác nếu có
  const staleBookingCode = indexes.find((i) => i.name === 'booking_code_1' && i.key?.booking_code);
  // Index booking_code_1 sẽ được Mongoose tự tạo lại khi server restart

  // ── Step 4: Sync indexes (Mongoose sẽ tạo lại đúng) ───────────────────────
  console.log('🔄 Syncing Mongoose indexes...');
  await Booking.syncIndexes();
  console.log('   ✅ Indexes synced!\n');

  // ── Step 5: Xác nhận indexes mới ──────────────────────────────────────────
  const newIndexes = await collection.indexes();
  console.log('📋 Indexes after cleanup:');
  newIndexes.forEach((idx) => console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`));

  console.log('\n🎉 Cleanup complete!');
  await mongoose.disconnect();
  process.exit(0);
}

cleanup().catch((err) => {
  console.error('❌ Cleanup failed:', err);
  process.exit(1);
});
