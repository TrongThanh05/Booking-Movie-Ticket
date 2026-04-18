# Movie Booking Backend

Backend API cho ứng dụng đặt vé xem phim sử dụng Node.js, Express, và MongoDB.

## 🚀 Setup & Installation

### 1. **Cài đặt Dependencies**

```bash
cd backend
npm install
```

### 2. **Cài đặt MongoDB**

**Option A: MongoDB Local (Windows)**

- Tải và cài [MongoDB Community Edition](https://www.mongodb.com/try/download/community)
- Sau cài đặt, MongoDB service sẽ tự chạy mặc định

**Option B: MongoDB Atlas (Cloud)**

- Tạo tài khoản tại [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Tạo một cluster miễn phí
- Lấy connection string và cập nhật trong file `.env`

```bash
# Ví dụ MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster0.mongodb.net/movie-booking
```

### 3. **Tạo file .env**

Copy file `.env.example` thành `.env`:

```bash
cp .env.example .env
```

Cập nhật các giá trị nếu cần thiết (port, JWT secret, v.v.)

### 4. **Seed Database với dữ liệu mẫu**

```bash
npm run seed
```

Điều này sẽ thêm:

- 6 bộ phim
- 4 rạp chiếu
- ~168 suất chiếu
- 3 tài khoản user mẫu

### 5. **Chạy Server**

**Development (với auto-reload):**

```bash
npm run dev
```

**Production:**

```bash
npm start
```

Server sẽ chạy tại: `http://localhost:5000`

## 📚 API Endpoints

### Phim (Movies)

```
GET  /api/movies           # Lấy tất cả phim
GET  /api/movies/:id       # Lấy chi tiết phim
POST /api/movies           # Thêm phim (admin)
PUT  /api/movies/:id       # Cập nhật phim (admin)
DELETE /api/movies/:id     # Xóa phim (admin)
```

### Rạp Chiếu (Theaters)

```
GET  /api/theaters         # Lấy tất cả rạp
GET  /api/theaters/:id     # Lấy chi tiết rạp
POST /api/theaters         # Thêm rạp (admin)
PUT  /api/theaters/:id     # Cập nhật rạp (admin)
DELETE /api/theaters/:id   # Xóa rạp (admin)
```

### Suất Chiếu (Shows)

```
GET  /api/shows            # Lấy tất cả suất chiếu
GET  /api/shows/:id        # Lấy chi tiết suất chiếu
GET  /api/shows/by-date/:date  # Lấy suất chiếu theo ngày
POST /api/shows            # Thêm suất chiếu (admin)
PUT  /api/shows/:id        # Cập nhật suất chiếu (admin)
DELETE /api/shows/:id      # Xóa suất chiếu (admin)
```

### Người dùng (Users)

```
POST /api/users/register   # Đăng ký tài khoản mới
POST /api/users/login      # Đăng nhập
GET  /api/users/profile/:id # Lấy hồ sơ người dùng
PUT  /api/users/:id        # Cập nhật hồ sơ
```

### Đặt vé (Bookings)

```
GET  /api/bookings/user/:userId    # Lấy đặt vé của user
GET  /api/bookings/:id             # Lấy chi tiết đặt vé
POST /api/bookings                 # Tạo đặt vé mới
PUT  /api/bookings/:id/cancel      # Hủy đặt vé
PUT  /api/bookings/:id/pay         # Đánh dấu đã thanh toán
```

### Yêu thích (Favorites)

```
GET  /api/favorites/user/:userId   # Lấy danh sách yêu thích
POST /api/favorites                # Thêm vào yêu thích
DELETE /api/favorites/:id          # Xóa khỏi yêu thích
```

## 💾 Dữ liệu mẫu Seed

**Tài khoản mẫu:**

```
Email: user@example.com
Password: password123

Email: admin@example.com
Password: admin123
```

## 🔄 Kết nối với Frontend React

Cập nhật `src/lib/api.js` hoặc tạo file mới với axios client:

```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Movies
export const getMovies = () => api.get('/movies');
export const getMovieById = (id) => api.get(`/movies/${id}`);

// Shows
export const getShows = () => api.get('/shows');
export const getShowsByDate = (date) => api.get(`/shows/by-date/${date}`);

// Bookings
export const getUserBookings = (userId) => api.get(`/bookings/user/${userId}`);
export const createBooking = (bookingData) =>
  api.post('/bookings', bookingData);
export const cancelBooking = (bookingId) =>
  api.put(`/bookings/${bookingId}/cancel`);

// Theaters
export const getTheaters = () => api.get('/theaters');

// Users
export const registerUser = (userData) => api.post('/users/register', userData);
export const loginUser = (loginData) => api.post('/users/login', loginData);

// Favorites
export const getUserFavorites = (userId) =>
  api.get(`/favorites/user/${userId}`);
export const addFavorite = (favoriteData) =>
  api.post('/favorites', favoriteData);

export default api;
```

## 🔧 Cấu hình CORS

Backend đã được cấu hình để chấp nhận requests từ `http://localhost:5173` (Vite dev server).

Nếu frontend chạy ở port khác, cập nhật `server.js`:

```javascript
app.use(
  cors({
    origin: 'http://localhost:YOUR_PORT',
    credentials: true,
  }),
);
```

## 📝 Cấu trúc Folder

```
backend/
├── config/
│   └── db.js              # MongoDB connection
├── models/
│   ├── Movie.js           # Movie schema
│   ├── Theater.js         # Theater schema
│   ├── Show.js            # Show schema
│   ├── User.js            # User schema
│   ├── Booking.js         # Booking schema
│   └── Favorite.js        # Favorite schema
├── routes/
│   ├── movies.js          # Movie routes
│   ├── theaters.js        # Theater routes
│   ├── shows.js           # Show routes
│   ├── users.js           # User/Auth routes
│   ├── bookings.js        # Booking routes
│   └── favorites.js       # Favorite routes
├── middleware/
│   └── auth.js            # JWT authentication
├── scripts/
│   └── seedData.js        # Database seeding
├── server.js              # Main server file
├── package.json           # Dependencies
├── .env                   # Environment variables
└── .env.example           # Example env file
```

## 🐛 Troubleshooting

### MongoDB không kết nối?

1. Kiểm tra MongoDB service đang chạy
2. Kiểm tra `MONGODB_URI` trong `.env`
3. Test connection: `mongosh` (terminal)

### Port 5000 đã được sử dụng?

Cập nhật `PORT` trong `.env`:

```
PORT=5001
```

### CORS Error?

Đảm bảo `CLIENT_URL` trong `.env` khớp với URL frontend
Hoặc cập nhật CORS config trong `server.js`

## 📚 Công nghệ sử dụng

- **Express** - Web framework
- **Mongoose** - MongoDB ODM
- **dotenv** - Environment variables
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **CORS** - Cross-origin requests
- **Nodemon** - Auto-reload (dev)

## 🚀 Deployment

### Heroku

1. Tạo account trên [Heroku](https://heroku.com)
2. Install Heroku CLI
3. Deploy:

```bash
heroku create your-app-name
git push heroku main
```

### MongoDB Atlas

- Khuyến cáo sử dụng MongoDB Atlas cho production
- Connection string: `mongodb+srv://...`

## 📞 Support

Nếu gặp vấn đề, check:

1. Terminal output cho lỗi
2. Browser console (frontend)
3. MongoDB logs
