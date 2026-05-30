/**
 * cronSeedShows.js — Tự động tạo lịch chiếu hàng ngày + dọn dẹp lịch cũ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Chức năng:
 *  1. XÓA lịch chiếu cũ:
 *     - Xóa shows có showDateTime < đầu ngày hôm nay
 *     - Giữ lại shows có booking liên kết (chỉ đánh dấu is_active = false)
 *     - Tránh tràn collection, tiết kiệm bộ nhớ MongoDB
 *
 *  2. TẠO lịch chiếu mới:
 *     - Tạo lịch cho các ngày chưa có (ngày hôm nay + N ngày tới)
 *     - Ưu tiên phim có release_date gần nhất (phim mới > phim cũ)
 *     - Khung giờ 08:00 – 23:30, buffer 20 phút giữa các suất
 *     - Giá vé theo khung giờ (sáng/tối) + format phòng
 *
 * Tích hợp: Được gọi trong server.js qua startCronSeedShows()
 * Chạy thủ công: node scripts/cronSeedShows.js
 * ═══════════════════════════════════════════════════════════════════════════
 */

import mongoose from 'mongoose';
import Movie   from '../models/Movie.js';
import Theater from '../models/Theater.js';
import Room    from '../models/Room.js';
import Show    from '../models/Show.js';
import Booking from '../models/Booking.js';

// ══════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════

const SEED_DAYS        = 7;       // số ngày tương lai cần có lịch chiếu
const OPEN_HOUR        = 8;       // giờ mở rạp
const CLOSE_HOUR       = 23;      // giờ đóng rạp
const CLOSE_MIN        = 30;      // phút đóng rạp (23:30)
const BUFFER_MINUTES   = 20;      // khoảng nghỉ giữa 2 suất (phút)
const HOT_MOVIE_RATIO  = 0.30;    // top 30% phim mới = "Hot"
const HOT_PICK_PROB    = 0.75;    // 75% xác suất chọn phim Hot

// Giá vé theo khung giờ & format
const PRICE_CONFIG = {
  dayMin: 70_000, dayMax: 90_000,    // trước 18:00
  eveMin: 90_000, eveMax: 120_000,   // từ 18:00 trở đi
  IMAX_bonus: 30_000,
  '4DX_bonus': 40_000,
  '3D_bonus':  10_000,
};

// Xác suất format khi phòng là 2D/Standard
const FORMAT_PROB = [
  { format: '2D',   weight: 80 },
  { format: '3D',   weight: 15 },
  { format: 'IMAX', weight:  5 },
];

const LANG_PROB = [
  { lang: 'Phụ đề Việt',  weight: 70 },
  { lang: 'Lồng tiếng',   weight: 30 },
];

// ══════════════════════════════════════════════════════════════
// UTILITIES (giữ nguyên logic từ seedShows.js gốc)
// ══════════════════════════════════════════════════════════════

const randInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const weightedPick = (items) => {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
};

const roundUpTo15 = (date) => {
  const d = new Date(date);
  const minutes = d.getMinutes();
  const rem = minutes % 15;
  if (rem === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0) return d;
  d.setMinutes(minutes + (15 - rem), 0, 0);
  return d;
};

const addMinutes = (date, minutes) =>
  new Date(date.getTime() + minutes * 60_000);

const makeDateTime = (baseDate, hour, minute) => {
  const d = new Date(baseDate);
  d.setHours(hour, minute, 0, 0);
  return d;
};

const showEndTime = (startTime, runtimeMin) =>
  addMinutes(startTime, runtimeMin + BUFFER_MINUTES);

const calcBasePrice = (showStart, screenType) => {
  const hour = showStart.getHours();
  const isEvening = hour >= 18;
  let price = isEvening
    ? randInt(PRICE_CONFIG.eveMin, PRICE_CONFIG.eveMax)
    : randInt(PRICE_CONFIG.dayMin, PRICE_CONFIG.dayMax);

  if (screenType === 'IMAX') price += PRICE_CONFIG.IMAX_bonus;
  if (screenType === '4DX')  price += PRICE_CONFIG['4DX_bonus'];
  if (screenType === '3D')   price += PRICE_CONFIG['3D_bonus'];

  return Math.round(price / 5_000) * 5_000;
};

