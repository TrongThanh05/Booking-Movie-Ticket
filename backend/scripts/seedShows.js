/**
 * seedShows.js — Seed lịch chiếu phim (shows) cho 7 ngày tới
 * ─────────────────────────────────────────────────────────────
 * Business Rules được implement:
 *  1. 7 ngày từ hôm nay, khung giờ 08:00 – 23:30
 *  2. Phim Hot (top 30% mới nhất): xác suất 70–80% được chọn
 *  3. Không trùng lịch trong cùng phòng (nextAvailableTime tracker)
 *  4. Buffer 20 phút sau mỗi suất (dọn phòng / ra vào)
 *  5. Làm tròn giờ chiếu lên mốc 15 phút gần nhất
 *  6. base_price cao hơn vào khung giờ tối (sau 18:00)
 *  7. format match screen_type của phòng (IMAX/4DX rooms giữ nguyên)
 *  8. language random: Phụ đề 70% / Lồng tiếng 30%
 * ─────────────────────────────────────────────────────────────
 * Run: node scripts/seedShows.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Movie from '../models/Movie.js';
import Theater from '../models/Theater.js';
import Room from '../models/Room.js';
import Show from '../models/Show.js';

dotenv.config();

const MONGO_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/movie-booking';

// ══════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════

const SEED_DAYS        = 7;       // số ngày từ hôm nay
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
// UTILITIES
// ══════════════════════════════════════════════════════════════

/** Random integer in [min, max] */
const randInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/** Weighted random pick from array of { ..., weight } */
const weightedPick = (items) => {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
};

/**
 * Làm tròn Date lên mốc 15 phút gần nhất tính từ thời điểm đó.
 * VD: 10:03 → 10:15 | 10:16 → 10:30 | 10:31 → 10:45 | 10:48 → 11:00
 */
const roundUpTo15 = (date) => {
  const d = new Date(date);
  const minutes = d.getMinutes();
  const rem = minutes % 15;
  if (rem === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0) {
    return d; // đã đúng mốc
  }
  const add = 15 - rem;
  d.setMinutes(minutes + add, 0, 0);
  return d;
};

/** Cộng thêm `minutes` phút vào Date */
const addMinutes = (date, minutes) =>
  new Date(date.getTime() + minutes * 60_000);

/** Tạo Date cho một ngày + giờ + phút cụ thể */
const makeDateTime = (baseDate, hour, minute) => {
  const d = new Date(baseDate);
  d.setHours(hour, minute, 0, 0);
  return d;
};

/** Thời gian kết thúc một suất chiếu ({show} + buffer) */
const showEndTime = (startTime, runtimeMin) =>
  addMinutes(startTime, runtimeMin + BUFFER_MINUTES);

/**
 * Tính base_price dựa vào giờ chiếu và screen_type.
 */
const calcBasePrice = (showStart, screenType) => {
  const hour = showStart.getHours();
  const isEvening = hour >= 18;
  let price = isEvening
    ? randInt(PRICE_CONFIG.eveMin, PRICE_CONFIG.eveMax)
    : randInt(PRICE_CONFIG.dayMin, PRICE_CONFIG.dayMax);

  if (screenType === 'IMAX') price += PRICE_CONFIG.IMAX_bonus;
  if (screenType === '4DX')  price += PRICE_CONFIG['4DX_bonus'];
  if (screenType === '3D')   price += PRICE_CONFIG['3D_bonus'];

  // Làm tròn đến 5000
  return Math.round(price / 5_000) * 5_000;
};

/**
 * Quyết định format của suất chiếu dựa vào screen_type của phòng.
 *  IMAX -> 'IMAX' luôn
 *  4DX  -> '4DX' luôn
 *  3D   -> '3D' (90%) hoặc '2D' (10%)
 *  2D   -> random theo FORMAT_PROB
 */
const pickFormat = (screenType) => {
  if (screenType === 'IMAX') return 'IMAX';
  if (screenType === '4DX')  return '4DX';
  if (screenType === '3D')
    return Math.random() < 0.9 ? '3D' : '2D';
  // Standard 2D room
  return weightedPick(FORMAT_PROB).format;
};

/** Chọn ngôn ngữ ngẫu nhiên */
const pickLanguage = () => weightedPick(LANG_PROB).lang;

// ══════════════════════════════════════════════════════════════
// MOVIE SELECTION
// ══════════════════════════════════════════════════════════════

/**
 * Chọn phim theo tỷ lệ ưu tiên Hot/Cũ.
 * hotMovies: mảng phim mới (top 30%)
 * oldMovies: phần còn lại
 */
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

/**
 * Trả về mảng show objects cho một (room, date) cụ thể.
 * @param {Object} theater    - MongoDB theater document
 * @param {Object} room       - MongoDB room document
 * @param {Date}   dayDate    - Ngày chiếu (không giờ)
 * @param {Array}  hotMovies
 * @param {Array}  oldMovies
 * @returns {Array} shows[]
 */
