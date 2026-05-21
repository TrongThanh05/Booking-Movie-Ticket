import axios from 'axios';

// Kiểm tra nếu có VITE_API_URL trong .env, không thì dùng localhost
const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Tạo axios instance
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
      // Token hết hạn, xóa và redirect đến login
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// ========== MOVIES ==========
export const getMovies = (params) => api.get('/movies', { params: { limit: 999, ...params } });
export const getMovieById = (id) => api.get(`/movies/${id}`);
export const createMovie = (movieData) => api.post('/movies', movieData);
export const updateMovie = (id, movieData) =>
  api.put(`/movies/${id}`, movieData);
export const deleteMovie = (id) => api.delete(`/movies/${id}`);

// ========== THEATERS ==========
export const getTheaters = (params) => api.get('/theaters', { params: { limit: 999, ...params } });
export const getTheaterById = (id) => api.get(`/theaters/${id}`);
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
export const getShows = (params) => api.get('/shows', { params: { limit: 999, ...params } });
export const getShowsByDate = (date) => api.get(`/shows/by-date/${date}`);
export const getShowsByTheater = (theaterId, date) =>
  api.get('/shows', {
    params: {
      ...(theaterId ? { cinema: theaterId } : {}),
      ...(date ? { date } : {}),
    },
  });
export const getShowsByMovie = (movieId, date) =>
  api.get(`/shows/by-movie/${movieId}`, { params: date ? { date } : {} });
export const getShowById = (id) => api.get(`/shows/${id}`);
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