const pickFormat = (screenType) => {
  if (screenType === 'IMAX') return 'IMAX';
  if (screenType === '4DX')  return '4DX';
  if (screenType === '3D')   return Math.random() < 0.9 ? '3D' : '2D';
  return weightedPick(FORMAT_PROB).format;
};

const pickLanguage = () => weightedPick(LANG_PROB).lang;

// ══════════════════════════════════════════════════════════════
// MOVIE SELECTION — ưu tiên release_date gần nhất
// ══════════════════════════════════════════════════════════════

const pickMovie = (hotMovies, oldMovies) => {
  const pickHot = Math.random() < HOT_PICK_PROB;
  if (pickHot && hotMovies.length > 0) {
    return hotMovies[randInt(0, hotMovies.length - 1)];
  }
  if (oldMovies.length > 0) {
    return oldMovies[randInt(0, oldMovies.length - 1)];
  }
  return hotMovies[randInt(0, hotMovies.length - 1)];
};

// ══════════════════════════════════════════════════════════════
// SCHEDULER: xếp lịch 1 ngày cho 1 phòng
// ══════════════════════════════════════════════════════════════

const scheduleRoom = (theater, room, dayDate, hotMovies, oldMovies) => {
  const shows = [];
  const closeTime = makeDateTime(dayDate, CLOSE_HOUR, CLOSE_MIN);
  let nextAvailable = roundUpTo15(makeDateTime(dayDate, OPEN_HOUR, 0));

  while (true) {
    const movie = pickMovie(hotMovies, oldMovies);
    const runtime = movie.runtime || 90;

    const endEstimate = showEndTime(nextAvailable, runtime);
    if (endEstimate > closeTime) break;

    const format    = pickFormat(room.screen_type);
    const language  = pickLanguage();
    const basePrice = calcBasePrice(nextAvailable, room.screen_type);

    shows.push({
      movie:        movie._id,
      cinema:       theater._id,
      room_id:      room._id,
      showDateTime: new Date(nextAvailable),
      duration:     runtime,
      base_price:   basePrice,
      format,
      language,
      is_active:    true,
      reserved_seats: [],
    });

    const rawNext = showEndTime(nextAvailable, runtime);
    nextAvailable = roundUpTo15(rawNext);
  }

  return shows;
};

// ══════════════════════════════════════════════════════════════
// PHASE 1: DỌN DẸP LỊCH CHIẾU CŨ
// ══════════════════════════════════════════════════════════════

/**
 * Xóa lịch chiếu có showDateTime < đầu ngày hôm nay.
 *
 * Chiến lược an toàn:
 *  - Tìm tất cả shows cũ (quá khứ)
 *  - Kiểm tra xem show nào có booking liên kết
 *  - Shows KHÔNG có booking → xóa hoàn toàn
 *  - Shows CÓ booking → đánh dấu is_active = false (giữ để tra cứu lịch sử)
 *
 * @returns {{ deleted: number, deactivated: number }}
 */
const cleanupOldShows = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Lấy tất cả shows quá khứ
  const oldShows = await Show.find({ showDateTime: { $lt: today } })
    .select('_id')
    .lean();

  if (oldShows.length === 0) {
    return { deleted: 0, deactivated: 0 };
  }

  const oldShowIds = oldShows.map((s) => s._id);

  // Tìm shows nào có booking liên kết
  const showsWithBookings = await Booking.distinct('show', {
    show: { $in: oldShowIds },
  });

  const showsWithBookingsSet = new Set(showsWithBookings.map((id) => id.toString()));

  // Phân nhóm: có booking vs không booking
  const toDelete     = [];
  const toDeactivate = [];

  for (const showId of oldShowIds) {
    if (showsWithBookingsSet.has(showId.toString())) {
      toDeactivate.push(showId);
    } else {
      toDelete.push(showId);
    }
  }

  // Xóa shows không có booking
  let deletedCount = 0;
  if (toDelete.length > 0) {
    const result = await Show.deleteMany({ _id: { $in: toDelete } });
    deletedCount = result.deletedCount;
  }

  // Đánh dấu is_active = false cho shows có booking
  let deactivatedCount = 0;
  if (toDeactivate.length > 0) {
    const result = await Show.updateMany(
      { _id: { $in: toDeactivate }, is_active: true },
      { $set: { is_active: false } },
    );
    deactivatedCount = result.modifiedCount;
  }

  return { deleted: deletedCount, deactivated: deactivatedCount };
};

