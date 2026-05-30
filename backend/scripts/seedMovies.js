/**
 * scripts/seedMovies.js
 *
 * Thêm 8 phim mới vào collection movies (KHÔNG xóa phim cũ).
 * poster_path / backdrop_path là tên file cục bộ trong:
 *   frontend/client/src/assets/images/posters/
 *   frontend/client/src/assets/images/backdrops/
 *
 * Run: node scripts/seedMovies.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Movie from '../models/Movie.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/movie-booking';

// ══════════════════════════════════════════════════════════════════════════════
// MOVIES DATA
// ══════════════════════════════════════════════════════════════════════════════
const newMovies = [
  // ─── 1. Avengers: Doomsday ────────────────────────────────────────────────
  {
    title:             'Avengers: Doomsday',
    overview:
      'Sau sự sụp đổ của nhóm Avengers, một mối đe dọa chưa từng có xuất hiện — Doctor Doom. Người đàn ông sở hữu sức mạnh của cả Reed Richards lẫn Thanos đứng trước cánh cửa hủy diệt hoàn toàn thực tại. Các siêu anh hùng còn sống sót phải vượt qua mâu thuẫn nội bộ để đối mặt với ngày tận thế.',
    poster_path:       'doomsday-poster.jpg',
    backdrop_path:     'doomsday-backdrop.jpg',
    release_date:      new Date('2026-05-01'),
    genres: [
      { id: 28,  name: 'Hành Động' },
      { id: 12,  name: 'Phiêu Lưu' },
      { id: 878, name: 'Khoa Học Viễn Tưởng' },
    ],
    runtime:           150,
    vote_average:      8.6,
    vote_count:        21000,
    casts: [
      { name: 'Robert Downey Jr.',   character: 'Doctor Doom / Victor Von Doom',   profile_path: 'https://image.tmdb.org/t/p/w185/5qHNjhtjMD4YWH3UP0rm4tKwxCL.jpg' },
      { name: 'Chris Evans',         character: 'Steve Rogers / Captain America',  profile_path: 'https://image.tmdb.org/t/p/w185/3bOGNsHlrswhyW79uvIHH1V43JI.jpg' },
      { name: 'Scarlett Johansson',  character: 'Natasha Romanoff',                profile_path: 'https://image.tmdb.org/t/p/w185/6NsMbJXRlDZuDzatN2akFY8SYkq.jpg' },
      { name: 'Benedict Cumberbatch',character: 'Doctor Strange',                  profile_path: 'https://image.tmdb.org/t/p/w185/xuAIuYSmsUzKlUMBFGVZaWsY3DZ.jpg' },
      { name: 'Pedro Pascal',        character: 'Reed Richards / Mr. Fantastic',   profile_path: 'https://image.tmdb.org/t/p/w185/8UlWHLMpgZm9bx6QYh0NFoq67TZ.jpg' },
    ],
    tagline:           'Ngày tận thế đã đến.',
    original_language: 'en',
    trailer_url:       'TcMBFSGVi1c',
    age_rating:        'T13',
    status:            'now_showing',
  },

  // ─── 2. Godzilla x Kong ───────────────────────────────────────────────────
  {
    title:             'Godzilla x Kong: The New Empire',
    overview:
      'Godzilla và Kong — hai titan hùng mạnh nhất thế giới — buộc phải liên minh để đối mặt với một mối đe dọa khổng lồ ẩn sâu bên trong lòng Trái Đất. Hành trình khám phá vương quốc Hollow Earth tiết lộ bí mật về nguồn gốc và sức mạnh tối thượng của các titan.',
    poster_path:       'godzilla-kong-poster.jpg',
    backdrop_path:     'godzilla-kong-backdrop.jpg',
    release_date:      new Date('2026-03-29'),
    genres: [
      { id: 28,  name: 'Hành Động' },
      { id: 12,  name: 'Phiêu Lưu' },
      { id: 878, name: 'Khoa Học Viễn Tưởng' },
    ],
    runtime:           115,
    vote_average:      7.2,
    vote_count:        8500,
    casts: [
      { name: 'Rebecca Hall',   character: 'Dr. Ilene Andrews',  profile_path: 'https://image.tmdb.org/t/p/w185/6kMiNM4yTSoD6zxJbOK6pjCJaFy.jpg' },
      { name: 'Brian Tyree Henry', character: 'Bernie Hayes',   profile_path: 'https://image.tmdb.org/t/p/w185/pcEHM4DPnXnFM7SMYRrA3A5S19q.jpg' },
      { name: 'Dan Stevens',    character: 'Trapper',            profile_path: 'https://image.tmdb.org/t/p/w185/alTqpyaKnxzGJQQG8YNh7YFzXqC.jpg' },
      { name: 'Kaylee Hottle',  character: 'Jia',                profile_path: 'https://image.tmdb.org/t/p/w185/9yBVqNruk6Ykrwc32qrK2TIE5xw.jpg' },
    ],
    tagline:           'Thế giới cần cả hai.',
    original_language: 'en',
    trailer_url:       'lV1OOlGwExM',
    age_rating:        'T13',
    status:            'now_showing',
  },

  // ─── 3. Inception 2 ───────────────────────────────────────────────────────
  {
    title:             'Inception 2',
    overview:
      'Cobb trở lại với một nhiệm vụ không thể — xâm nhập vào tầng giấc mơ thứ tư chưa từng có ai chạm tới. Lần này, ranh giới giữa ký ức và thực tại sụp đổ hoàn toàn, và kẻ thù lớn nhất lại chính là phiên bản khác của bản thân anh trong mê cung vô tận của tâm trí.',
    poster_path:       'inception2-poster.jpg',
    backdrop_path:     'inception2-backdrop.jpg',
    release_date:      new Date('2026-07-16'),
    genres: [
      { id: 28,  name: 'Hành Động' },
      { id: 878, name: 'Khoa Học Viễn Tưởng' },
      { id: 53,  name: 'Ly Kỳ' },
    ],
    runtime:           168,
    vote_average:      8.9,
    vote_count:        14200,
    casts: [
      { name: 'Leonardo DiCaprio',  character: 'Dom Cobb',          profile_path: 'https://image.tmdb.org/t/p/w185/wo2hJpn04vbtmh0B9utCFdsQhxM.jpg' },
      { name: 'Joseph Gordon-Levitt',character: 'Arthur',           profile_path: 'https://image.tmdb.org/t/p/w185/mZ2tNbOpRoKz9dPVSrpFbpKYyQe.jpg' },
      { name: 'Elliot Page',        character: 'Ariadne',           profile_path: 'https://image.tmdb.org/t/p/w185/8LYvLKX9QLQT7VCNHJJPh8KSKnC.jpg' },
      { name: 'Tom Hardy',          character: 'Eames',             profile_path: 'https://image.tmdb.org/t/p/w185/d81K0RH8UX7tZj49tZaQhZ9ewH.jpg' },
      { name: 'Ken Watanabe',       character: 'Saito',             profile_path: 'https://image.tmdb.org/t/p/w185/lSVPFV4KiDxDwYBlyqDfL6HHOHz.jpg' },
    ],
    tagline:           'Sâu hơn. Nguy hiểm hơn. Không lối thoát.',
    original_language: 'en',
    trailer_url:       'YoHD9XEInc0',
    age_rating:        'T16',
    status:            'coming_soon',
  },

  // ─── 4. Inside Out 2 ──────────────────────────────────────────────────────
  {
    title:             'Inside Out 2',
    overview:
      'Riley bước vào tuổi teen và mọi thứ bỗng trở nên phức tạp hơn khi những cảm xúc mới xuất hiện: Lo Lắng, Chán Nản, Xấu Hổ và Ghen Tuông. Joy phải đối mặt với thách thức lớn nhất từ trước đến nay khi các cảm xúc mới đang dần chiếm lấy tâm trí Riley.',
    poster_path:       'inside-out-2-poster.jpg',
    backdrop_path:     'inside-out-2-backdrop.jpg',
    release_date:      new Date('2026-06-14'),
    genres: [
      { id: 16,    name: 'Hoạt Hình' },
      { id: 35,    name: 'Hài' },
      { id: 10751, name: 'Gia Đình' },
    ],
    runtime:           100,
    vote_average:      8.0,
    vote_count:        18700,
    casts: [
      { name: 'Amy Poehler',   character: 'Joy (lồng tiếng)',        profile_path: 'https://image.tmdb.org/t/p/w185/rwmvRonpluV6dCPiQissYrchvSD.jpg' },
      { name: 'Maya Hawke',    character: 'Anxiety (lồng tiếng)',    profile_path: 'https://image.tmdb.org/t/p/w185/r3A7ev7QkjOGocVn3kQrJ0eOouk.jpg' },
      { name: 'Phyllis Smith', character: 'Sadness (lồng tiếng)',    profile_path: 'https://image.tmdb.org/t/p/w185/6NsMbJXRlDZuDzatN2akFY8SYkq.jpg' },
      { name: 'Lewis Black',   character: 'Anger (lồng tiếng)',      profile_path: 'https://image.tmdb.org/t/p/w185/5qHNjhtjMD4YWH3UP0rm4tKwxCL.jpg' },
    ],
    tagline:           'Chào mừng đến với tuổi teen.',
    original_language: 'en',
    trailer_url:       'LEjhY15eCx0',
    age_rating:        'P',
    status:            'now_showing',
  },

  // ─── 5. Kung Fu Panda 4 ───────────────────────────────────────────────────
  {
    title:             'Kung Fu Panda 4',
    overview:
      'Po được chọn làm Lãnh Đạo Tinh Thần của Thung Lũng Hòa Bình, nhưng trước tiên phải tìm người kế thừa vị trí Chiến Binh Rồng. Trong hành trình đó, anh đối mặt với Tắc Kè — kẻ phản diện nguy hiểm có khả năng mô phỏng năng lực của bất kỳ Kung Fu Master nào.',
    poster_path:       'kungfupanda4-poster.jpg',
    backdrop_path:     'kungfupanda4-backdrop.jpg',
    release_date:      new Date('2026-03-08'),
    genres: [
      { id: 16,    name: 'Hoạt Hình' },
      { id: 28,    name: 'Hành Động' },
      { id: 35,    name: 'Hài' },
      { id: 10751, name: 'Gia Đình' },
    ],
    runtime:           94,
    vote_average:      7.5,
    vote_count:        9300,
    casts: [
      { name: 'Jack Black',       character: 'Po (lồng tiếng)',          profile_path: 'https://image.tmdb.org/t/p/w185/5Ib2V1KKMBDfKMCxSqL5IM7CAvt.jpg' },
      { name: 'Viola Davis',      character: 'The Chameleon (lồng tiếng)',profile_path: 'https://image.tmdb.org/t/p/w185/jtAI6OJIWLWiRItNSXoDE9ONdhB.jpg' },
      { name: 'Bryan Cranston',   character: 'Li Shan (lồng tiếng)',      profile_path: 'https://image.tmdb.org/t/p/w185/bHoS0yXdv4SYIxF8Wbv3r9bAHSj.jpg' },
      { name: 'Awkwafina',        character: 'Zhen (lồng tiếng)',         profile_path: 'https://image.tmdb.org/t/p/w185/d81K0RH8UX7tZj49tZaQhZ9ewH.jpg' },
    ],
    tagline:           'Bậc thầy phải tìm người kế nhiệm.',
    original_language: 'en',
    trailer_url:       'wuPkrVzmTXc',
    age_rating:        'P',
    status:            'now_showing',
  },

  // ─── 6. Lật Mặt 8 ────────────────────────────────────────────────────────
  {
    title:             'Lật Mặt 8: Vòng Đời',
    overview:
      'Phần tiếp theo của thương hiệu điện ảnh Việt Nam đình đám. Câu chuyện xoay quanh ba thế hệ trong một gia đình bắt đầu gặp khủng hoảng khi di sản truyền thống và hiện đại xung đột. Bộ phim khắc họa chân thực hành trình mỗi người trưởng thành qua những vết thương và bài học.',
    poster_path:       'latmat8-poster.jpg',
    backdrop_path:     'latmat8-backdrop.jpg',
    release_date:      new Date('2026-04-30'),
    genres: [
      { id: 18,    name: 'Chính Kịch' },
      { id: 10751, name: 'Gia Đình' },
    ],
    runtime:           128,
    vote_average:      8.3,
    vote_count:        11500,
    casts: [
      { name: 'Lý Hải',         character: 'Người cha',       profile_path: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/L%C3%BD_H%E1%BA%A3i_2019.jpg/220px-L%C3%BD_H%E1%BA%A3i_2019.jpg' },
      { name: 'Trấn Thành',     character: 'Người con trai',  profile_path: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Tr%E1%BA%A5n_Th%C3%A0nh_2022.jpg/220px-Tr%E1%BA%A5n_Th%C3%A0nh_2022.jpg' },
      { name: 'Kiều Minh Tuấn', character: 'Người con rể',   profile_path: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Ki%E1%BB%81u_Minh_Tu%E1%BA%A5n.jpg/220px-Ki%E1%BB%81u_Minh_Tu%E1%BA%A5n.jpg' },
      { name: 'Ngô Thanh Vân',  character: 'Người mẹ',       profile_path: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Ng%C3%B4_Thanh_V%C3%A2n_2018.jpg/220px-Ng%C3%B4_Thanh_V%C3%A2n_2018.jpg' },
    ],
    tagline:           'Mỗi vòng đời là một bài học.',
    original_language: 'vi',
    trailer_url:       'JfVOs4VSpmA',
    age_rating:        'T13',
    status:            'now_showing',
  },

  // ─── 7. Mắt Biếc ─────────────────────────────────────────────────────────
  {
    title:             'Mắt Biếc',
    overview:
      'Ngạn — chàng trai nghèo lớn lên cùng Hà Lan, cô gái đẹp nhất làng Đo Đo. Tình yêu đơn phương đau đáu của Ngạn trải dài suốt cả tuổi thơ đến khi trưởng thành, theo dõi Hà Lan lần lượt yêu người khác, lập gia đình, rồi bỗng dưng quay về. Chuyện tình buồn nhất của văn học Việt Nam.',
    poster_path:       'mat-biec-poster.jpg',
    backdrop_path:     'mat-biec-backdrop.jpg',
    release_date:      new Date('2019-11-29'),
    genres: [
      { id: 18,    name: 'Chính Kịch' },
      { id: 10749, name: 'Lãng Mạn' },
    ],
    runtime:           120,
    vote_average:      8.2,
    vote_count:        13600,
    casts: [
      { name: 'Trần Nghĩa',    character: 'Ngạn',    profile_path: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Ng%E1%BB%A7_di%E1%BB%85n_vi%C3%AAn_Tr%E1%BA%A7n_Ngh%C4%A9a.jpg/220px-Ng%E1%BB%A7_di%E1%BB%85n_vi%C3%AAn_Tr%E1%BA%A7n_Ngh%C4%A9a.jpg' },
      { name: 'Lan Ngọc',      character: 'Hà Lan', profile_path: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Ph%C6%B0%C6%A1ng_Anh_%C4%90%C3%A0o.jpg/220px-Ph%C6%B0%C6%A1ng_Anh_%C4%90%C3%A0o.jpg' },
      { name: 'Phan Mạnh Quỳnh',character: 'Nhạc sĩ / OST', profile_path: 'https://image.tmdb.org/t/p/w185/5qHNjhtjMD4YWH3UP0rm4tKwxCL.jpg' },
    ],
    tagline:           'Tình yêu đẹp nhất là tình yêu không bao giờ nói lên lời.',
    original_language: 'vi',
    trailer_url:       'SdHnOdDWVxM',
    age_rating:        'T13',
    status:            'ended',
  },

  // ─── 8. Quật Mộ Trùng Ma ──────────────────────────────────────────────────
  {
    title:             'Quật Mộ Trùng Ma',
    overview:
      'Một nhóm thợ đào mộ vô tình phá vỡ lời nguyền cổ đại khi khai quật ngôi mộ bí ẩn tại một vùng đất hẻo lánh miền Trung Việt Nam. Những thực thể từ thế giới bên kia lần lượt tỉnh giấc, và ranh giới giữa người sống và người chết dần biến mất trong màn đêm kinh hoàng.',
    poster_path:       'quatmotrungma-poster.jpg',
    backdrop_path:     'quatmotrungma-backdrop.jpg',
    release_date:      new Date('2026-05-09'),
    genres: [
      { id: 27, name: 'Kinh Dị' },
      { id: 53, name: 'Ly Kỳ' },
    ],
    runtime:           112,
    vote_average:      7.6,
    vote_count:        6800,
    casts: [
      { name: 'Quang Tuấn',    character: 'Hùng',    profile_path: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Tu%E1%BA%A5n_Tr%E1%BA%A7n_2023.jpg/220px-Tu%E1%BA%A5n_Tr%E1%BA%A7n_2023.jpg' },
      { name: 'Hoàng Yến Chibi',character: 'Bích',   profile_path: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Ph%C6%B0%C6%A1ng_Anh_%C4%90%C3%A0o.jpg/220px-Ph%C6%B0%C6%A1ng_Anh_%C4%90%C3%A0o.jpg' },
      { name: 'Tiến Luật',     character: 'Thầy cúng', profile_path: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/L%C3%BD_H%E1%BA%A3i_2019.jpg/220px-L%C3%BD_H%E1%BA%A3i_2019.jpg' },
    ],
    tagline:           'Đừng đánh thức những gì đã ngủ.',
    original_language: 'vi',
    trailer_url:       '5xH0HfJHsaY',
    age_rating:        'T18',
    status:            'now_showing',
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// SEED FUNCTION
// ══════════════════════════════════════════════════════════════════════════════
const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  let addedCount = 0;
  let skippedCount = 0;

  for (const movieData of newMovies) {
    const exists = await Movie.findOne({ title: movieData.title });
    if (exists) {
      console.log(`  ⚠ Bỏ qua (đã tồn tại): "${movieData.title}"`);
      skippedCount++;
      continue;
    }

    const movie = await Movie.create(movieData);
    console.log(`  ✔ Tạo mới: "${movie.title}" | poster: ${movie.poster_path} | backdrop: ${movie.backdrop_path}`);
    addedCount++;
  }

  console.log('\n🎉 ══════════════════════════════════════════════');
  console.log('   SEED MOVIES HOÀN THÀNH!');
  console.log('══════════════════════════════════════════════════');
  console.log(`  ✅ Thêm mới:   ${addedCount} phim`);
  console.log(`  ⚠  Bỏ qua:    ${skippedCount} phim (đã tồn tại)`);
  console.log(`  📊 Tổng phim: ${await Movie.countDocuments()}`);
  console.log('══════════════════════════════════════════════════\n');

  await mongoose.disconnect();
  console.log('🔌 Disconnected.');
};

run().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
