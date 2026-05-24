/**
 * Script: promoteToSuperAdmin.js
 * Đặt theater_id = null cho tài khoản chỉ định → thăng lên Super-admin
 * Chạy: node scripts/promoteToSuperAdmin.js
 */
import mongoose from 'mongoose';
import dotenv   from 'dotenv';
import User     from '../models/User.js';

dotenv.config();

const TARGET_EMAIL = 'trthanh005@gmail.com';

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/movie-booking');
    console.log('✅ Connected to MongoDB');

    const user = await User.findOne({ email: TARGET_EMAIL });

    if (!user) {
      console.error(`❌ Không tìm thấy tài khoản: ${TARGET_EMAIL}`);
      process.exit(1);
    }

    console.log(`\n📋 Tài khoản hiện tại:`);
    console.log(`   Email     : ${user.email}`);
    console.log(`   Role      : ${user.role}`);
    console.log(`   theater_id: ${user.theater_id || 'null (đã là super-admin)'}`);

    if (!user.theater_id) {
      console.log('\nℹ️  Tài khoản này đã là super-admin (theater_id = null). Không cần thay đổi.');
      process.exit(0);
    }

    // Xóa theater_id → thăng lên super-admin
    user.theater_id = null;
    await user.save();

    console.log(`\n✅ Đã thăng cấp thành công:`);
    console.log(`   ${user.email}  →  Super-admin (theater_id = null)`);

  } catch (err) {
    console.error('❌ Lỗi:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected');
  }
};

run();
