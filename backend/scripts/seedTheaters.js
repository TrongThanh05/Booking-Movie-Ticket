/**
 * scripts/seedTheaters.js
 *
 * Thêm 12 rạp chiếu phim mới dựa trên tên file ảnh trong:
 *   frontend/client/src/assets/images/theaters/
 *
 * Script KHÔNG xóa rạp cũ — bỏ qua nếu tên đã tồn tại (idempotent).
 * Sau khi seed rạp, tự động seed Rooms cho từng rạp mới.
 *
 * Run: node scripts/seedTheaters.js
 */

import mongoose from 'mongoose';
import dotenv   from 'dotenv';
import Theater  from '../models/Theater.js';
import Room     from '../models/Room.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/movie-booking';

// ══════════════════════════════════════════════════════════════════════════════
// THEATER DATA — khớp với tên file ảnh trong /theaters/
// ══════════════════════════════════════════════════════════════════════════════
const theatersData = [
  // ── Hà Nội ────────────────────────────────────────────────────────────────
  {
    name:      'Beta Cinema Thanh Xuân',
    location:  'Hà Nội',
    address:   'Tầng 5, TTTM HomeCity, 177 Trung Kính, Thanh Xuân, Hà Nội',
    phone:     '024 7301 5555',
    email:     'beta.thanhxuan@betacinemas.vn',
    image:     'beta-thanh-xuan.jpg',
    amenities: ['2D', '3D', 'Dolby Surround', 'Snack Bar', 'Parking'],
  },
  {
    name:      'BHD Star Phạm Ngọc Thạch',
    location:  'Hà Nội',
    address:   'Tầng B1, 60 Phạm Ngọc Thạch, Đống Đa, Hà Nội',
    phone:     '024 7308 7878',
    email:     'bhd.pnt@bhdstar.vn',
    image:     'bhd-pham-ngoc-thach.jpg',
    amenities: ['2D', '3D', 'Dolby Atmos', 'Premium Seats', 'Snack Bar'],
  },
  {
    name:      'BHD Star Cineplex Vincom Trần Duy Hưng',
    location:  'Hà Nội',
    address:   'Tầng 4, TTTM Vincom Mega Mall, 7A Trần Duy Hưng, Cầu Giấy, Hà Nội',
    phone:     '024 7308 7878',
    email:     'bhd.vincom@bhdstar.vn',
    image:     'bhd-star-cineplex.jpg',
    amenities: ['IMAX', '3D', 'Dolby Atmos', 'VIP Lounge', 'Snack Bar', 'Parking', 'Game Zone'],
  },

  // ── Đà Nẵng ───────────────────────────────────────────────────────────────
  {
    name:      'CGV Vincom Đà Nẵng',
    location:  'Đà Nẵng',
    address:   'Tầng 5, TTTM Vincom Plaza, 910A Ngô Quyền, Sơn Trà, Đà Nẵng',
    phone:     '0236 3812 345',
    email:     'cgv.danang@cgv.vn',
    image:     'cgv-vincom-da-nang.jpg',
    amenities: ['IMAX', '3D', 'Dolby Atmos', 'Snack Bar', 'Parking'],
  },

  // ── Vinh (Nghệ An) ────────────────────────────────────────────────────────
  {
    name:      'CGV Vinh Center',
    location:  'Nghệ An',
    address:   'Tầng 4, TTTM Vinh Center, 18 Nguyễn Văn Cừ, TP. Vinh, Nghệ An',
    phone:     '0238 3812 888',
    email:     'cgv.vinh@cgv.vn',
    image:     'cgv-vinh-center.jpg',
    amenities: ['2D', '3D', 'Snack Bar', 'Parking'],
  },
  {
    name:      'Galaxy Cinema Vinh',
    location:  'Nghệ An',
    address:   'Tầng 3, TTTM Lam Sơn Square, 32 Đại Lộ Lê Nin, TP. Vinh, Nghệ An',
    phone:     '0238 7300 888',
    email:     'galaxy.vinh@galaxycine.vn',
    image:     'galaxy-vinh.jpg',
    amenities: ['2D', '3D', 'Dolby Surround', 'Snack Bar'],
  },
  {
    name:      'Lotte Cinema Vinh',
    location:  'Nghệ An',
    address:   'Tầng 6, TTTM Lotte Mart, 36 Đinh Công Tráng, TP. Vinh, Nghệ An',
    phone:     '0238 3512 999',
    email:     'lotte.vinh@lotte.vn',
    image:     'lotte-cinema-vinh.png',
    amenities: ['4DX', '3D', 'Dolby Atmos', 'Premium Lounge', 'Snack Bar', 'Parking'],
  },

  // ── TP. Hồ Chí Minh ───────────────────────────────────────────────────────
  {
    name:      'CGV VivoCity',
    location:  'TP. Hồ Chí Minh',
    address:   'Tầng 5, TTTM SC VivoCity, 1058 Nguyễn Văn Linh, Quận 7, TP.HCM',
    phone:     '028 3812 9999',
    email:     'cgv.vivocity@cgv.vn',
    image:     'cgv-vivocity.jpg',
    amenities: ['IMAX', '4DX', 'ScreenX', 'Dolby Atmos', 'Premium Lounge', 'Snack Bar', 'Parking'],
  },
  {
    name:      'Cinestar Quốc Thanh',
    location:  'TP. Hồ Chí Minh',
    address:   '271 Nguyễn Trãi, Phường Nguyễn Cư Trinh, Quận 1, TP.HCM',
    phone:     '028 3920 3721',
    email:     'cinestar.quocthanh@cinestar.com.vn',
    image:     'cinestar-quoc-thanh.jpg',
    amenities: ['2D', '3D', 'Dolby Surround', 'Snack Bar'],
  },
  {
    name:      'Galaxy Cinema Nguyễn Du',
    location:  'TP. Hồ Chí Minh',
    address:   '116 Nguyễn Du, Quận 1, TP.HCM',
    phone:     '028 7300 8881',
    email:     'galaxy.nguyendu@galaxycine.vn',
    image:     'galaxy-nguyen-du.jpg',
    amenities: ['2D', '3D', 'Dolby Atmos', 'Snack Bar', 'Parking'],
  },
  {
    name:      'Galaxy Cinema Quang Trung',
    location:  'TP. Hồ Chí Minh',
    address:   '392 Quang Trung, Phường 10, Gò Vấp, TP.HCM',
    phone:     '028 7300 8882',
    email:     'galaxy.quangtrung@galaxycine.vn',
    image:     'galaxy-quang-trung.jpg',
    amenities: ['2D', '3D', 'Snack Bar', 'Parking'],
  },
  {
    name:      'Lotte Cinema Nam Sài Gòn',
    location:  'TP. Hồ Chí Minh',
    address:   'Tầng 5, TTTM Lotte Mart Nam Sài Gòn, 469 Nguyễn Hữu Thọ, Quận 7, TP.HCM',
    phone:     '028 3512 4444',
    email:     'lotte.namsaigon@lotte.vn',
    image:     'lotte-cinema-nam-sai-gon.jpg',
    amenities: ['4DX', '3D', 'Dolby Atmos', 'Premium Lounge', 'Snack Bar', 'Parking', 'Food Court'],
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// ROOM LAYOUT BUILDERS
// ══════════════════════════════════════════════════════════════════════════════
const layout2DStandard = () => ({
  rows: 10, columns: 14,
  row_configs: [
    { row: 'A', type: 'regular', price_multiplier: 1.0 },
    { row: 'B', type: 'regular', price_multiplier: 1.0 },
    { row: 'C', type: 'regular', price_multiplier: 1.0 },
    { row: 'D', type: 'regular', price_multiplier: 1.0 },
    { row: 'E', type: 'regular', price_multiplier: 1.0 },
    { row: 'F', type: 'vip',     price_multiplier: 1.5 },
    { row: 'G', type: 'vip',     price_multiplier: 1.5 },
    { row: 'H', type: 'vip',     price_multiplier: 1.5 },
    { row: 'I', type: 'couple',  price_multiplier: 2.0 },
    { row: 'J', type: 'couple',  price_multiplier: 2.0 },
  ],
});

const layout2DSmall = () => ({
  rows: 8, columns: 10,
  row_configs: [
    { row: 'A', type: 'regular', price_multiplier: 1.0 },
    { row: 'B', type: 'regular', price_multiplier: 1.0 },
    { row: 'C', type: 'regular', price_multiplier: 1.0 },
    { row: 'D', type: 'regular', price_multiplier: 1.0 },
    { row: 'E', type: 'vip',     price_multiplier: 1.5 },
    { row: 'F', type: 'vip',     price_multiplier: 1.5 },
    { row: 'G', type: 'couple',  price_multiplier: 2.0 },
    { row: 'H', type: 'couple',  price_multiplier: 2.0 },
  ],
});

const layout3D = () => ({
  rows: 10, columns: 12,
  row_configs: [
    { row: 'A', type: 'regular', price_multiplier: 1.0 },
    { row: 'B', type: 'regular', price_multiplier: 1.0 },
    { row: 'C', type: 'regular', price_multiplier: 1.0 },
    { row: 'D', type: 'regular', price_multiplier: 1.0 },
    { row: 'E', type: 'regular', price_multiplier: 1.0 },
    { row: 'F', type: 'vip',     price_multiplier: 1.5 },
    { row: 'G', type: 'vip',     price_multiplier: 1.5 },
    { row: 'H', type: 'vip',     price_multiplier: 1.5 },
    { row: 'I', type: 'couple',  price_multiplier: 2.0 },
    { row: 'J', type: 'couple',  price_multiplier: 2.0 },
  ],
});

const layoutIMAX = () => ({
  rows: 12, columns: 18,
  row_configs: [
    { row: 'A', type: 'regular', price_multiplier: 1.0 },
    { row: 'B', type: 'regular', price_multiplier: 1.0 },
    { row: 'C', type: 'regular', price_multiplier: 1.0 },
    { row: 'D', type: 'regular', price_multiplier: 1.0 },
    { row: 'E', type: 'regular', price_multiplier: 1.0 },
    { row: 'F', type: 'vip',     price_multiplier: 1.5 },
    { row: 'G', type: 'vip',     price_multiplier: 1.5 },
    { row: 'H', type: 'vip',     price_multiplier: 1.5 },
    { row: 'I', type: 'vip',     price_multiplier: 1.5 },
    { row: 'J', type: 'couple',  price_multiplier: 2.0 },
    { row: 'K', type: 'couple',  price_multiplier: 2.0 },
    { row: 'L', type: 'couple',  price_multiplier: 2.0 },
  ],
});

const layout4DX = () => ({
  rows: 6, columns: 8,
  row_configs: [
    { row: 'A', type: 'regular', price_multiplier: 1.2 },
    { row: 'B', type: 'regular', price_multiplier: 1.2 },
    { row: 'C', type: 'vip',     price_multiplier: 1.8 },
    { row: 'D', type: 'vip',     price_multiplier: 1.8 },
    { row: 'E', type: 'vip',     price_multiplier: 1.8 },
    { row: 'F', type: 'couple',  price_multiplier: 2.5 },
  ],
});

const layoutPremium = () => ({
  rows: 6, columns: 10,
  row_configs: [
    { row: 'A', type: 'vip',    price_multiplier: 1.8 },
    { row: 'B', type: 'vip',    price_multiplier: 1.8 },
    { row: 'C', type: 'vip',    price_multiplier: 2.0 },
    { row: 'D', type: 'vip',    price_multiplier: 2.0 },
    { row: 'E', type: 'couple', price_multiplier: 2.5 },
    { row: 'F', type: 'couple', price_multiplier: 2.5 },
  ],
});

/**
 * Xây dựng danh sách phòng dựa vào amenities của rạp.
 */
const buildRooms = (theater) => {
  const amenities = theater.amenities || [];
  const has = (kw) => amenities.some(a => a.toLowerCase().includes(kw.toLowerCase()));

  const rooms = [];

  if (has('IMAX')) {
    rooms.push({ name: 'Phòng IMAX',         screen_type: 'IMAX', layout: layoutIMAX() });
  }
  if (has('4DX')) {
    rooms.push({ name: 'Phòng 4DX',          screen_type: '4DX',  layout: layout4DX() });
  }
  if (has('ScreenX')) {
    rooms.push({ name: 'Phòng ScreenX',      screen_type: '3D',   layout: layout3D() });
  }
  if (has('Premium') || has('VIP Lounge') || has('Premium Lounge')) {
    rooms.push({ name: 'Phòng Premium',      screen_type: '2D',   layout: layoutPremium() });
  }
  if (has('3D') || has('Dolby')) {
    rooms.push({ name: 'Phòng 3D Deluxe',    screen_type: '3D',   layout: layout3D() });
  }

  // Phòng 2D tiêu chuẩn: luôn có ít nhất 2 phòng Standard
  const stdCount = Math.max(2, 5 - rooms.length);
  for (let i = 1; i <= stdCount; i++) {
    rooms.push({
      name:        `Phòng Standard ${i}`,
      screen_type: '2D',
      layout:      i > 2 ? layout2DSmall() : layout2DStandard(),
    });
  }

  return rooms;
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════
const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  let theaterAdded = 0;
  let theaterSkipped = 0;
  let roomsAdded = 0;

  for (const data of theatersData) {
    // Kiểm tra tên tồn tại chưa
    const exists = await Theater.findOne({ name: data.name });
    if (exists) {
      console.log(`  ⚠ Bỏ qua (đã tồn tại): "${data.name}"`);
      theaterSkipped++;
      continue;
    }

    // Tạo Theater
    const theater = await Theater.create(data);
    console.log(`\n  ✔ Rạp: "${theater.name}" (${theater.location})`);
    console.log(`      image: ${theater.image}`);
    theaterAdded++;

    // Tạo Rooms cho rạp vừa tạo
    const roomDefs = buildRooms(theater);
    for (const rd of roomDefs) {
      const room = await Room.create({
        theater_id:  theater._id,
        name:        rd.name,
        screen_type: rd.screen_type,
        layout:      rd.layout,
        status:      'active',
      });
      console.log(`      → ${room.name} (${room.screen_type}) | ${room.capacity} ghế`);
      roomsAdded++;
    }

    // Cập nhật totalRooms
    await Theater.findByIdAndUpdate(theater._id, { totalRooms: roomDefs.length });
  }

  // ── SUMMARY ────────────────────────────────────────────────────────────────
  console.log('\n🎉 ══════════════════════════════════════════════');
  console.log('   SEED THEATERS & ROOMS HOÀN THÀNH!');
  console.log('══════════════════════════════════════════════════');
  console.log(`  🏢 Rạp thêm mới:  ${theaterAdded}`);
  console.log(`  ⚠  Rạp bỏ qua:   ${theaterSkipped}`);
  console.log(`  🚪 Phòng thêm mới: ${roomsAdded}`);
  console.log(`  📊 Tổng rạp:      ${await Theater.countDocuments()}`);
  console.log(`  📊 Tổng phòng:    ${await Room.countDocuments()}`);
  console.log('══════════════════════════════════════════════════\n');

  await mongoose.disconnect();
  console.log('🔌 Disconnected.');
};

run().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
