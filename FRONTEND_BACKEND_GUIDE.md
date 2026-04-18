# 🎬 Hướng dẫn Kết nối Frontend-Backend

## ⚡ Quick Start (5 bước)

### 1️⃣ Cài đặt MongoDB (Windows)

#### Cách A: MongoDB Local (Recommended for development)

1. **Tải MongoDB Community Edition**
   - Truy cập: https://www.mongodb.com/try/download/community
   - Chọn Windows, Download MSI installer

2. **Cài đặt**
   - Chạy installer, chọn "Install MongoDB as a Service"
   - MongoDB sẽ tự động chạy dưới dạng service

3. **Kiểm tra kết nối**
   - Mở PowerShell hoặc Command Prompt
   - Chạy: `mongosh` (sau khi cài đặt MongoDB)
   - Sẽ thấy shell kết nối thành công

#### Cách B: MongoDB Atlas (Cloud - Không cần cài đặt)

1. Truy cập: https://www.mongodb.com/cloud/atlas
2. Tạo account miễn phí
3. Tạo cluster (chọn "Free" tier)
4. Lấy connection string thay vào `.env`
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/movie-booking
   ```

### 2️⃣ Chạy Backend Server

```bash
# Di chuyển vào thư mục backend
cd backend

# Cài đặt dependencies (chỉ cần làm lần đầu)
npm install

# Seed database với dữ liệu mẫu
npm run seed

# Chạy server (development mode)
npm run dev
```

✅ Nếu thấy: `🚀 Server running on http://localhost:5000` → Backend sẵn sàng!

### 3️⃣ Tạo API Service cho Frontend

**Tạo file: `src/lib/api.js`**

```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Tạo instance axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ========== MOVIES ==========
export const getMovies = () => api.get('/movies');
export const getMovieById = (id) => api.get(`/movies/${id}`);
export const createMovie = (movieData) => api.post('/movies', movieData);
export const updateMovie = (id, movieData) =>
  api.put(`/movies/${id}`, movieData);
export const deleteMovie = (id) => api.delete(`/movies/${id}`);

// ========== THEATERS ==========
export const getTheaters = () => api.get('/theaters');
export const getTheaterById = (id) => api.get(`/theaters/${id}`);
export const createTheater = (theaterData) =>
  api.post('/theaters', theaterData);
export const updateTheater = (id, theaterData) =>
  api.put(`/theaters/${id}`, theaterData);
export const deleteTheater = (id) => api.delete(`/theaters/${id}`);

// ========== SHOWS ==========
export const getShows = () => api.get('/shows');
export const getShowsByDate = (date) => api.get(`/shows/by-date/${date}`);
export const getShowById = (id) => api.get(`/shows/${id}`);
export const createShow = (showData) => api.post('/shows', showData);
export const updateShow = (id, showData) => api.put(`/shows/${id}`, showData);
export const deleteShow = (id) => api.delete(`/shows/${id}`);

// ========== USERS & AUTH ==========
export const registerUser = (userData) => api.post('/users/register', userData);
export const loginUser = (loginData) => api.post('/users/login', loginData);
export const getUserProfile = (userId) => api.get(`/users/profile/${userId}`);
export const updateUser = (userId, userData) =>
  api.put(`/users/${userId}`, userData);

// ========== BOOKINGS ==========
export const getUserBookings = (userId) => api.get(`/bookings/user/${userId}`);
export const getBookingById = (bookingId) => api.get(`/bookings/${bookingId}`);
export const createBooking = (bookingData) =>
  api.post('/bookings', bookingData);
export const cancelBooking = (bookingId) =>
  api.put(`/bookings/${bookingId}/cancel`);
export const payBooking = (bookingId, paymentMethod) =>
  api.put(`/bookings/${bookingId}/pay`, { paymentMethod });

// ========== FAVORITES ==========
export const getUserFavorites = (userId) =>
  api.get(`/favorites/user/${userId}`);
export const addFavorite = (favoriteData) =>
  api.post('/favorites', favoriteData);
export const removeFavorite = (favoriteId) =>
  api.delete(`/favorites/${favoriteId}`);

export default api;
```

### 4️⃣ Cập nhật Components để sử dụng API

**Ví dụ: Movies.jsx**

```jsx
import { useEffect, useState } from 'react';
import { getMovies } from '../lib/api'; // Import API

const Movies = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const response = await getMovies();
        setMovies(response.data);
      } catch (error) {
        console.error('Error fetching movies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  // ... rest of component
};
```

**Ví dụ: MovieDetail.jsx (lấy data từ API)**

```jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getMovieById, getShowsByDate } from '../lib/api';

const MovieDetail = () => {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [shows, setShows] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    fetchMovie();
    fetchShows();
  }, [id, selectedDate]);

  const fetchMovie = async () => {
    try {
      const response = await getMovieById(id);
      setMovie(response.data);
    } catch (error) {
      console.error('Error fetching movie:', error);
    }
  };

  const fetchShows = async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await getShowsByDate(dateStr);
      setShows(response.data);
    } catch (error) {
      console.error('Error fetching shows:', error);
    }
  };

  // ... rest of component
};
```

**Ví dụ: SeatLayout.jsx (tạo booking)**

```jsx
import { createBooking } from '../lib/api';

const SeatLayout = () => {
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleConfirmBooking = async () => {
    try {
      setLoading(true);

      const bookingData = {
        userId: currentUser.id, // Lấy từ login
        showId: showId,
        bookedSeats: selectedSeats,
      };

      const response = await createBooking(bookingData);

      if (response.data) {
        // Thanh toán thành công
        alert('Đặt vé thành công! Booking Code: ' + response.data.bookingCode);
        navigate('/my-booking');
      }
    } catch (error) {
      alert('Error: ' + error.response.data.message);
    } finally {
      setLoading(false);
    }
  };

  // ... rest of component
};
```

**Ví dụ: Login/Auth**

```jsx
import { loginUser } from '../lib/api';

const Login = () => {
  const handleLogin = async (email, password) => {
    try {
      const response = await loginUser({ email, password });

      // Lưu token và user info
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // Redirect to home
      navigate('/');
    } catch (error) {
      alert('Login failed: ' + error.response.data.message);
    }
  };

  // ... form code
};
```

### 5️⃣ Chạy Frontend

```bash
# Mở terminal mới (giữ backend chạy)
cd src/../..  # về root folder

npm run dev
```

✅ Frontend sẽ chạy tại: `http://localhost:5173`

## 📋 Checklist

- [ ] MongoDB cài đặt và chạy
- [ ] Backend server chạy (`npm run dev`)
- [ ] Seed data đã được import (`npm run seed`)
- [ ] File `src/lib/api.js` đã tạo
- [ ] Components đã cập nhật để sử dụng API
- [ ] Frontend server chạy (`npm run dev`)
- [ ] Kiểm tra browser DevTools → Network tab → xem requests

## 🧪 Test API

Bạn có thể test API bằng Postman hoặc cURL:

```bash
# Get all movies
curl http://localhost:5000/api/movies

# Get all theaters
curl http://localhost:5000/api/theaters

# Get all shows
curl http://localhost:5000/api/shows

# Login
curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

## 💾 Dữ liệu mẫu Seed

Sau khi chạy `npm run seed`, có sẵn:

**Tài khoản:**

- Email: `user@example.com` | Password: `password123`
- Email: `admin@example.com` | Password: `admin123`

**Dữ liệu:**

- 6 bộ phim
- 4 rạp chiếu
- ~168 suất chiếu (7 ngày × ~24 suất/ngày)
- 3 tài khoản người dùng

## 🔗 Kết nối các Components chính

| Component       | API Calls                            |
| --------------- | ------------------------------------ |
| Home.jsx        | getMovies()                          |
| Movies.jsx      | getMovies()                          |
| MovieDetail.jsx | getMovieById(), getShowsByDate()     |
| SeatLayout.jsx  | getShowById(), createBooking()       |
| MyBooking.jsx   | getUserBookings()                    |
| Theaters.jsx    | getTheaters(), getShowsByDate()      |
| Releases.jsx    | getShows()                           |
| Favorites.jsx   | getUserFavorites(), removeFavorite() |

## 🚨 Troubleshooting

### Backend không connect được?

```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

→ MongoDB chưa chạy. Chạy: `mongosh` hoặc restart MongoDB service

### CORS Error?

```
Access to XMLHttpRequest blocked by CORS
```

→ Backend không running hoặc URL sai. Kiểm tra:

- Backend server đang chạy (`http://localhost:5000`)
- File `.env` có `CLIENT_URL=http://localhost:5173`

### Seed data không import?

```bash
npm run seed
```

→ Kiểm tra lại MongoDB connection

### Token không hoạt động?

- Đảm bảo token được lưu: `localStorage.setItem('token', ...)`
- Kiểm tra Authorization header được gửi đúng

## 📚 Tài liệu thêm

- [API_DOCS.md](./backend/API_DOCS.md) - Chi tiết tất cả endpoints
- [backend/README.md](./backend/README.md) - Setup server chi tiết
