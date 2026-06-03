/**
 * Script: seedReviews.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Mục đích:
 *   Seed dữ liệu mẫu cho collection `reviews`.
 *   - Lấy danh sách users và movies thực từ DB (không hardcode ObjectId).
 *   - Tạo 2–3 review ngẫu nhiên cho mỗi phim đang chiếu (now_showing).
 *   - Tự động cập nhật vote_average + vote_count trên Movie sau khi seed.
 *   - Bỏ qua nếu cặp (user, movie) đã tồn tại (idempotent).
 *
 * Chạy:
 *   node scripts/seedReviews.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose from 'mongoose';
import dotenv   from 'dotenv';
import User     from '../models/User.js';
import Movie    from '../models/Movie.js';
import Review   from '../models/Review.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/movie-booking';

// ─── Nội dung bình luận mẫu theo từng mức điểm ───────────────────────────────
const COMMENT_POOL = {
  high: [ // rating >= 8
    'Phim thực sự xuất sắc! Kịch bản chặt chẽ, diễn xuất ấn tượng. Rất xứng đáng để xem trên màn ảnh rộng.',
    'Một tác phẩm điện ảnh đỉnh cao. Từng khung hình đều được chăm chút tỉ mỉ. Tôi đã xem 2 lần rồi.',
    'Hoàn toàn bị cuốn hút từ đầu đến cuối. Âm nhạc, hình ảnh, diễn xuất đều ở đẳng cấp khác. Cực kỳ ấn tượng!',
    'Xứng đáng với tất cả những lời khen ngợi. Phim có chiều sâu, cảm xúc và kỹ xảo đỉnh cao.',
    'Nếu bạn chỉ xem một bộ phim trong năm nay, hãy chọn bộ này. Không thể chê vào đâu được.',
  ],
  mid: [ // rating 5–7.5
    'Phim tạm ổn, có một số cảnh hay nhưng nhìn chung chưa đạt kỳ vọng. Xem một lần cũng được.',
    'Nội dung ở mức trung bình, không có gì quá đặc sắc nhưng cũng không tệ. Phù hợp để xem giải trí cuối tuần.',
    'Phần đầu phim khá hấp dẫn nhưng phần sau có vẻ hơi vội. Kỹ xảo đẹp, diễn xuất khá.',
    'Có những khoảnh khắc thực sự hay nhưng xen lẫn nhiều đoạn kéo dài không cần thiết. Tổng thể vẫn đáng xem.',
    'Không tệ nhưng cũng không quá xuất sắc. Phim giải trí bình thường.',
  ],
  low: [ // rating <= 4
    'Thất vọng với bộ phim này. Kịch bản thiếu logic, diễn xuất gượng gạo. Không xứng đáng với giá vé.',
    'Kỳ vọng nhiều hơn sau khi xem trailer. Phim thực tế không đáp ứng được những gì đã hứa hẹn.',
    'Cốt truyện quá đơn giản và dễ đoán. Cảm giác đang xem phim dành cho thiếu nhi dù phân loại khác.',
    'Phần kỹ xảo đẹp nhưng nội dung rỗng tuếch. Tôi khuyên bạn nên cân nhắc kỹ trước khi bỏ tiền mua vé.',
  ],
};

// ─── Lấy comment phù hợp với rating ─────────────────────────────────────────
const getComment = (rating) => {
  const pool =
    rating >= 8 ? COMMENT_POOL.high :
    rating >= 5 ? COMMENT_POOL.mid  :
                  COMMENT_POOL.low;
  return pool[Math.floor(Math.random() * pool.length)];
};

// ─── Random số nguyên trong khoảng [min, max] ────────────────────────────────
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ─── Random rating hợp lệ (số nguyên hoặc .5) ────────────────────────────────
const randRating = (min = 1, max = 10) => {
  // Tạo danh sách rating hợp lệ: 1, 1.5, 2, 2.5, ..., 10
  const valid = [];
  for (let v = min * 2; v <= max * 2; v++) valid.push(v / 2);
  return valid[Math.floor(Math.random() * valid.length)];
};

// ─── MAIN ────────────────────────────────────────────────────────────────────
const run = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`✅ Kết nối MongoDB: ${MONGO_URI}\n`);

    // ── 1. Lấy dữ liệu thực từ DB ──────────────────────────────────────────
    const users  = await User.find({ role: 'user' }).select('_id name email');
    const movies = await Movie.find({ status: 'now_showing' }).select('_id title vote_average vote_count');

    if (users.length === 0)  { console.log('⚠️  Không có user nào trong DB. Seed users trước.'); return; }
    if (movies.length === 0) { console.log('⚠️  Không có phim now_showing nào. Kiểm tra lại.'); return; }

    console.log(`👤 Tìm thấy ${users.length} users và 🎬 ${movies.length} phim đang chiếu.\n`);

    // ── 2. Seed reviews ────────────────────────────────────────────────────
    let created = 0;
    let skipped = 0;

    for (const movie of movies) {
      console.log(`🎬 Đang seed review cho: "${movie.title}"`);

      // Số review mỗi phim: ngẫu nhiên 2–4, không vượt số lượng user
      const reviewCount = Math.min(randInt(2, 4), users.length);

      // Chọn ngẫu nhiên users không trùng nhau
      const shuffled = [...users].sort(() => Math.random() - 0.5);
      const selectedUsers = shuffled.slice(0, reviewCount);

      for (const user of selectedUsers) {
        // Chọn rating với xu hướng dương (thực tế phim đang chiếu thường nhận điểm cao)
        const rating = randRating(
          5,   // min: không ai cho phim đang chiếu dưới 5
          10
        );

        const isSpoiler = Math.random() < 0.15; // 15% review có spoiler

        // Seed với insertIfNotExists pattern
        const existed = await Review.findOne({ user: user._id, movie: movie._id });
        if (existed) {
          console.log(`   ⏭️  Bỏ qua: ${user.email} → "${movie.title}" (đã tồn tại)`);
          skipped++;
          continue;
        }

        const review = new Review({
          user: user._id,
          movie: movie._id,
          rating,
          comment: getComment(rating),
          isSpoiler,
          status: 'approved',
          isVerifiedPurchase: false, // seed mẫu không liên kết booking
        });

        await review.save(); // post-hook tự cập nhật vote_average + vote_count
        created++;
        console.log(
          `   ✔ ${user.email.padEnd(35)} rating: ${String(rating).padStart(4)}  spoiler: ${isSpoiler ? 'Có' : 'Không'}`
        );
      }
    }

    // ── 3. In kết quả cuối ─────────────────────────────────────────────────
    console.log('\n─────────────────────────────────────────────────────────────────');
    console.log('📊 KẾT QUẢ SEED REVIEWS:');

    const updatedMovies = await Movie.find({ status: 'now_showing' }).select('title vote_average vote_count');
    console.log(`\n${'Phim'.padEnd(45)} ${'vote_avg'.padStart(8)} ${'vote_cnt'.padStart(9)}`);
    console.log('─'.repeat(65));
    updatedMovies.forEach((m) => {
      console.log(
        `${m.title.slice(0, 44).padEnd(45)} ${String(m.vote_average).padStart(8)} ${String(m.vote_count).padStart(9)}`
      );
    });

    console.log('\n─────────────────────────────────────────────────────────────────');
    console.log(`✅ Đã tạo mới : ${created} review`);
    console.log(`⏭️  Bỏ qua    : ${skipped} review (đã tồn tại)`);
    console.log('─────────────────────────────────────────────────────────────────\n');

  } catch (err) {
    console.error('❌ Lỗi:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Đã ngắt kết nối MongoDB\n');
  }
};

run();
