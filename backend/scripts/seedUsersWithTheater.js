/**
 * Script: seedUsersWithTheater.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Mục đích:
 *   1. Gán theater_id = null cho tất cả user có role 'user' (migration).
 *   2. Gán theater đầu tiên trong DB cho admin trthanh005@gmail.com (nếu chưa có).
 *   3. Tạo thêm 1 tài khoản admin mẫu cho MỖI theater còn lại chưa có admin.
 *
 * KHÔNG xoá data cũ (movies, bookings, shows…).
 *
 * Chạy:
 *   node scripts/seedUsersWithTheater.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose from 'mongoose';
import dotenv   from 'dotenv';
import User     from '../models/User.js';
import Theater  from '../models/Theater.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/movie-booking';

// ─── Dữ liệu admin mẫu (mật khẩu plain, sẽ bị hash tự động qua pre-save hook) ─
// Tên + email được generate theo tên rạp. Script sẽ bỏ qua rạp đã có admin.
const buildAdminForTheater = (theater) => ({
  name:     `Admin ${theater.name}`,
  email:    `admin.${slugify(theater.name)}@cinema.vn`,
  password: 'Admin@123',
  phone:    '0900000000',
  role:     'admin',
  theater_id: theater._id,
});

/** Tạo slug đơn giản từ tên rạp để làm email */
function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // bỏ dấu
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '.')      // ký tự đặc biệt → dấu chấm
    .replace(/^\.+|\.+$/g, '');       // trim dấu chấm đầu/cuối
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
const run = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB:', MONGO_URI);

    // ── 1. Đặt theater_id = null cho tất cả user thường ──────────────────────
    const userResult = await User.updateMany(
      { role: 'user' },
      { $set: { theater_id: null } }
    );
    console.log(`\n👤 [1] Set theater_id=null cho ${userResult.modifiedCount} tài khoản role=user`);

    // ── 2. Lấy tất cả theaters ───────────────────────────────────────────────
    const theaters = await Theater.find({});
    if (theaters.length === 0) {
      console.log('\n⚠️  Không tìm thấy rạp nào trong DB. Seed theaters trước.');
      process.exit(0);
    }
    console.log(`\n🏢 [2] Tìm thấy ${theaters.length} rạp trong DB:`);
    theaters.forEach((t, i) => console.log(`   ${i + 1}. ${t.name} (${t.location}) — _id: ${t._id}`));

    // ── 3. Lấy tài khoản admin hiện tại ──────────────────────────────────────
    const existingAdmins = await User.find({ role: 'admin' });
    console.log(`\n👑 [3] Admin hiện tại: ${existingAdmins.length} tài khoản`);
    existingAdmins.forEach((a) =>
      console.log(`   • ${a.email} — theater_id: ${a.theater_id || 'chưa gán'}`)
    );

    // ── 4. Gán theater đầu tiên cho admin trthanh005 nếu chưa có ─────────────
    const mainAdmin = existingAdmins.find((a) => a.email === 'trthanh005@gmail.com');
    if (mainAdmin && !mainAdmin.theater_id) {
      mainAdmin.theater_id = theaters[0]._id;
      await mainAdmin.save();
      console.log(`\n✔️  [4] Gán "${theaters[0].name}" cho ${mainAdmin.email}`);
    } else if (mainAdmin?.theater_id) {
      console.log(`\nℹ️  [4] ${mainAdmin.email} đã được gán rạp: ${mainAdmin.theater_id}`);
    }

    // ── 5. Tìm các theater chưa có admin và tạo mới ──────────────────────────
    // Lấy danh sách theater_id đã được gán
    const assignedTheaterIds = new Set(
      existingAdmins
        .filter((a) => a.theater_id)
        .map((a) => a.theater_id.toString())
    );

    const unassignedTheaters = theaters.filter(
      (t) => !assignedTheaterIds.has(t._id.toString())
    );

    console.log(`\n🔧 [5] Tạo admin mẫu cho ${unassignedTheaters.length} rạp chưa có admin:`);

    let created = 0;
    for (const theater of unassignedTheaters) {
      const adminData = buildAdminForTheater(theater);

      // Bỏ qua nếu email đã tồn tại
      const emailExists = await User.findOne({ email: adminData.email });
      if (emailExists) {
        // Gán theater_id nếu chưa có
        if (!emailExists.theater_id) {
          emailExists.theater_id = theater._id;
          await emailExists.save();
          console.log(`   🔗 Đã gán "${theater.name}" cho admin hiện có: ${adminData.email}`);
        } else {
          console.log(`   ⏭️  Bỏ qua "${theater.name}" — admin ${adminData.email} đã tồn tại & đã gán rạp`);
        }
        continue;
      }

      const newAdmin = new User(adminData);
      await newAdmin.save();
      created++;
      console.log(`   ✔ Tạo admin: ${adminData.email}  →  "${theater.name}"`);
    }

    // ── 6. Tóm tắt kết quả ───────────────────────────────────────────────────
    console.log('\n─────────────────────────────────────────────────────');
    console.log('📊 KẾT QUẢ SEED:');

    const allAdmins = await User.find({ role: 'admin' }).populate('theater_id', 'name location');
    allAdmins.forEach((a) => {
      const theaterName = a.theater_id?.name || '❌ Chưa gán';
      console.log(`   👑 ${a.email.padEnd(40)} → ${theaterName}`);
    });

    const allUsers  = await User.countDocuments({ role: 'user' });
    console.log(`\n   👤 Tổng user thường (theater_id=null): ${allUsers}`);
    console.log(`   👑 Tổng admin: ${allAdmins.length}`);
    console.log(`   🆕 Admin mới tạo trong lần chạy này: ${created}`);
    console.log('─────────────────────────────────────────────────────');
    console.log('\n✅ Seed hoàn tất!\n');

    // In tài khoản đăng nhập mẫu
    console.log('💡 TÀI KHOẢN ĐĂNG NHẬP MẪU:');
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│  Email                                  │ Password  │ Role  │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    allAdmins.forEach((a) => {
      const email = a.email.padEnd(39);
      const isMain = a.email === 'trthanh005@gmail.com';
      console.log(`│  ${email} │ ${isMain ? '(cũ)     ' : 'Admin@123'} │ admin │`);
    });
    console.log('└─────────────────────────────────────────────────────────────┘');

  } catch (err) {
    console.error('❌ Lỗi:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

run();
