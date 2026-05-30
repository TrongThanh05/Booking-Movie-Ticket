/**
 * seedShows.js — Seed lịch chiếu phim (shows) cho 7 ngày tới
 * ─────────────────────────────────────────────────────────────
 * Business Rules:
 *  1. Chỉ seed phim đã ra mắt (release_date <= hôm nay, status !== 'coming_soon')
 *  2. TẤT CẢ phim hợp lệ đều được chiếu tại TẤT CẢ rạp
 *  3. Phim được phân đều cho các phòng theo round-robin (để đảm bảo
 *     mỗi phòng đều có đủ loại phim, không bị bỏ sót)
 *  4. 7 ngày từ hôm nay, khung giờ 08:00 – 23:30
 *  5. Buffer 20 phút sau mỗi suất (dọn phòng / ra vào)
 *  6. Làm tròn giờ chiếu lên mốc 15 phút gần nhất
 *  7. base_price cao hơn vào khung giờ tối (sau 18:00)
 *  8. format match screen_type của phòng (IMAX/4DX rooms giữ nguyên)
 *  9. language random: Phụ đề 70% / Lồng tiếng 30%
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

const SEED_DAYS      = 7;    // số ngày từ hôm nay
const OPEN_HOUR      = 8;    // giờ mở rạp
const CLOSE_HOUR     = 23;   // giờ đóng rạp
const CLOSE_MIN      = 30;   // phút đóng rạp (23:30)
const BUFFER_MINUTES = 20;   // khoảng nghỉ giữa 2 suất (phút)

// Giá vé theo khung giờ & format
const PRICE_CONFIG = {
  dayMin: 70_000, dayMax: 90_000,    // trước 18:00
  eveMin: 90_000, eveMax: 120_000,   // từ 18:00 trở đi
  IMAX_bonus:    30_000,
  '4DX_bonus':   40_000,
  '3D_bonus':    10_000,
};

const FORMAT_PROB = [
  { format: '2D',   weight: 80 },
  { format: '3D',   weight: 15 },
  { format: 'IMAX', weight:  5 },
];

const LANG_PROB = [
  { lang: 'Phụ đề Việt', weight: 70 },
  { lang: 'Lồng tiếng',  weight: 30 },
];

// ══════════════════════════════════════════════════════════════
// UTILITIES
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

/** Làm tròn Date lên mốc 15 phút gần nhất */
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
  const isEvening = showStart.getHours() >= 18;
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
// SCHEDULER
// ══════════════════════════════════════════════════════════════

/**
 * Xếp lịch 1 ngày cho 1 phòng với danh sách phim đã được phân công.
 * Các phim được chiếu theo thứ tự round-robin để đảm bảo tất cả đều xuất hiện.
 *
 * @param {Object} theater
 * @param {Object} room
 * @param {Date}   dayDate
 * @param {Array}  assignedMovies - Danh sách phim đã phân công cho phòng này
 * @returns {Array} shows[]
 */
const scheduleRoom = (theater, room, dayDate, assignedMovies) => {
  const shows = [];
  const closeTime = makeDateTime(dayDate, CLOSE_HOUR, CLOSE_MIN);

  let nextAvailable = roundUpTo15(makeDateTime(dayDate, OPEN_HOUR, 0));
  let movieIndex = 0; // con trỏ round-robin

  while (true) {
    // Lấy phim theo round-robin
    const movie   = assignedMovies[movieIndex % assignedMovies.length];
    const runtime = movie.runtime || 90;
    movieIndex++;

    // Kiểm tra đủ thời gian không?
    const endEstimate = showEndTime(nextAvailable, runtime);
    if (endEstimate > closeTime) break;

    shows.push({
      movie:          movie._id,
      cinema:         theater._id,
      room_id:        room._id,
      showDateTime:   new Date(nextAvailable),
      duration:       runtime,
      base_price:     calcBasePrice(nextAvailable, room.screen_type),
      format:         pickFormat(room.screen_type),
      language:       pickLanguage(),
      is_active:      true,
      reserved_seats: [],
    });

    nextAvailable = roundUpTo15(showEndTime(nextAvailable, runtime));
  }

  return shows;
};

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════

