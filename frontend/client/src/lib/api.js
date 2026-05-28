import axios from 'axios';

// Kiểm tra nếu có VITE_API_URL trong .env, không thì dùng localhost
const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ─────────────────────────────────────────────────────────────────────────────
// publicApi — Axios instance dành riêng cho các endpoint PUBLIC.
//
// ⚠️  Instance này KHÔNG BAO GIỜ gắn token Authorization.
//     Dùng cho: GET /theaters, GET /movies (trang chủ client, booking flow).
//
// Lý do tách riêng: nếu dùng chung `api` (có auth interceptor), khi Cinema
// Manager đang đăng nhập thì token của họ bị gắn vào request → backend sẽ
// filter dữ liệu theo scope của manager → client chỉ thấy 1 rạp thay vì
// toàn bộ hệ thống. Đây là nguồn gốc của bug.
// ─────────────────────────────────────────────────────────────────────────────
export const publicApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  // Không có request interceptor → không bao giờ đính token
});

// ─────────────────────────────────────────────────────────────────────────────
// api — Axios instance dành cho các endpoint cần xác thực (PRIVATE).
// Dùng cho: tạo booking, xem lịch sử đặt vé, yêu thích, profile...
// ─────────────────────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});


// Interceptor để thêm token vào mọi request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor để xử lý lỗi
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || '';
      const isAuthEndpoint =
        requestUrl.includes('/users/login') ||
        requestUrl.includes('/users/register');

      // Chỉ redirect khi token đã tồn tại trước đó (session hết hạn).
      // Nếu đang gọi endpoint login/register mà bị 401 (sai password/email)
      // thì KHÔNG redirect — để form tự hiển thị lỗi bên trong Modal.
      const hadToken = Boolean(localStorage.getItem('authToken'));

      if (!isAuthEndpoint && hadToken) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// ========== MOVIES ==========
// ⚠️  Dùng publicApi (không token) → backend trả toàn bộ phim
export const getMovies    = (params) => publicApi.get('/movies', { params: { limit: 999, ...params } });
export const getMovieById = (id)     => publicApi.get(`/movies/${id}`);
// CUD vẫn dùng api (cần token admin)
export const createMovie = (movieData) => api.post('/movies', movieData);
export const updateMovie = (id, movieData) =>
  api.put(`/movies/${id}`, movieData);
export const deleteMovie = (id) => api.delete(`/movies/${id}`);

// ========== THEATERS ==========
// getTheaters / getTheaterById → dùng publicApi (không token)
//   → backend trả toàn bộ rạp dù ai đang đăng nhập
export const getTheaters = (params) => publicApi.get('/theaters', { params: { limit: 999, ...params } });
export const getTheaterById = (id) => publicApi.get(`/theaters/${id}`);
// CUD operations vẫn cần token (user phải đăng nhập để đặt vé)
export const createTheater = (theaterData) => api.post('/theaters', theaterData);
export const updateTheater = (id, theaterData) =>
  api.put(`/theaters/${id}`, theaterData);
export const deleteTheater = (id) => api.delete(`/theaters/${id}`);

// ========== ROOMS ==========
export const getRooms = (theaterId) =>
  api.get('/rooms', { params: theaterId ? { theater_id: theaterId } : {} });
export const getRoomById   = (id) => api.get(`/rooms/${id}`);
export const getRoomSeats  = (id) => api.get(`/rooms/${id}/seats`); // flat seat list
export const createRoom    = (roomData) => api.post('/rooms', roomData);
export const updateRoom    = (id, roomData) => api.put(`/rooms/${id}`, roomData);
export const deleteRoom    = (id) => api.delete(`/rooms/${id}`);

// ========== SHOWS ==========
// ⚠️  Dùng publicApi (không token) → backend trả toàn bộ lịch chiếu
export const getShows         = (params) => publicApi.get('/shows', { params: { limit: 999, ...params } });
export const getShowsByDate   = (date)   => publicApi.get(`/shows/by-date/${date}`);
export const getShowsByTheater = (theaterId, date) =>
  publicApi.get('/shows', {
    params: {
      ...(theaterId ? { cinema: theaterId } : {}),
      ...(date ? { date } : {}),
    },
  });
export const getShowsByMovie  = (movieId, date) =>
  publicApi.get(`/shows/by-movie/${movieId}`, { params: date ? { date } : {} });
export const getShowById      = (id) => publicApi.get(`/shows/${id}`);
export const createShow = (showData) => api.post('/shows', showData);
export const updateShow = (id, showData) => api.put(`/shows/${id}`, showData);
export const deleteShow = (id) => api.delete(`/shows/${id}`);

// ========== SEAT-MAP & LOCK (mới) ==========
export const getSeatMap     = (showId) => api.get(`/shows/${showId}/seat-map`);
export const lockSeats      = (showId, seatIds, userId) =>
  api.post(`/shows/${showId}/lock-seats`, { seat_ids: seatIds, user_id: userId });
export const unlockSeats    = (showId, seatIds, userId) =>
  api.post(`/shows/${showId}/unlock-seats`, { seat_ids: seatIds, user_id: userId });
/**
 * Xác nhận đặt ghế sau thanh toán thành công.
 * Dùng $addToSet để push seat_ids vào booked_seats (atomic, no-dup).
 */
export const confirmBooking = (showId, seatIds, userId) =>
  api.post(`/shows/${showId}/confirm-booking`, { seat_ids: seatIds, user_id: userId });

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

// ========== FAVORITES ==========
export const getUserFavorites = (userId) =>
  api.get(`/favorites/user/${userId}`);
export const addFavorite = (favoriteData) =>
  api.post('/favorites', favoriteData);
export const removeFavorite = (favoriteId) =>
  api.delete(`/favorites/${favoriteId}`);

export default api;
