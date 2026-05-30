/**
 * Script cập nhật trailer_url và dàn diễn viên (casts) cho tất cả phim
 * Chạy: node scripts/updateMovieCastAndTrailer.js
 *
 * Script này sẽ:
 * 1. Cập nhật trailer_url (YouTube video ID) cho tất cả phim
 * 2. Cập nhật casts với ít nhất 5 diễn viên chính mỗi phim
 * 3. Sửa profile_path dùng URL chính xác từ TMDB (https://image.tmdb.org/t/p/w185/...)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Movie from '../models/Movie.js';

dotenv.config();

const MONGO_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/movie-booking';

// ============================================================
// DỮ LIỆU CẬP NHẬT — tên phim khớp chính xác với DB hiện tại
// ============================================================

const movieUpdates = [
  {
    title: 'Avengers: Doomsday',
    trailer_url: 'P51FkMiHV1c',
    casts: [
      { name: 'Robert Downey Jr.', character: 'Doctor Doom', profile_path: 'https://image.tmdb.org/t/p/w185/im9SAqJp0P0p77k727Y9742e47k.jpg' },
      { name: 'Chris Evans', character: 'Steve Rogers / Captain America', profile_path: 'https://image.tmdb.org/t/p/w185/3bOGNsHlrswhyW79uvIHH1V43JI.jpg' },
      { name: 'Chris Hemsworth', character: 'Thor', profile_path: 'https://image.tmdb.org/t/p/w185/jpurJ9jAcLCYjgHHfYF32m3zJYm.jpg' },
      { name: 'Scarlett Johansson', character: 'Black Widow', profile_path: 'https://image.tmdb.org/t/p/w185/6NsMbJXRlDZuDzatN2akFY8SYkq.jpg' },
      { name: 'Mark Ruffalo', character: 'Bruce Banner / Hulk', profile_path: 'https://image.tmdb.org/t/p/w185/z3dvKqMNDQWMCh6IpkmFnbMOPnG.jpg' },
      { name: 'Tom Holland', character: 'Peter Parker / Spider-Man', profile_path: 'https://image.tmdb.org/t/p/w185/bBRlrpJm9XkNSg0YT5LCaxqoFMX.jpg' },
      { name: 'Benedict Cumberbatch', character: 'Doctor Strange', profile_path: 'https://image.tmdb.org/t/p/w185/fBEucxECxGLKVHBznO0qHtCGiMO.jpg' },
    ],
  },
  {
    title: 'Lật Mặt 8: Vòng Tay Nắng',
    trailer_url: 'kB84PxJv3Gk',
    casts: [
      { name: 'Lý Hải', character: 'Người cha', profile_path: 'https://image.tmdb.org/t/p/w185/7SfSJqR39bbrOqIiOD4sgczPGHd.jpg' },
      { name: 'Trấn Thành', character: 'Người con trai', profile_path: 'https://image.tmdb.org/t/p/w185/igcebMSrlhtGlqJMBCHq6KRfoNE.jpg' },
      { name: 'Kiều Minh Tuấn', character: 'Người con rể', profile_path: 'https://image.tmdb.org/t/p/w185/mMaF2DwiAdPBGYHgWCOSW8llLO9.jpg' },
      { name: 'Ốc Thanh Vân', character: 'Người mẹ', profile_path: 'https://image.tmdb.org/t/p/w185/vE49LWkL0YOJY0lDHWEGcKK9Jzz.jpg' },
      { name: 'Huỳnh Đông', character: 'Người con trai thứ hai', profile_path: 'https://image.tmdb.org/t/p/w185/qNYyeLfHnqaRCgKJ8FBt4Nm4iap.jpg' },
      { name: 'Quách Ngọc Tuyên', character: 'Người hàng xóm', profile_path: 'https://image.tmdb.org/t/p/w185/7k2IGZA2R5TaTOVJaJgOGOZu2cS.jpg' },
    ],
  },
  {
    title: 'Inception 2: Dreamscape',
    trailer_url: 'YoHD9XEInc0',
    casts: [
      { name: 'Leonardo DiCaprio', character: 'Dom Cobb', profile_path: 'https://image.tmdb.org/t/p/w185/wo2hJpn04vbtmh0B9utCFdsQhxM.jpg' },
      { name: 'Tom Hardy', character: 'Eames', profile_path: 'https://image.tmdb.org/t/p/w185/d81K0RH8UX7tZj49tZaQhZ9ewH.jpg' },
      { name: 'Joseph Gordon-Levitt', character: 'Arthur', profile_path: 'https://image.tmdb.org/t/p/w185/zvSMEFxiJGBl7QUYbMfH9tNaR12.jpg' },
      { name: 'Elliot Page', character: 'Ariadne', profile_path: 'https://image.tmdb.org/t/p/w185/lg2rN23QR8Dkvoi1rNqI8BWhJRb.jpg' },
      { name: 'Ken Watanabe', character: 'Saito', profile_path: 'https://image.tmdb.org/t/p/w185/psAXOYp9SBOXvg6AXzARDedNQ9P.jpg' },
      { name: 'Cillian Murphy', character: 'Robert Fischer', profile_path: 'https://image.tmdb.org/t/p/w185/dm6V24NjjvjMiCtbMkc8Y0q9eEo.jpg' },
    ],
  },
  {
    title: 'Mai',
    trailer_url: 'SdHnOdDWVxM',
    casts: [
      { name: 'Phương Anh Đào', character: 'Mai', profile_path: 'https://image.tmdb.org/t/p/w185/qvnFOwgkpOPIH1fLzIgbBFgYKBR.jpg' },
      { name: 'Tuấn Trần', character: 'Dương', profile_path: 'https://image.tmdb.org/t/p/w185/cVfYkiMljmkGKrtaGBXuAsIhRlp.jpg' },
      { name: 'Trấn Thành', character: 'Đạo diễn kiêm diễn viên', profile_path: 'https://image.tmdb.org/t/p/w185/igcebMSrlhtGlqJMBCHq6KRfoNE.jpg' },
      { name: 'NSƯT Hồng Đào', character: 'Bà Hai (mẹ Mai)', profile_path: 'https://image.tmdb.org/t/p/w185/3V5kmJjPVfTrKzY4Xqt5fhG6Rsn.jpg' },
      { name: 'Ngọc Giàu', character: 'Bà ngoại Dương', profile_path: 'https://image.tmdb.org/t/p/w185/oNIXvIjQ5GcoF2d3wYS2vI5L3Pa.jpg' },
      { name: 'Uyển Ân', character: 'Đào (bạn Mai)', profile_path: 'https://image.tmdb.org/t/p/w185/iWdOZ3xlBikXcQFycvHT4hwpFX2.jpg' },
    ],
  },
  {
    title: 'Dune: Hành Tinh Cát - Phần 2',
    trailer_url: 'Way9Dexny3w',
    casts: [
      { name: 'Timothée Chalamet', character: 'Paul Atreides', profile_path: 'https://image.tmdb.org/t/p/w185/BE2sdjpgsa2rNTFa66f7upkaOP.jpg' },
      { name: 'Zendaya', character: 'Chani', profile_path: 'https://image.tmdb.org/t/p/w185/r3A7ev7QkjOGocVn3kQrJ0eOouk.jpg' },
      { name: 'Austin Butler', character: 'Feyd-Rautha Harkonnen', profile_path: 'https://image.tmdb.org/t/p/w185/ueXDpXBbsMgFNqXY9xeNqRqhoGJ.jpg' },
      { name: 'Florence Pugh', character: 'Princess Irulan', profile_path: 'https://image.tmdb.org/t/p/w185/fhEsn35uAwUbuKsNfji5vJGbLCl.jpg' },
      { name: 'Josh Brolin', character: 'Gurney Halleck', profile_path: 'https://image.tmdb.org/t/p/w185/sX2aySeDqMYneFiE5JiULXfpzMl.jpg' },
      { name: 'Javier Bardem', character: 'Stilgar', profile_path: 'https://image.tmdb.org/t/p/w185/IShnFg1PPhCPx5kEQYLcwUvOFn.jpg' },
      { name: 'Rebecca Ferguson', character: 'Lady Jessica', profile_path: 'https://image.tmdb.org/t/p/w185/lJloTOheuQSirSLXjfKgNqbmPOK.jpg' },
    ],
  },
  {
    title: 'Quật Mộ Trùng Ma',
    trailer_url: 'kIRqMsY0PJE',
    casts: [
      { name: 'Quang Tuấn', character: 'Nhân vật chính', profile_path: 'https://image.tmdb.org/t/p/w185/uo0uGrxg3bom8cK2WJv2p5aGwq1.jpg' },
      { name: 'Thanh Mỹ', character: 'Cô gái bí ẩn', profile_path: 'https://image.tmdb.org/t/p/w185/9YoSaCJ5TH7c5JoKQA5tLqKaCAH.jpg' },
      { name: 'Lâm Thanh Mỹ', character: 'Bé gái', profile_path: 'https://image.tmdb.org/t/p/w185/bgWfLWxtG3JzxhNmVMZv6RlTdfz.jpg' },
      { name: 'Đinh Y Nhung', character: 'Người phụ nữ', profile_path: 'https://image.tmdb.org/t/p/w185/fhYXSthMr1hkZGKAZdS91S8WVKZ.jpg' },
      { name: 'Nguyễn Đình Toàn', character: 'Thầy phong thủy', profile_path: 'https://image.tmdb.org/t/p/w185/v9e0aRSA4ql4VJhIfFDrmIPq3J6.jpg' },
    ],
  },
  {
    title: 'Kung Fu Panda 4',
    trailer_url: '_inKs4eeHiI',
    casts: [
      { name: 'Jack Black', character: 'Po (voice)', profile_path: 'https://image.tmdb.org/t/p/w185/rtCx0fiYxJVhzXXdwZE2XRTfIKE.jpg' },
      { name: 'Awkwafina', character: 'Zhen (voice)', profile_path: 'https://image.tmdb.org/t/p/w185/l1mU3JfOKCzCN6gfJbRJpIBbyeo.jpg' },
      { name: 'Viola Davis', character: 'The Chameleon (voice)', profile_path: 'https://image.tmdb.org/t/p/w185/xDssAPoU2yRbQcEkRYIIkGp0VEo.jpg' },
      { name: 'Dustin Hoffman', character: 'Shifu (voice)', profile_path: 'https://image.tmdb.org/t/p/w185/yFGkSU6JHKyYFMFQ6GnixdmYgmS.jpg' },
      { name: 'Bryan Cranston', character: 'Li Shan (voice)', profile_path: 'https://image.tmdb.org/t/p/w185/7Jahy5LZX2Fo8fGJltMreAI49hC.jpg' },
      { name: 'James Hong', character: 'Mr. Ping (voice)', profile_path: 'https://image.tmdb.org/t/p/w185/yDgz1xNck1Ky5p2mDEYVHbdJQ6z.jpg' },
    ],
  },
  {
    title: 'Lật Mặt 7: Một Điều Ước',
    trailer_url: 'JfVOs4VSpmA',
    casts: [
      { name: 'Lý Hải', character: 'Người cha', profile_path: 'https://image.tmdb.org/t/p/w185/7SfSJqR39bbrOqIiOD4sgczPGHd.jpg' },
      { name: 'Trấn Thành', character: 'Người con trai', profile_path: 'https://image.tmdb.org/t/p/w185/igcebMSrlhtGlqJMBCHq6KRfoNE.jpg' },
      { name: 'Kiều Minh Tuấn', character: 'Người con rể', profile_path: 'https://image.tmdb.org/t/p/w185/mMaF2DwiAdPBGYHgWCOSW8llLO9.jpg' },
      { name: 'Ốc Thanh Vân', character: 'Người mẹ', profile_path: 'https://image.tmdb.org/t/p/w185/vE49LWkL0YOJY0lDHWEGcKK9Jzz.jpg' },
      { name: 'Huỳnh Đông', character: 'Người con trai thứ hai', profile_path: 'https://image.tmdb.org/t/p/w185/qNYyeLfHnqaRCgKJ8FBt4Nm4iap.jpg' },
      { name: 'Quách Ngọc Tuyên', character: 'Người hàng xóm', profile_path: 'https://image.tmdb.org/t/p/w185/7k2IGZA2R5TaTOVJaJgOGOZu2cS.jpg' },
    ],
  },
  {
    title: 'Godzilla x Kong: Đế Chế Mới',
    trailer_url: 'lV1OOlGwExM',
    casts: [
      { name: 'Rebecca Hall', character: 'Dr. Ilene Andrews', profile_path: 'https://image.tmdb.org/t/p/w185/lnzLj0u0pHFzpU5oJVmjyXEywGV.jpg' },
      { name: 'Brian Tyree Henry', character: 'Bernie Hayes', profile_path: 'https://image.tmdb.org/t/p/w185/2bBMVfMJDiC3XjiDfTmbjpoAmgE.jpg' },
      { name: 'Dan Stevens', character: 'Trapper', profile_path: 'https://image.tmdb.org/t/p/w185/7GBVSJnE7gMJvTav7TlN3qUfppq.jpg' },
      { name: 'Kaylee Hottle', character: 'Jia', profile_path: 'https://image.tmdb.org/t/p/w185/mLU6s9eMoQhMQ0Bf0hf3YkZKnb6.jpg' },
      { name: 'Fala Chen', character: 'Iwi Queen', profile_path: 'https://image.tmdb.org/t/p/w185/1mzJX3G2LMKDj3M7SkZ46fV1jPb.jpg' },
    ],
  },
  {
    title: 'Những Mảnh Ghép Cảm Xúc 2 (Inside Out 2)',
    trailer_url: 'LEjhY15eCx0',
    casts: [
      { name: 'Amy Poehler', character: 'Joy (voice)', profile_path: 'https://image.tmdb.org/t/p/w185/rwmvRonpluV6dCPiQissYpA4nf7.jpg' },
      { name: 'Maya Hawke', character: 'Anxiety (voice)', profile_path: 'https://image.tmdb.org/t/p/w185/t0YqL1z17sRdI5XumLCQLozu7V9.jpg' },
      { name: 'Kensington Tallman', character: 'Riley (voice)', profile_path: 'https://image.tmdb.org/t/p/w185/dSeaVYzkAMzo2VK1VmGy3l3mUCA.jpg' },
      { name: 'Phyllis Smith', character: 'Sadness (voice)', profile_path: 'https://image.tmdb.org/t/p/w185/1amFOaOQJtPMsQxDNf8MNxibiwr.jpg' },
      { name: 'Lewis Black', character: 'Anger (voice)', profile_path: 'https://image.tmdb.org/t/p/w185/fadk5UcNhGatJmIv1puvcoaXRps.jpg' },
      { name: 'Tony Hale', character: 'Fear (voice)', profile_path: 'https://image.tmdb.org/t/p/w185/ar4uqMFH8SdmDnbRYrMmGH2K8Zo.jpg' },
      { name: 'Liza Lapira', character: 'Disgust (voice)', profile_path: 'https://image.tmdb.org/t/p/w185/6BQEP0jXedjdIuKhPMJvOs3kLjb.jpg' },
    ],
  },
  {
    title: 'Oppenheimer',
    trailer_url: 'uYPbbksJxIg',
    casts: [
      { name: 'Cillian Murphy', character: 'J. Robert Oppenheimer', profile_path: 'https://image.tmdb.org/t/p/w185/dm6V24NjjvjMiCtbMkc8Y0q9eEo.jpg' },
      { name: 'Emily Blunt', character: 'Kitty Oppenheimer', profile_path: 'https://image.tmdb.org/t/p/w185/nPJXaFBMfVmVAI52aOBJCfSTcmi.jpg' },
      { name: 'Robert Downey Jr.', character: 'Lewis Strauss', profile_path: 'https://image.tmdb.org/t/p/w185/im9SAqJp0P0p77k727Y9742e47k.jpg' },
      { name: 'Matt Damon', character: 'Leslie Groves', profile_path: 'https://image.tmdb.org/t/p/w185/ehyBkODMt0QLFhi9UAjUDzIEJUH.jpg' },
      { name: 'Florence Pugh', character: 'Jean Tatlock', profile_path: 'https://image.tmdb.org/t/p/w185/fhEsn35uAwUbuKsNfji5vJGbLCl.jpg' },
      { name: 'Josh Hartnett', character: 'Ernest Lawrence', profile_path: 'https://image.tmdb.org/t/p/w185/lG4ATBQn9hJJJuGmHOLCh4hJqTo.jpg' },
      { name: 'Rami Malek', character: 'David Hill', profile_path: 'https://image.tmdb.org/t/p/w185/eOh4ubpOm2Igdg0QH2ghj0mFtC.jpg' },
    ],
  },
  {
    title: 'Ký Sinh Trùng (Parasite)',
    trailer_url: '5xH0HfJHsaY',
    casts: [
      { name: 'Song Kang-ho', character: 'Kim Ki-taek', profile_path: 'https://image.tmdb.org/t/p/w185/nIJIrr1z1B0FPU6xNq0nnVliYfG.jpg' },
      { name: 'Lee Sun-kyun', character: 'Park Dong-ik', profile_path: 'https://image.tmdb.org/t/p/w185/osjCh66KTFeywRgn3MVXGOT1PQR.jpg' },
      { name: 'Cho Yeo-jeong', character: 'Choi Yeon-gyo', profile_path: 'https://image.tmdb.org/t/p/w185/pIS0rX1FT6bVOD1pGdSFmqdG8wD.jpg' },
      { name: 'Choi Woo-shik', character: 'Kim Ki-woo', profile_path: 'https://image.tmdb.org/t/p/w185/bP07GWciP5CUxkWt3vYzqGdW3t7.jpg' },
      { name: 'Park So-dam', character: 'Kim Ki-jung', profile_path: 'https://image.tmdb.org/t/p/w185/hUDZVrq9IcBLSuBqPDhBVPRf8sG.jpg' },
      { name: 'Jang Hye-jin', character: 'Chung-sook', profile_path: 'https://image.tmdb.org/t/p/w185/nZoUvCKSKEjMO28dV5rJNOOJ8OK.jpg' },
      { name: 'Lee Jung-eun', character: 'Moon-gwang', profile_path: 'https://image.tmdb.org/t/p/w185/4kqv0Z2rKX89sL5dKlbdkAdxaRp.jpg' },
    ],
  },
  {
    title: 'Mắt Biếc',
    trailer_url: 'FJn2wS1F9aM',
    casts: [
      { name: 'Trần Nghĩa', character: 'Ngạn (trưởng thành)', profile_path: 'https://image.tmdb.org/t/p/w185/aB1e6Hg5aNjqOHKPjsH2YagMVgF.jpg' },
      { name: 'Trúc Anh', character: 'Hà Lan (trưởng thành)', profile_path: 'https://image.tmdb.org/t/p/w185/xaAob8IOSLbIExeHJP7lBZNnNEP.jpg' },
      { name: 'Khánh Vân', character: 'Trà Long', profile_path: 'https://image.tmdb.org/t/p/w185/bC7fwib4MqYpYYYjp2kf7O87G2H.jpg' },
      { name: 'Bảo Hân', character: 'Hà Lan (nhỏ)', profile_path: 'https://image.tmdb.org/t/p/w185/hXVUr6YQigAYHMiDOPIJXlPNbGE.jpg' },
      { name: 'Trần Phong', character: 'Dũng', profile_path: 'https://image.tmdb.org/t/p/w185/kUcFnRScGLGZKhmkjmEcNxGIz62.jpg' },
    ],
  },
];

// ============================================================
// MIGRATION FUNCTION
// ============================================================

const updateMovies = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    let updatedCount = 0;
    let notFoundCount = 0;

    for (const update of movieUpdates) {
      const result = await Movie.findOneAndUpdate(
        { title: update.title },
        {
          $set: {
            trailer_url: update.trailer_url,
            casts: update.casts,
          },
        },
        { new: true },
      );

      if (result) {
        console.log(`  ✔ Updated "${result.title}" — ${update.casts.length} diễn viên, trailer: ${update.trailer_url}`);
        updatedCount++;
      } else {
        console.log(`  ⚠ Không tìm thấy phim: "${update.title}"`);
        notFoundCount++;
      }
    }

    console.log('\n🎉 ═══════════════════════════════════════════');
    console.log('   CẬP NHẬT HOÀN TẤT!');
    console.log('═══════════════════════════════════════════════');
    console.log(`  ✅ Đã cập nhật: ${updatedCount} phim`);
    if (notFoundCount > 0) {
      console.log(`  ⚠️  Không tìm thấy: ${notFoundCount} phim`);
    }
    console.log('═══════════════════════════════════════════════');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

updateMovies();