const scheduleRoom = (theater, room, dayDate, hotMovies, oldMovies) => {
  const shows = [];
  const closeTime = makeDateTime(dayDate, CLOSE_HOUR, CLOSE_MIN);

  // nextAvailable bắt đầu từ 08:00 sáng (làm tròn lên 15 phút)
  let nextAvailable = roundUpTo15(makeDateTime(dayDate, OPEN_HOUR, 0));

  while (true) {
    // Chọn phim
    const movie = pickMovie(hotMovies, oldMovies);
    const runtime = movie.runtime || 90; // default 90 phút nếu không có

    // Kiểm tra: nếu chiếu hết movie + buffer có còn trước giờ đóng không?
    const endEstimate = showEndTime(nextAvailable, runtime);
    if (endEstimate > closeTime) break; // không đủ thời gian

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

    // Cập nhật nextAvailable: kết thúc suất hiện tại + buffer, rồi làm tròn lên 15'
    const rawNext = showEndTime(nextAvailable, runtime);
    nextAvailable = roundUpTo15(rawNext);
  }

  return shows;
};

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════

const seedShows = async () => {
  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected:', mongoose.connection.host, '\n');

    // ── 1. Xóa shows cũ ───────────────────────────────────────
    console.log('🗑️  Clearing old shows...');
    const del = await Show.deleteMany({});
    console.log(`   ✔ Deleted ${del.deletedCount} shows\n`);

    // ── 2. Fetch master data ──────────────────────────────────
    console.log('📦 Loading master data...');
    const [allMovies, theaters, rooms] = await Promise.all([
      Movie.find().sort({ release_date: -1 }).lean(),   // mới nhất trước
      Theater.find().lean(),
      Room.find().lean(),
    ]);

    if (!allMovies.length)  throw new Error('Không có phim trong DB!');
    if (!theaters.length)   throw new Error('Không có theater trong DB!');
    if (!rooms.length)      throw new Error('Không có room trong DB!');

    console.log(`   Movies  : ${allMovies.length}`);
    console.log(`   Theaters: ${theaters.length}`);
    console.log(`   Rooms   : ${rooms.length}\n`);

    // ── 3. Phân nhóm phim Hot / Cũ ───────────────────────────
    const hotCount   = Math.max(1, Math.ceil(allMovies.length * HOT_MOVIE_RATIO));
    const hotMovies  = allMovies.slice(0, hotCount);
    const oldMovies  = allMovies.slice(hotCount);

    console.log(`🎬 Movie groups:`);
    console.log(`   Hot (top ${Math.round(HOT_MOVIE_RATIO * 100)}%): ${hotMovies.length} phim`);
    console.log(`   Old (còn lại)           : ${oldMovies.length} phim`);
    console.log(`   Pick probability for Hot: ${Math.round(HOT_PICK_PROB * 100)}%\n`);

    // ── 4. Tạo map room theo theater_id ──────────────────────
    const roomsByTheater = {};
    for (const room of rooms) {
      const tid = room.theater_id.toString();
      if (!roomsByTheater[tid]) roomsByTheater[tid] = [];
      roomsByTheater[tid].push(room);
    }

    // ── 5. Tạo danh sách ngày ────────────────────────────────
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Array.from({ length: SEED_DAYS }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });

    console.log(`📅 Seeding ${SEED_DAYS} days: ${days[0].toLocaleDateString('vi-VN')} → ${days[days.length - 1].toLocaleDateString('vi-VN')}\n`);
    console.log('─'.repeat(60));

    // ── 6. Vòng lặp chính: Theater → Room → Day ──────────────
    let totalShows = 0;

    for (const theater of theaters) {
      const tRooms = roomsByTheater[theater._id.toString()] || [];
      if (tRooms.length === 0) {
        console.log(`⚠️  ${theater.name} — không có phòng chiếu, bỏ qua.`);
        continue;
      }

      console.log(`\n🏢  ${theater.name} (${theater.location}) — ${tRooms.length} phòng`);
      let theaterTotal = 0;

      for (const room of tRooms) {
        const roomBatch = [];

        for (const day of days) {
          const dayShows = scheduleRoom(theater, room, day, hotMovies, oldMovies);
          roomBatch.push(...dayShows);
        }

        if (roomBatch.length > 0) {
          await Show.insertMany(roomBatch, { ordered: false });
          theaterTotal += roomBatch.length;
          console.log(
            `   📽  ${room.name.padEnd(28)} [${room.screen_type}]  → ${roomBatch.length} suất (${Math.round(roomBatch.length / SEED_DAYS * 10) / 10}/ngày TB)`,
          );
        }
      }

      console.log(`   📊  Tổng: ${theaterTotal} suất chiếu`);
      totalShows += theaterTotal;
    }

    // ── 7. Summary ───────────────────────────────────────────
    console.log('\n' + '═'.repeat(60));
    console.log(`✅  SEED HOÀN TẤT`);
    console.log(`    Theaters  : ${theaters.length}`);
    console.log(`    Rooms     : ${rooms.length}`);
    console.log(`    Days      : ${SEED_DAYS}`);
    console.log(`    Total shows inserted: ${totalShows}`);
    console.log(`    Avg shows/room/day  : ${Math.round(totalShows / rooms.length / SEED_DAYS * 10) / 10}`);

    // Verify by date
    console.log('\n📅 Phân bổ theo ngày:');
    for (const day of days) {
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);
      const count = await Show.countDocuments({
        showDateTime: { $gte: day, $lt: nextDay },
      });
      const label = day.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' });
      console.log(`    ${label.padEnd(20)} ${count} suất`);
    }

    await mongoose.disconnect();
    console.log('\n🏁 Done!\n');
  } catch (err) {
    console.error('\n❌ Seed thất bại:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
};

seedShows();
