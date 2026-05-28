/**
 * Script tạo dữ liệu mẫu phong phú cho MongoDB Atlas
 * Chạy: node scripts/seedData.js
 *
 * Script này sẽ:
 * 1. Xóa toàn bộ data cũ
 * 2. Tạo 8 Users (6 user + 2 admin)
 * 3. Tạo 10 Movies với ảnh TMDB thật & trailer YouTube
 * 4. Tạo 5 Cinemas (rạp chiếu phim)
 * 5. Tạo Rooms đa dạng (2D, 3D, IMAX, 4DX)
 * 6. Tạo Shows (suất chiếu) nhiều ngày
 * 7. Tạo Bookings mẫu
 * 8. Tạo Favorites mẫu
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Movie from '../models/Movie.js';
import Theater from '../models/Theater.js';
import Room from '../models/Room.js';
import Show from '../models/Show.js';
import Booking, { generateUniqueBookingCode } from '../models/Booking.js';
import Favorite from '../models/Favorite.js';

dotenv.config();

const MONGO_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/movie-booking';

// ============================================================
// 1. USERS DATA
// ============================================================

const usersData = [
  {
    name: 'Nguyễn Văn An',
    email: 'an.nguyen@example.com',
    password: 'password123',
    phone: '0901234567',
    avatar: 'https://i.pravatar.cc/150?u=an.nguyen',
    role: 'user',
  },
  {
    name: 'Trần Thị Bình',
    email: 'binh.tran@example.com',
    password: 'password123',
    phone: '0912345678',
    avatar: 'https://i.pravatar.cc/150?u=binh.tran',
    role: 'user',
  },
  {
    name: 'Lê Hoàng Cường',
    email: 'cuong.le@example.com',
    password: 'password123',
    phone: '0923456789',
    avatar: 'https://i.pravatar.cc/150?u=cuong.le',
    role: 'user',
  },
  {
    name: 'Phạm Thanh Duyên',
    email: 'duyen.pham@example.com',
    password: 'password123',
    phone: '0934567890',
    avatar: 'https://i.pravatar.cc/150?u=duyen.pham',
    role: 'user',
  },
  {
    name: 'Võ Minh Đức',
    email: 'duc.vo@example.com',
    password: 'password123',
    phone: '0945678901',
    avatar: 'https://i.pravatar.cc/150?u=duc.vo',
    role: 'user',
  },
  {
    name: 'Hoàng Mai Linh',
    email: 'linh.hoang@example.com',
    password: 'password123',
    phone: '0956789012',
    avatar: 'https://i.pravatar.cc/150?u=linh.hoang',
    role: 'user',
  },
  {
    name: 'Admin CineMax',
    email: 'admin@cinemax.vn',
    password: 'admin123',
    phone: '0900000000',
    avatar: 'https://i.pravatar.cc/150?u=admin.cinemax',
    role: 'admin',
  },
  {
    name: 'Manager CGV',
    email: 'manager@cgv.vn',
    password: 'admin123',
    phone: '0900000001',
    avatar: 'https://i.pravatar.cc/150?u=manager.cgv',
    role: 'admin',
  },
];

// ============================================================
// 2. MOVIES DATA — ảnh thật từ TMDB, trailer YouTube
// ============================================================

const moviesData = [
  {
    title: 'Avengers: Endgame',
    overview:
      'Sau sự tàn phá của Thanos, các siêu anh hùng Avengers còn lại phải tập hợp một lần nữa để hoàn tác hành động của hắn và khôi phục trật tự vũ trụ.',
    poster_path: 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg',
    backdrop_path: 'https://image.tmdb.org/t/p/original/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg',
    release_date: new Date('2026-04-26'),
    genres: [
      { id: 28, name: 'Hành Động' },
      { id: 12, name: 'Phiêu Lưu' },
      { id: 878, name: 'Khoa Học Viễn Tưởng' },
    ],
    runtime: 181,
    vote_average: 8.4,
    vote_count: 23500,
    casts: [
      { name: 'Robert Downey Jr.', character: 'Tony Stark / Iron Man', profile_path: 'https://image.tmdb.org/t/p/w185/5qHNjhtjMD4YWH3UP0rm4tKwxCL.jpg' },
      { name: 'Chris Evans', character: 'Steve Rogers / Captain America', profile_path: 'https://image.tmdb.org/t/p/w185/3bOGNsHlrswhyW79uvIHH1V43JI.jpg' },
      { name: 'Scarlett Johansson', character: 'Natasha Romanoff / Black Widow', profile_path: 'https://image.tmdb.org/t/p/w185/6NsMbJXRlDZuDzatN2akFY8SYkq.jpg' },
      { name: 'Chris Hemsworth', character: 'Thor', profile_path: 'https://image.tmdb.org/t/p/w185/jpurJ9jAcLCYjgHHfYF32m3zJYm.jpg' },
      { name: 'Mark Ruffalo', character: 'Bruce Banner / Hulk', profile_path: 'https://image.tmdb.org/t/p/w185/z3dvKqMNDQWMCh6IpkmFnbMOPnG.jpg' },
    ],
    tagline: 'Cuộc chiến cuối cùng. Bằng mọi giá.',
    original_language: 'en',
    trailer_url: 'TcMBFSGVi1c',
  },
  {
    title: 'Lật Mặt 7: Một Điều Ước',
    overview:
      'Câu chuyện cảm động về tình cảm gia đình xoay quanh ba thế hệ. Khi ông nội sắp mất, cả gia đình cùng nhau thực hiện điều ước cuối cùng của ông, mở ra những bí mật và nước mắt.',
    poster_path: 'https://image.tmdb.org/t/p/w500/kGzFbGhp99DyDe99Ktr3VgF2GUm.jpg',
    backdrop_path: 'https://image.tmdb.org/t/p/original/9yBVqNruk6Ykrwc32qrK2TIE5xw.jpg',
    release_date: new Date('2026-04-28'),
    genres: [
      { id: 18, name: 'Chính Kịch' },
      { id: 10751, name: 'Gia Đình' },
    ],
    runtime: 132,
    vote_average: 8.1,
    vote_count: 15200,
    casts: [
      { name: 'Lý Hải', character: 'Người cha', profile_path: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/L%C3%BD_H%E1%BA%A3i_2019.jpg/220px-L%C3%BD_H%E1%BA%A3i_2019.jpg' },
      { name: 'Trấn Thành', character: 'Người con trai', profile_path: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Tr%E1%BA%A5n_Th%C3%A0nh_2022.jpg/220px-Tr%E1%BA%A5n_Th%C3%A0nh_2022.jpg' },
      { name: 'Kiều Minh Tuấn', character: 'Người con rể', profile_path: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Ki%E1%BB%81u_Minh_Tu%E1%BA%A5n.jpg/220px-Ki%E1%BB%81u_Minh_Tu%E1%BA%A5n.jpg' },
    ],
    tagline: 'Gia đình là nơi bắt đầu và kết thúc mọi thứ.',
    original_language: 'vi',
    trailer_url: 'JfVOs4VSpmA',
  },
  {
    title: 'Dune: Part Two',
    overview:
      'Paul Atreides hợp nhất với Chani và người Fremen trong hành trình báo thù những kẻ đã phá hủy gia đình mình. Đối mặt với sự lựa chọn giữa tình yêu và vận mệnh vũ trụ.',
    poster_path: 'https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8PY05Nez7H.jpg',
    backdrop_path: 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
    release_date: new Date('2026-03-01'),
    genres: [
      { id: 878, name: 'Khoa Học Viễn Tưởng' },
      { id: 12, name: 'Phiêu Lưu' },
      { id: 28, name: 'Hành Động' },
    ],
    runtime: 166,
    vote_average: 8.3,
    vote_count: 9800,
    casts: [
      { name: 'Timothée Chalamet', character: 'Paul Atreides', profile_path: 'https://image.tmdb.org/t/p/w185/BE2sdjpgsa2rNTFa66f7upkaOP.jpg' },
      { name: 'Zendaya', character: 'Chani', profile_path: 'https://image.tmdb.org/t/p/w185/r3A7ev7QkjOGocVn3kQrJ0eOouk.jpg' },
      { name: 'Austin Butler', character: 'Feyd-Rautha', profile_path: 'https://image.tmdb.org/t/p/w185/ueXDpXBbsMgFNqXY9xeNqRqhoGJ.jpg' },
      { name: 'Florence Pugh', character: 'Princess Irulan', profile_path: 'https://image.tmdb.org/t/p/w185/fhEsn35uAwUbuKsNfji5vJGbLCl.jpg' },
    ],
    tagline: 'Huyền thoại sẽ trỗi dậy.',
    original_language: 'en',
    trailer_url: 'Way9Dexny3w',
  },
  {
    title: 'Oppenheimer',
    overview:
      'Câu chuyện về J. Robert Oppenheimer — nhà vật lý thiên tài đứng sau dự án Manhattan, người đã tạo ra bom nguyên tử và thay đổi cục diện thế giới mãi mãi.',
    poster_path: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    backdrop_path: 'https://image.tmdb.org/t/p/original/nb3xI8XI3w4pMVZ38VijbsyBqP4.jpg',
    release_date: new Date('2026-07-21'),
    genres: [
      { id: 18, name: 'Chính Kịch' },
      { id: 36, name: 'Lịch Sử' },
      { id: 53, name: 'Ly Kỳ' },
    ],
    runtime: 180,
    vote_average: 8.6,
    vote_count: 11200,
    casts: [
      { name: 'Cillian Murphy', character: 'J. Robert Oppenheimer', profile_path: 'https://image.tmdb.org/t/p/w185/dm6V24NjjvjMiCtbMkc8Y0q9eEo.jpg' },
      { name: 'Emily Blunt', character: 'Kitty Oppenheimer', profile_path: 'https://image.tmdb.org/t/p/w185/nPJXaFBMfVmVAI52aOBJCfSTcmi.jpg' },
      { name: 'Robert Downey Jr.', character: 'Lewis Strauss', profile_path: 'https://image.tmdb.org/t/p/w185/5qHNjhtjMD4YWH3UP0rm4tKwxCL.jpg' },
      { name: 'Matt Damon', character: 'Leslie Groves', profile_path: 'https://image.tmdb.org/t/p/w185/ehyBkODMt0QLFhi9UAjUDzIEJUH.jpg' },
    ],
    tagline: 'Thế giới thay đổi mãi mãi.',
    original_language: 'en',
    trailer_url: 'uYPbbksJxIg',
  },
  {
    title: 'Spider-Man: Across the Spider-Verse',
    overview:
      'Miles Morales trở lại trong chuyến phiêu lưu xuyên đa vũ trụ cùng Gwen Stacy, đối mặt với đội Spider đa vũ trụ và mối đe dọa mới mạnh hơn bất cứ thứ gì trước đó.',
    poster_path: 'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
    backdrop_path: 'https://image.tmdb.org/t/p/original/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg',
    release_date: new Date('2026-06-02'),
    genres: [
      { id: 16, name: 'Hoạt Hình' },
      { id: 28, name: 'Hành Động' },
      { id: 12, name: 'Phiêu Lưu' },
    ],
    runtime: 140,
    vote_average: 8.7,
    vote_count: 7500,
    casts: [
      { name: 'Shameik Moore', character: 'Miles Morales (voice)', profile_path: 'https://image.tmdb.org/t/p/w185/uJNaSTfBOfSQGlkxJJTDE4VLhbo.jpg' },
      { name: 'Hailee Steinfeld', character: 'Gwen Stacy (voice)', profile_path: 'https://image.tmdb.org/t/p/w185/7J8sKqefsq14RYNA5YROv1YVLY.jpg' },
      { name: 'Oscar Isaac', character: 'Miguel O\'Hara (voice)', profile_path: 'https://image.tmdb.org/t/p/w185/dW5U5yrIIPmMjRThR9KT28EB7Ld.jpg' },
    ],
    tagline: 'Đây là câu chuyện của Miles Morales.',
    original_language: 'en',
    trailer_url: 'cqGjhVJWtEg',
  },
  {
    title: 'Interstellar',
    overview:
      'Một nhóm nhà thám hiểm vượt qua lỗ sâu trong không gian để tìm kiếm một hành tinh mới cho nhân loại khi Trái Đất đang trên bờ vực diệt vong.',
    poster_path: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    backdrop_path: 'https://image.tmdb.org/t/p/original/xJHokMbljvjADYdit5fK5VQsXEG.jpg',
    release_date: new Date('2026-05-07'),
    genres: [
      { id: 12, name: 'Phiêu Lưu' },
      { id: 18, name: 'Chính Kịch' },
      { id: 878, name: 'Khoa Học Viễn Tưởng' },
    ],
    runtime: 169,
    vote_average: 8.7,
    vote_count: 34200,
    casts: [
      { name: 'Matthew McConaughey', character: 'Cooper', profile_path: 'https://image.tmdb.org/t/p/w185/wJiGedOCZhwMx9DezY8uwbNqmGM.jpg' },
      { name: 'Anne Hathaway', character: 'Brand', profile_path: 'https://image.tmdb.org/t/p/w185/tLelKoPNiyJCSEtQTz1FGv4TLGc.jpg' },
      { name: 'Jessica Chastain', character: 'Murph', profile_path: 'https://image.tmdb.org/t/p/w185/lodMzLKSdrPcBry2sGV3gp4QblI.jpg' },
      { name: 'Michael Caine', character: 'Professor Brand', profile_path: 'https://image.tmdb.org/t/p/w185/bVZRMlpjTAO3pGJV1ifSo5gEbyD.jpg' },
    ],
    tagline: 'Nhân loại sinh ra trên Trái Đất, nhưng không phải để chết ở đây.',
    original_language: 'en',
    trailer_url: 'zSWdZVtXT7E',
  },
  {
    title: 'Mai',
    overview:
      'Mai — một cô gái massage mang trong mình nhiều tổn thương và bí mật. Cuộc gặp gỡ với Dương đã thay đổi cuộc đời cô, nhưng quá khứ không dễ buông bỏ.',
    poster_path: 'https://image.tmdb.org/t/p/w500/rxlpMHzmFObNWkOKoF8K3GLovrT.jpg',
    backdrop_path: 'https://image.tmdb.org/t/p/original/gYdpGGVBz5vJboNIE9ksaOBqFSQ.jpg',
    release_date: new Date('2026-02-10'),
    genres: [
      { id: 18, name: 'Chính Kịch' },
      { id: 10749, name: 'Lãng Mạn' },
    ],
    runtime: 131,
    vote_average: 7.8,
    vote_count: 8900,
    casts: [
      { name: 'Phương Anh Đào', character: 'Mai', profile_path: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Ph%C6%B0%C6%A1ng_Anh_%C4%90%C3%A0o.jpg/220px-Ph%C6%B0%C6%A1ng_Anh_%C4%90%C3%A0o.jpg' },
      { name: 'Tuấn Trần', character: 'Dương', profile_path: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Tu%E1%BA%A5n_Tr%E1%BA%A7n_2023.jpg/220px-Tu%E1%BA%A5n_Tr%E1%BA%A7n_2023.jpg' },
      { name: 'Trấn Thành', character: 'Đạo diễn kiêm diễn viên', profile_path: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Tr%E1%BA%A5n_Th%C3%A0nh_2022.jpg/220px-Tr%E1%BA%A5n_Th%C3%A0nh_2022.jpg' },
    ],
    tagline: 'Ai cũng có quá khứ.',
    original_language: 'vi',
    trailer_url: 'SdHnOdDWVxM',
  },
  {
    title: 'The Batman',
    overview:
      'Trong năm thứ hai của sự nghiệp chống tội phạm, Batman khám phá sự tham nhũng ẩn sâu trong thành phố Gotham khi truy tìm một kẻ sát nhân bí ẩn mang tên Riddler.',
    poster_path: 'https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg',
    backdrop_path: 'https://image.tmdb.org/t/p/original/b0PlSFdDwbyFAJlMVnOzREhWqxo.jpg',
    release_date: new Date('2026-03-04'),
    genres: [
      { id: 80, name: 'Hình Sự' },
      { id: 9648, name: 'Bí Ẩn' },
      { id: 53, name: 'Ly Kỳ' },
    ],
    runtime: 176,
    vote_average: 7.7,
    vote_count: 10500,
    casts: [
      { name: 'Robert Pattinson', character: 'Bruce Wayne / Batman', profile_path: 'https://image.tmdb.org/t/p/w185/8A4PS2rMGEOmkJFMNBr5mSPB7r3.jpg' },
      { name: 'Zoë Kravitz', character: 'Selina Kyle / Catwoman', profile_path: 'https://image.tmdb.org/t/p/w185/hBLGBghPD1BEXgFhdJLIVRhkNyC.jpg' },
      { name: 'Paul Dano', character: 'Edward Nashton / Riddler', profile_path: 'https://image.tmdb.org/t/p/w185/cGRBv94WMgMPEq44kviH2M4T6q5.jpg' },
      { name: 'Colin Farrell', character: 'Oz / Penguin', profile_path: 'https://image.tmdb.org/t/p/w185/lBv6yrBCkVmFjJ33QhCxNbyfVgf.jpg' },
    ],
    tagline: 'Sự thật nằm trong bóng tối.',
    original_language: 'en',
    trailer_url: 'mqqft2x_Aa4',
  },
  {
    title: 'Parasite (Ký Sinh Trùng)',
    overview:
      'Gia đình Kim nghèo khó lần lượt xâm nhập vào gia đình giàu có Park bằng cách giả mạo thân phận. Một bi kịch bất ngờ và đen tối nảy sinh từ sự chênh lệch giai cấp.',
    poster_path: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    backdrop_path: 'https://image.tmdb.org/t/p/original/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg',
    release_date: new Date('2026-05-30'),
    genres: [
      { id: 35, name: 'Hài' },
      { id: 53, name: 'Ly Kỳ' },
      { id: 18, name: 'Chính Kịch' },
    ],
    runtime: 132,
    vote_average: 8.5,
    vote_count: 17800,
    casts: [
      { name: 'Song Kang-ho', character: 'Ki-taek', profile_path: 'https://image.tmdb.org/t/p/w185/nIJIrr1z1B0FPU6xNq0nnVliYfG.jpg' },
      { name: 'Lee Sun-kyun', character: 'Dong-ik', profile_path: 'https://image.tmdb.org/t/p/w185/0sjCvWMBkVoubMO93GJNZ9NVKM4.jpg' },
      { name: 'Cho Yeo-jeong', character: 'Yeon-gyo', profile_path: 'https://image.tmdb.org/t/p/w185/pIS0rX1FT6bVOD1pGdSFmqdG8wD.jpg' },
      { name: 'Choi Woo-shik', character: 'Ki-woo', profile_path: 'https://image.tmdb.org/t/p/w185/bP07GWciP5CUxkWt3vYzqGdW3t7.jpg' },
    ],
    tagline: 'Hành động theo kế hoạch. Không có kế hoạch.',
    original_language: 'ko',
    trailer_url: '5xH0HfJHsaY',
  },
  {
    title: 'Deadpool & Wolverine',
    overview:
      'Deadpool được TVA tuyển dụng để cứu đa vũ trụ. Anh phải hợp tác với một Wolverine miễn cưỡng để đối mặt với mối đe dọa chung đe dọa hủy diệt cả thực tại.',
    poster_path: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
    backdrop_path: 'https://image.tmdb.org/t/p/original/dvBCdCohwWbsP5qAaglOXagDMtk.jpg',
    release_date: new Date('2026-07-26'),
    genres: [
      { id: 28, name: 'Hành Động' },
      { id: 35, name: 'Hài' },
      { id: 878, name: 'Khoa Học Viễn Tưởng' },
    ],
    runtime: 128,
    vote_average: 7.9,
    vote_count: 6200,
    casts: [
      { name: 'Ryan Reynolds', character: 'Wade Wilson / Deadpool', profile_path: 'https://image.tmdb.org/t/p/w185/algQ1VEno2W9SesoArWcZTeF617.jpg' },
      { name: 'Hugh Jackman', character: 'Logan / Wolverine', profile_path: 'https://image.tmdb.org/t/p/w185/oX6GpKguHMl7FhRYnMeOaukrNsS.jpg' },
      { name: 'Emma Corrin', character: 'Cassandra Nova', profile_path: 'https://image.tmdb.org/t/p/w185/wqFq4xxJL4rxTg7ZQYyK8EZMTSR.jpg' },
      { name: 'Matthew Macfadyen', character: 'Paradox', profile_path: 'https://image.tmdb.org/t/p/w185/2FF3fay38uHyM6sGGnucZbGbUkq.jpg' },
    ],
    tagline: 'Cùng ngồi xuống và nói chuyện.',
    original_language: 'en',
    trailer_url: '73_1biulkYk',
  },
];

// ============================================================
// 3. CINEMAS DATA — ảnh thật từ online
// ============================================================

const cinemasData = [
  {
    name: 'CGV Vincom Center Bà Triệu',
    location: 'Hà Nội',
    address: 'Tầng 6, TTTM Vincom Center, 191 Bà Triệu, Hai Bà Trưng, Hà Nội',
    phone: '024 3974 3333',
    email: 'cgv.batrieu@cgv.vn',
    image: 'https://cdn.moveek.com/storage/media/cache/tall/6319506f5738a083830843.png',
    amenities: ['IMAX', 'Dolby Atmos', 'Snack Bar', 'Parking', 'Wi-Fi'],
  },
  {
    name: 'Lotte Cinema Landmark 81',
    location: 'TP. Hồ Chí Minh',
    address: 'Tầng 3, TTTM Vincom Center Landmark 81, 772 Điện Biên Phủ, Bình Thạnh, TP.HCM',
    phone: '028 3512 3456',
    email: 'lotte.landmark@lotte.vn',
    image: 'https://cdn.moveek.com/storage/media/cache/tall/5cb574aba6bff098127862.jpg',
    amenities: ['4DX', 'ScreenX', 'Premium Lounge', 'Parking', 'Food Court'],
  },
  {
    name: 'Galaxy Cinema Nguyễn Du',
    location: 'TP. Hồ Chí Minh',
    address: '116 Nguyễn Du, Quận 1, TP.HCM',
    phone: '028 7300 8881',
    email: 'galaxy.nguyendu@galaxycine.vn',
    image: 'https://cdn.moveek.com/storage/media/cache/tall/5c6b8dd4d072d098107393.png',
    amenities: ['Dolby Atmos', 'Snack Bar', 'Parking'],
  },
  {
    name: 'CGV Aeon Mall Long Biên',
    location: 'Hà Nội',
    address: 'Tầng 4, TTTM Aeon Mall, 27 Cổ Linh, Long Biên, Hà Nội',
    phone: '024 6275 5255',
    email: 'cgv.aeonlongbien@cgv.vn',
    image: 'https://cdn.moveek.com/storage/media/cache/tall/631950a0f1ede083830843.png',
    amenities: ['IMAX', '4DX', 'Starium', 'Snack Bar', 'Parking', 'Game Zone'],
  },
  {
    name: 'BHD Star Phạm Hùng',
    location: 'Hà Nội',
    address: 'Tầng 4, TTTM Vincom Mega Mall, Phạm Hùng, Nam Từ Liêm, Hà Nội',
    phone: '024 7308 7878',
    email: 'bhdstar.phamhung@bhdstar.vn',
    image: 'https://cdn.moveek.com/storage/media/cache/tall/5c6bcc913b3a2098107393.png',
    amenities: ['3D', 'Dolby Surround', 'Snack Bar', 'Parking', 'VIP Seats'],
  },
];

// ============================================================
// 4. ROOM LAYOUTS
// ============================================================

// Phòng nhỏ — 8 hàng x 10 ghế
const createSmallLayout = () => ({
  rows: 8,
  columns: 10,
  row_configs: [
    { row: 'A', type: 'regular', price_multiplier: 1.0 },
    { row: 'B', type: 'regular', price_multiplier: 1.0 },
    { row: 'C', type: 'regular', price_multiplier: 1.0 },
    { row: 'D', type: 'regular', price_multiplier: 1.0 },
    { row: 'E', type: 'vip', price_multiplier: 1.5 },
    { row: 'F', type: 'vip', price_multiplier: 1.5 },
    { row: 'G', type: 'couple', price_multiplier: 2.0 },
    { row: 'H', type: 'couple', price_multiplier: 2.0 },
  ],
});

// Phòng tiêu chuẩn — 10 hàng x 14 ghế
const createStandardLayout = () => ({
  rows: 10,
  columns: 14,
  row_configs: [
    { row: 'A', type: 'regular', price_multiplier: 1.0 },
    { row: 'B', type: 'regular', price_multiplier: 1.0 },
    { row: 'C', type: 'regular', price_multiplier: 1.0 },
    { row: 'D', type: 'regular', price_multiplier: 1.0 },
    { row: 'E', type: 'regular', price_multiplier: 1.0 },
    { row: 'F', type: 'vip', price_multiplier: 1.5 },
    { row: 'G', type: 'vip', price_multiplier: 1.5 },
    { row: 'H', type: 'vip', price_multiplier: 1.5 },
    { row: 'I', type: 'couple', price_multiplier: 2.0 },
    { row: 'J', type: 'couple', price_multiplier: 2.0 },
  ],
});

// Phòng lớn IMAX — 12 hàng x 18 ghế
const createIMAXLayout = () => ({
  rows: 12,
  columns: 18,
  row_configs: [
    { row: 'A', type: 'regular', price_multiplier: 1.0 },
    { row: 'B', type: 'regular', price_multiplier: 1.0 },
    { row: 'C', type: 'regular', price_multiplier: 1.0 },
    { row: 'D', type: 'regular', price_multiplier: 1.0 },
    { row: 'E', type: 'regular', price_multiplier: 1.0 },
    { row: 'F', type: 'vip', price_multiplier: 1.5 },
    { row: 'G', type: 'vip', price_multiplier: 1.5 },
    { row: 'H', type: 'vip', price_multiplier: 1.5 },
    { row: 'I', type: 'vip', price_multiplier: 1.5 },
    { row: 'J', type: 'couple', price_multiplier: 2.0 },
    { row: 'K', type: 'couple', price_multiplier: 2.0 },
    { row: 'L', type: 'couple', price_multiplier: 2.0 },
  ],
});

// Phòng 4DX nhỏ — 6 hàng x 8 ghế (ít hơn vì ghế 4DX to hơn)
const create4DXLayout = () => ({
  rows: 6,
  columns: 8,
  row_configs: [
    { row: 'A', type: 'regular', price_multiplier: 1.2 },
    { row: 'B', type: 'regular', price_multiplier: 1.2 },
    { row: 'C', type: 'vip', price_multiplier: 1.8 },
    { row: 'D', type: 'vip', price_multiplier: 1.8 },
    { row: 'E', type: 'vip', price_multiplier: 1.8 },
    { row: 'F', type: 'couple', price_multiplier: 2.5 },
  ],
});

// ============================================================
// SEED FUNCTION
// ============================================================

const seedDatabase = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Xóa data cũ
    console.log('🗑️  Clearing old data...');
    await Promise.all([
      User.deleteMany({}),
      Movie.deleteMany({}),
      Theater.deleteMany({}),
      Room.deleteMany({}),
      Show.deleteMany({}),
      Booking.deleteMany({}),
      Favorite.deleteMany({}),
    ]);

    // 2. Tạo Users
    console.log('👤 Creating users...');
    const users = await User.create(usersData);
    console.log(`   ✔ Created ${users.length} users`);

    // 3. Tạo Movies
    console.log('🎬 Creating movies...');
    const movies = await Movie.create(moviesData);
    console.log(`   ✔ Created ${movies.length} movies`);

    // 4. Tạo Theaters
    console.log('🏢 Creating theaters...');
    const cinemas = await Theater.create(cinemasData);
    console.log(`   ✔ Created ${cinemas.length} theaters`);

    // 5. Tạo Rooms — đa dạng cho mỗi rạp
    console.log('🚪 Creating rooms...');
    const roomDefinitions = [
      // CGV Bà Triệu: 3 phòng
      { cinemaIdx: 0, name: 'Phòng 1 — Standard', screen_type: '2D', layout: createStandardLayout() },
      { cinemaIdx: 0, name: 'Phòng 2 — IMAX', screen_type: 'IMAX', layout: createIMAXLayout() },
      { cinemaIdx: 0, name: 'Phòng 3 — 3D', screen_type: '3D', layout: createStandardLayout() },
      // Lotte Landmark 81: 3 phòng
      { cinemaIdx: 1, name: 'Phòng 1 — Standard', screen_type: '2D', layout: createStandardLayout() },
      { cinemaIdx: 1, name: 'Phòng 2 — 4DX', screen_type: '4DX', layout: create4DXLayout() },
      { cinemaIdx: 1, name: 'Phòng 3 — ScreenX', screen_type: '3D', layout: createStandardLayout() },
      // Galaxy Nguyễn Du: 2 phòng
      { cinemaIdx: 2, name: 'Phòng 1 — Standard', screen_type: '2D', layout: createStandardLayout() },
      { cinemaIdx: 2, name: 'Phòng 2 — Dolby', screen_type: '2D', layout: createSmallLayout() },
      // CGV Aeon Long Biên: 3 phòng
      { cinemaIdx: 3, name: 'Phòng 1 — IMAX', screen_type: 'IMAX', layout: createIMAXLayout() },
      { cinemaIdx: 3, name: 'Phòng 2 — 4DX', screen_type: '4DX', layout: create4DXLayout() },
      { cinemaIdx: 3, name: 'Phòng 3 — Standard', screen_type: '2D', layout: createStandardLayout() },
      // BHD Star Phạm Hùng: 2 phòng
      { cinemaIdx: 4, name: 'Phòng 1 — Standard', screen_type: '2D', layout: createStandardLayout() },
      { cinemaIdx: 4, name: 'Phòng 2 — 3D Premium', screen_type: '3D', layout: createSmallLayout() },
    ];

    const roomsToCreate = roomDefinitions.map((rd) => ({
      theater_id: cinemas[rd.cinemaIdx]._id,
      name: rd.name,
      screen_type: rd.screen_type,
      layout: rd.layout,
      status: 'active',
    }));

    const rooms = await Room.create(roomsToCreate);
    console.log(`   ✔ Created ${rooms.length} rooms`);

    // Tạo map cinema -> rooms để truy cập nhanh
    const cinemaRooms = {};
    for (const room of rooms) {
      const cid = room.theater_id.toString();
      if (!cinemaRooms[cid]) cinemaRooms[cid] = [];
      cinemaRooms[cid].push(room);
    }

    // 6. Tạo Shows — nhiều suất chiếu đa dạng
    console.log('📅 Creating shows...');
    const showsToCreate = [];
    const today = new Date();
    const baseDate = (dayOffset, hour, minute) =>
      new Date(today.getFullYear(), today.getMonth(), today.getDate() + dayOffset, hour, minute);

    // Giờ chiếu phổ biến
    const timeSlots = [
      { hour: 9, minute: 0 },
      { hour: 11, minute: 30 },
      { hour: 14, minute: 0 },
      { hour: 16, minute: 30 },
      { hour: 19, minute: 0 },
      { hour: 21, minute: 30 },
    ];

    // Giá cơ bản theo format
    const formatPrices = { '2D': 85000, '3D': 100000, 'IMAX': 130000, '4DX': 150000 };

    // Tạo shows cho 7 ngày tới, phân bổ phim vào các phòng
    for (let dayOffset = 0; dayOffset <= 6; dayOffset++) {
      for (const cinema of cinemas) {
        const cid = cinema._id.toString();
        const cRooms = cinemaRooms[cid] || [];

        for (const room of cRooms) {
          // Mỗi phòng chiếu 3-4 phim/ngày
          const movieCount = 3 + Math.floor(Math.random() * 2); // 3 or 4
          const shuffled = [...movies].sort(() => Math.random() - 0.5);
          const selectedMovies = shuffled.slice(0, movieCount);

          // Phân bổ giờ chiếu
          const availableSlots = [...timeSlots].sort(() => Math.random() - 0.5).slice(0, movieCount);
          availableSlots.sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));

          for (let i = 0; i < selectedMovies.length; i++) {
            const movie = selectedMovies[i];
            const slot = availableSlots[i];

            showsToCreate.push({
              movie: movie._id,
              cinema: cinema._id,
              room_id: room._id,
              showDateTime: baseDate(dayOffset, slot.hour, slot.minute),
              base_price: formatPrices[room.screen_type] || 85000,
              duration: movie.runtime,
              language: movie.original_language === 'vi' ? 'Vietnamese' :
                        movie.original_language === 'ko' ? 'Korean (Phụ đề Việt)' :
                        'English (Phụ đề Việt)',
              format: room.screen_type,
              reserved_seats: [],
              is_active: true,
            });
          }
        }
      }
    }

    const shows = await Show.create(showsToCreate);
    console.log(`   ✔ Created ${shows.length} shows`);

    // 7. Tạo Bookings mẫu — đa dạng hơn
    console.log('🎫 Creating sample bookings...');
    let bookingCount = 0;

    // Lấy một số shows hôm nay
    const todayShows = shows.filter((s) => {
      const showDate = new Date(s.showDateTime);
      return (
        showDate.getDate() === today.getDate() &&
        showDate.getMonth() === today.getMonth() &&
        showDate.getFullYear() === today.getFullYear()
      );
    });

    // Booking 1: User An đặt 2 vé VIP
    if (todayShows.length > 0) {
      const show1 = todayShows[0];
      const code1 = await generateUniqueBookingCode();
      await Show.findByIdAndUpdate(show1._id, {
        $addToSet: { booked_seats: { $each: ['F5', 'F6'] } },
      });
      await Booking.create({
        user: users[0]._id,
        show: show1._id,
        booking_code: code1,
        tickets: [
          { seat_id: 'F5', seat_type: 'vip', price: 135000 },
          { seat_id: 'F6', seat_type: 'vip', price: 135000 },
        ],
        total_amount: 270000,
        status: 'confirmed',
        payment_method: 'VNPAY',
        payment_status: 'paid',
      });
      bookingCount++;
    }

    // Booking 2: User Bình đặt 3 vé Regular
    if (todayShows.length > 1) {
      const show2 = todayShows[1];
      const code2 = await generateUniqueBookingCode();
      await Show.findByIdAndUpdate(show2._id, {
        $addToSet: { booked_seats: { $each: ['B3', 'B4', 'B5'] } },
      });
      await Booking.create({
        user: users[1]._id,
        show: show2._id,
        booking_code: code2,
        tickets: [
          { seat_id: 'B3', seat_type: 'regular', price: 85000 },
          { seat_id: 'B4', seat_type: 'regular', price: 85000 },
          { seat_id: 'B5', seat_type: 'regular', price: 85000 },
        ],
        total_amount: 255000,
        status: 'confirmed',
        payment_method: 'Momo',
        payment_status: 'paid',
      });
      bookingCount++;
    }

    // Booking 3: User Cường đặt 2 vé Couple
    if (todayShows.length > 2) {
      const show3 = todayShows[2];
      const code3 = await generateUniqueBookingCode();
      await Show.findByIdAndUpdate(show3._id, {
        $addToSet: { booked_seats: { $each: ['I7', 'I8'] } },
      });
      await Booking.create({
        user: users[2]._id,
        show: show3._id,
        booking_code: code3,
        tickets: [
          { seat_id: 'I7', seat_type: 'couple', price: 170000 },
          { seat_id: 'I8', seat_type: 'couple', price: 170000 },
        ],
        total_amount: 340000,
        status: 'confirmed',
        payment_method: 'ZaloPay',
        payment_status: 'paid',
      });
      bookingCount++;
    }

    // Booking 4: User Duyên đặt 1 vé VIP
    if (todayShows.length > 3) {
      const show4 = todayShows[3];
      const code4 = await generateUniqueBookingCode();
      await Show.findByIdAndUpdate(show4._id, {
        $addToSet: { booked_seats: { $each: ['G10'] } },
      });
      await Booking.create({
        user: users[3]._id,
        show: show4._id,
        booking_code: code4,
        tickets: [
          { seat_id: 'G10', seat_type: 'vip', price: 127500 },
        ],
        total_amount: 127500,
        status: 'confirmed',
        payment_method: 'VNPAY',
        payment_status: 'paid',
      });
      bookingCount++;
    }

    // Booking 5: User Đức đặt 4 vé Regular (đã cancelled)
    if (todayShows.length > 4) {
      const show5 = todayShows[4];
      const code5 = await generateUniqueBookingCode();
      await Booking.create({
        user: users[4]._id,
        show: show5._id,
        booking_code: code5,
        tickets: [
          { seat_id: 'A1', seat_type: 'regular', price: 85000 },
          { seat_id: 'A2', seat_type: 'regular', price: 85000 },
          { seat_id: 'A3', seat_type: 'regular', price: 85000 },
          { seat_id: 'A4', seat_type: 'regular', price: 85000 },
        ],
        total_amount: 340000,
        status: 'cancelled',
        payment_method: 'Momo',
        payment_status: 'failed',
        cancelled_at: new Date(),
      });
      bookingCount++;
    }

    // Booking 6: User Linh đặt 2 vé VIP (completed)
    if (todayShows.length > 5) {
      const show6 = todayShows[5];
      const code6 = await generateUniqueBookingCode();
      await Show.findByIdAndUpdate(show6._id, {
        $addToSet: { booked_seats: { $each: ['H3', 'H4'] } },
      });
      await Booking.create({
        user: users[5]._id,
        show: show6._id,
        booking_code: code6,
        tickets: [
          { seat_id: 'H3', seat_type: 'vip', price: 127500 },
          { seat_id: 'H4', seat_type: 'vip', price: 127500 },
        ],
        total_amount: 255000,
        status: 'completed',
        payment_method: 'ZaloPay',
        payment_status: 'paid',
      });
      bookingCount++;
    }

    console.log(`   ✔ Created ${bookingCount} bookings`);

    // 8. Tạo Favorites mẫu
    console.log('❤️  Creating favorites...');
    const favoritesData = [
      { user: users[0]._id, movie: movies[0]._id }, // An yêu thích Avengers
      { user: users[0]._id, movie: movies[5]._id }, // An yêu thích Interstellar
      { user: users[0]._id, movie: movies[2]._id }, // An yêu thích Dune
      { user: users[1]._id, movie: movies[1]._id }, // Bình yêu thích Lật Mặt
      { user: users[1]._id, movie: movies[6]._id }, // Bình yêu thích Mai
      { user: users[2]._id, movie: movies[7]._id }, // Cường yêu thích The Batman
      { user: users[2]._id, movie: movies[9]._id }, // Cường yêu thích Deadpool
      { user: users[3]._id, movie: movies[3]._id }, // Duyên yêu thích Oppenheimer
      { user: users[3]._id, movie: movies[8]._id }, // Duyên yêu thích Parasite
      { user: users[4]._id, movie: movies[4]._id }, // Đức yêu thích Spider-Verse
      { user: users[4]._id, movie: movies[0]._id }, // Đức yêu thích Avengers
      { user: users[5]._id, movie: movies[5]._id }, // Linh yêu thích Interstellar
      { user: users[5]._id, movie: movies[3]._id }, // Linh yêu thích Oppenheimer
      { user: users[5]._id, movie: movies[6]._id }, // Linh yêu thích Mai
    ];

    const favorites = await Favorite.create(favoritesData);
    console.log(`   ✔ Created ${favorites.length} favorites`);

    // ====== SUMMARY ======
    console.log('\n🎉 ═══════════════════════════════════════════');
    console.log('   SEED HOÀN THÀNH THÀNH CÔNG!');
    console.log('═══════════════════════════════════════════════');
    console.log(`  👤 Users:      ${users.length}`);
    console.log(`  🎬 Movies:     ${movies.length}`);
    console.log(`  🏢 Theaters:   ${cinemas.length}`);
    console.log(`  🚪 Rooms:      ${rooms.length}`);
    console.log(`  📅 Shows:      ${shows.length}`);
    console.log(`  🎫 Bookings:   ${bookingCount}`);
    console.log(`  ❤️  Favorites:  ${favorites.length}`);
    console.log('═══════════════════════════════════════════════');
    console.log('\n📧 Tài khoản test:');
    console.log('  ─────────────────────────────────────────');
    console.log('  User 1: an.nguyen@example.com / password123');
    console.log('  User 2: binh.tran@example.com / password123');
    console.log('  User 3: cuong.le@example.com / password123');
    console.log('  User 4: duyen.pham@example.com / password123');
    console.log('  User 5: duc.vo@example.com / password123');
    console.log('  User 6: linh.hoang@example.com / password123');
    console.log('  Admin:  admin@cinemax.vn / admin123');
    console.log('  Admin:  manager@cgv.vn / admin123');
    console.log('  ─────────────────────────────────────────');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seedDatabase();