// ══════════════════════════════════════════════════════════════
// PHASE 2: TẠO LỊCH CHIẾU CHO CÁC NGÀY CHƯA CÓ
// ══════════════════════════════════════════════════════════════

/**
 * Tạo lịch chiếu cho các ngày chưa có hoặc thiếu suất.
 * Chỉ seed cho ngày nào chưa có suất chiếu (tránh duplicate).
 *
 * @returns {{ seededDays: number, totalShows: number }}
 */
const seedNewShows = async () => {
  // Fetch master data
  const [allMovies, theaters, rooms] = await Promise.all([
    Movie.find().sort({ release_date: -1 }).lean(),   // mới nhất trước (ưu tiên)
    Theater.find().lean(),
    Room.find().lean(),
  ]);

  if (!allMovies.length || !theaters.length || !rooms.length) {
    console.log('⚠️  [AutoSeed] Thiếu dữ liệu (movies/theaters/rooms), bỏ qua seed.');
    return { seededDays: 0, totalShows: 0 };
  }

  // Phân nhóm phim Hot / Old (ưu tiên release_date mới nhất)
  const hotCount  = Math.max(1, Math.ceil(allMovies.length * HOT_MOVIE_RATIO));
  const hotMovies = allMovies.slice(0, hotCount);
  const oldMovies = allMovies.slice(hotCount);

  // Map room theo theater_id
  const roomsByTheater = {};
  for (const room of rooms) {
    const tid = room.theater_id.toString();
    if (!roomsByTheater[tid]) roomsByTheater[tid] = [];
    roomsByTheater[tid].push(room);
  }

  // Tạo danh sách ngày cần seed
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDays = Array.from({ length: SEED_DAYS }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  // Kiểm tra ngày nào đã có đủ shows → bỏ qua
  const daysToSeed = [];
  for (const day of targetDays) {
    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);

    const existingCount = await Show.countDocuments({
      showDateTime: { $gte: day, $lt: nextDay },
    });

    // Chỉ seed nếu ngày chưa có hoặc có quá ít suất (< 5 suất = coi như chưa seed)
    if (existingCount < 5) {
      daysToSeed.push(day);
    }
  }

  if (daysToSeed.length === 0) {
    return { seededDays: 0, totalShows: 0 };
  }

  // Seed cho từng ngày thiếu
  let totalShows = 0;

  for (const theater of theaters) {
    const tRooms = roomsByTheater[theater._id.toString()] || [];
    if (tRooms.length === 0) continue;

    for (const room of tRooms) {
      const roomBatch = [];

      for (const day of daysToSeed) {
        const dayShows = scheduleRoom(theater, room, day, hotMovies, oldMovies);
        roomBatch.push(...dayShows);
      }

      if (roomBatch.length > 0) {
        await Show.insertMany(roomBatch, { ordered: false });
        totalShows += roomBatch.length;
      }
    }
  }

  return { seededDays: daysToSeed.length, totalShows };
};

// ══════════════════════════════════════════════════════════════
// MAIN: Chạy cả 2 phase
// ══════════════════════════════════════════════════════════════

/**
 * Chạy daily job: cleanup + seed
 * Được gọi bởi cron hoặc thủ công.
 */
