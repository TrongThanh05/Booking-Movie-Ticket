/**
 * Script: resetPasswords.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Mục đích:
 *   Reset mật khẩu về giá trị mặc định:
 *     - role = 'admin'  →  'Admin@123'
 *     - role = 'user'   →  'User@123'
 *
 *   Pre-save hook trong User model sẽ tự động hash bcrypt trước khi lưu.
 *
 * Chạy (reset TẤT CẢ tài khoản):
 *   node scripts/resetPasswords.js
 *
 * Chạy (reset 1 tài khoản cụ thể theo email):
 *   node scripts/resetPasswords.js --email user@example.com
 *
 * Chạy (chỉ xem, không lưu):
 *   node scripts/resetPasswords.js --dry-run
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose  from 'mongoose';
import dotenv    from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import User      from '../models/User.js';

// Load .env từ thư mục backend/ — hoạt động dù chạy từ root hay từ backend/
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/movie-booking';

// ── Parse CLI args ────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const emailArg = (() => {
  const idx = args.indexOf('--email');
  return idx !== -1 ? args[idx + 1] : null;
})();
const isDryRun = args.includes('--dry-run');

const DEFAULT_PWD = {
  admin: 'Admin@123',
  user:  'User@123',
};

// ─────────────────────────────────────────────────────────────────────────────
async function run() {
  console.log('\n🔑  Reset Passwords Script');
  console.log('─'.repeat(50));

  if (isDryRun) console.log('⚠️  DRY-RUN mode — không lưu vào DB\n');

  await mongoose.connect(MONGO_URI);
  console.log('✅ Kết nối MongoDB thành công\n');

  // ── Xây filter ──────────────────────────────────────────────────────────────
  const filter = emailArg
    ? { email: emailArg.toLowerCase() }
    : {};                               // reset tất cả nếu không có --email

  const users = await User.find(filter);

  if (users.length === 0) {
    console.log(emailArg
      ? `❌  Không tìm thấy tài khoản: ${emailArg}`
      : '❌  Không có tài khoản nào trong DB');
    await mongoose.disconnect();
    return;
  }

  console.log(`📋 Tìm thấy ${users.length} tài khoản cần reset:\n`);

  let successCount = 0;
  let errorCount   = 0;

  for (const u of users) {
    const newPwd = DEFAULT_PWD[u.role] ?? DEFAULT_PWD.user;
    const label  = `  [${u.role.padEnd(5)}]  ${u.email}`;

    if (isDryRun) {
      console.log(`${label}  →  sẽ đặt: ${newPwd}`);
      successCount++;
      continue;
    }

    try {
      // Gán thẳng vào field → pre-save hook sẽ hash tự động
      u.password = newPwd;
      await u.save();
      console.log(`✔️ ${label}  →  ${newPwd}`);
      successCount++;
    } catch (err) {
      console.error(`❌ ${label}  →  LỖI: ${err.message}`);
      errorCount++;
    }
  }

  console.log('\n' + '─'.repeat(50));
  console.log(`✅ Thành công : ${successCount}`);
  if (errorCount > 0) console.log(`❌ Thất bại   : ${errorCount}`);
  console.log(isDryRun ? '🔍 Chế độ dry-run — không có thay đổi nào được lưu.' : '🔒 Mật khẩu đã được hash và lưu vào DB.');

  await mongoose.disconnect();
  console.log('🔌 Đã ngắt kết nối MongoDB\n');
}

run().catch(err => {
  console.error('\n💥 Script lỗi:', err);
  mongoose.disconnect();
  process.exit(1);
});