const seedShows = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected:', mongoose.connection.host, '\n');

    // ── 1. Xóa shows cũ ───────────────────────────────────────
    console.log('🗑️  Clearing old shows...');
    const del = await Show.deleteMany({});
    console.log(`   ✔ Deleted ${del.deletedCount} shows\n`);

    // ── 2. Fetch master data ──────────────────────────────────
    console.log('📦 Loading master data...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [allMovies, theaters, rooms] = await Promise.all([
      Movie.find().sort({ release_date: -1 }).lean(),
      Theater.find().lean(),
      Room.find().lean(),
    ]);

    if (!allMovies.length)  throw new Error('Không có phim trong DB!');
    if (!theaters.length)   throw new Error('Không có theater trong DB!');
    if (!rooms.length)      throw new Error('Không có room trong DB!');

    // ── 3. Lọc phim đã ra mắt (release_date <= hôm nay) ──────
    const eligibleMovies = allMovies.filter((m) => {
      if (m.status === 'coming_soon') return false;          // chưa ra mắt
      if (!m.release_date) return true;                      // không có ngày → coi như đủ điều kiện
      return new Date(m.release_date) <= today;              // phải <= hôm nay
    });

    if (!eligibleMovies.length) {
      throw new Error('Không có phim nào đủ điều kiện chiếu (release_date <= hôm nay)!');
    }

    console.log(`   Tổng phim trong DB     : ${allMovies.length}`);
    console.log(`   Phim đủ điều kiện chiếu: ${eligibleMovies.length}`);
    console.log(`   Phim sắp chiếu (bỏ qua): ${allMovies.length - eligibleMovies.length}`);
    console.log(`   Theaters               : ${theaters.length}`);
    console.log(`   Rooms                  : ${rooms.length}\n`);

    // ── 4. Map room theo theater ──────────────────────────────
    const roomsByTheater = {};
    for (const room of rooms) {
      const tid = room.theater_id.toString();
      if (!roomsByTheater[tid]) roomsByTheater[tid] = [];
      roomsByTheater[tid].push(room);
    }

    // ── 5. Tạo danh sách ngày ────────────────────────────────
    const days = Array.from({ length: SEED_DAYS }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });

    console.log(`📅 Seeding ${SEED_DAYS} ngày: ${days[0].toLocaleDateString('vi-VN')} → ${days[days.length - 1].toLocaleDateString('vi-VN')}\n`);
    console.log('─'.repeat(70));

    // ── 6. Vòng lặp: Theater → Room → Day ────────────────────
    // Mỗi rạp: tất cả phim được chia đều cho các phòng (round-robin theo index phòng)
    // Đảm bảo: mọi phim đều xuất hiện ở mọi rạp
    let totalShows = 0;

    for (const theater of theaters) {
      const tRooms = roomsByTheater[theater._id.toString()] || [];
      if (tRooms.length === 0) {
        console.log(`⚠️  ${theater.name} — không có phòng chiếu, bỏ qua.`);
        continue;
      }

      console.log(`\n🏢  ${theater.name} (${theater.location}) — ${tRooms.length} phòng, ${eligibleMovies.length} phim`);

      // Phân phim cho từng phòng theo round-robin:
      // Phòng i nhận phim tại các index: i, i+nRooms, i+2*nRooms, ...
      // → Mỗi phòng nhận 1 tập con phim, gộp lại = toàn bộ eligibleMovies
      const nRooms = tRooms.length;
      let theaterTotal = 0;

      for (let i = 0; i < nRooms; i++) {
        const room = tRooms[i];

        // Tập phim "chính" của phòng này (round-robin phân phối)
        const primaryMovies = eligibleMovies.filter((_, idx) => idx % nRooms === i);
        // Nếu ít hơn 2 phim chính → bổ sung thêm từ toàn bộ danh sách
        const assignedMovies = primaryMovies.length >= 1
          ? primaryMovies
          : eligibleMovies; // fallback: dùng tất cả

        const roomBatch = [];
        for (const day of days) {
          const dayShows = scheduleRoom(theater, room, day, assignedMovies);
          roomBatch.push(...dayShows);
        }

        if (roomBatch.length > 0) {
          await Show.insertMany(roomBatch, { ordered: false });
          theaterTotal += roomBatch.length;
          // Đếm số phim khác nhau được chiếu
          const uniqueMovieIds = new Set(roomBatch.map(s => s.movie.toString())).size;
          console.log(
            `   📽  ${room.name.padEnd(28)} [${room.screen_type}]` +
            `  → ${String(roomBatch.length).padStart(3)} suất` +
            `  (${uniqueMovieIds} phim, ${Math.round(roomBatch.length / SEED_DAYS * 10) / 10}/ngày TB)`,
          );
        }
      }

      console.log(`   📊  Tổng rạp: ${theaterTotal} suất`);
      totalShows += theaterTotal;
    }

    // ── 7. Summary ───────────────────────────────────────────
    console.log('\n' + '═'.repeat(70));
    console.log('✅  SEED HOÀN TẤT');
    console.log(`    Theaters           : ${theaters.length}`);
    console.log(`    Rooms              : ${rooms.length}`);
    console.log(`    Phim được chiếu    : ${eligibleMovies.length}`);
    console.log(`    Days               : ${SEED_DAYS}`);
    console.log(`    Total shows        : ${totalShows}`);
    console.log(`    Avg shows/room/day : ${Math.round(totalShows / rooms.length / SEED_DAYS * 10) / 10}`);

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

    console.log('\n🎬 Phim được chiếu:');
    for (const m of eligibleMovies) {
      const count = await Show.countDocuments({ movie: m._id });
      console.log(`    ${m.title.padEnd(45)} ${count} suất`);
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