export const runDailySeedJob = async () => {
  const startTime = Date.now();

  try {
    // ── Phase 1: Dọn dẹp ──────────────────────────────────────
    const cleanup = await cleanupOldShows();
    if (cleanup.deleted > 0 || cleanup.deactivated > 0) {
      console.log(
        `🧹 [AutoSeed] Dọn dẹp lịch cũ: xóa ${cleanup.deleted} suất, ` +
        `vô hiệu hóa ${cleanup.deactivated} suất (có booking)`,
      );
    }

    // ── Phase 2: Tạo lịch mới ─────────────────────────────────
    const seed = await seedNewShows();
    if (seed.totalShows > 0) {
      console.log(
        `🎬 [AutoSeed] Đã tạo ${seed.totalShows} suất chiếu mới ` +
        `cho ${seed.seededDays} ngày`,
      );
    } else if (seed.seededDays === 0) {
      // Tất cả ngày đã có lịch, không cần tạo thêm
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ [AutoSeed] Hoàn tất trong ${elapsed}s`);
  } catch (error) {
    console.error('❌ [AutoSeed] Lỗi:', error.message);
  }
};

// ══════════════════════════════════════════════════════════════
// CRON STARTER — tích hợp vào server.js
// ══════════════════════════════════════════════════════════════

/**
 * Khởi chạy auto-seed lịch chiếu.
 *
 * Cách hoạt động:
 *  - Chạy ngay lần đầu khi server khởi động
 *  - Sau đó lặp lại mỗi `intervalMs` (mặc định 24h)
 *
 * Tích hợp vào server.js:
 *   import { startCronSeedShows } from './scripts/cronSeedShows.js';
 *   connectDB().then(() => { startCronSeedShows(); });
 *
 * @param {number} intervalMs - Khoảng lặp (ms). Mặc định 24 giờ.
 */
export const startCronSeedShows = (intervalMs = 24 * 60 * 60 * 1000) => {
  const hoursInterval = Math.round(intervalMs / 3_600_000 * 10) / 10;
  console.log(
    `⏰ [AutoSeed] Khởi động tự động tạo lịch chiếu (mỗi ${hoursInterval}h)`,
  );

  // Chạy lần đầu sau 5 giây (chờ DB ổn định)
  setTimeout(() => {
    runDailySeedJob();
    // Lặp lại theo interval
    setInterval(runDailySeedJob, intervalMs);
  }, 5000);
};

// ══════════════════════════════════════════════════════════════
// CLI MODE: chạy thủ công `node scripts/cronSeedShows.js`
// ══════════════════════════════════════════════════════════════

const isDirectRun = process.argv[1]?.includes('cronSeedShows');

if (isDirectRun) {
  (async () => {
    try {
      const dotenv = await import('dotenv');
      dotenv.config();
      const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/movie-booking';

      console.log('🔌 Connecting to MongoDB...');
      await mongoose.connect(MONGO_URI);
      console.log('✅ Connected:', mongoose.connection.host, '\n');

      await runDailySeedJob();

      // Hiển thị thống kê
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      console.log('\n📊 Thống kê hiện tại:');
      const totalActive = await Show.countDocuments({ is_active: true });
      const totalInactive = await Show.countDocuments({ is_active: false });
      console.log(`   Shows active   : ${totalActive}`);
      console.log(`   Shows inactive : ${totalInactive}`);

      console.log('\n📅 Phân bổ theo ngày (7 ngày tới):');
      for (let i = 0; i < SEED_DAYS; i++) {
        const day = new Date(today);
        day.setDate(today.getDate() + i);
        const nextDay = new Date(day);
        nextDay.setDate(day.getDate() + 1);
        const count = await Show.countDocuments({
          showDateTime: { $gte: day, $lt: nextDay },
          is_active: true,
        });
        const label = day.toLocaleDateString('vi-VN', {
          weekday: 'short', day: 'numeric', month: 'numeric',
        });
        console.log(`   ${label.padEnd(20)} ${count} suất`);
      }

      await mongoose.disconnect();
      console.log('\n🏁 Done!\n');
    } catch (err) {
      console.error('❌ Lỗi:', err.message);
      process.exit(1);
    }
  })();
}

export default runDailySeedJob;
