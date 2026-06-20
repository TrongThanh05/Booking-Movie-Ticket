import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Import routes
import movieRoutes from './routes/movies.js';
import theaterRoutes from './routes/theaters.js';
import roomRoutes from './routes/rooms.js';
import showRoutes from './routes/shows.js';
import userRoutes from './routes/users.js';
import bookingRoutes from './routes/bookings.js';
import favoriteRoutes from './routes/favorites.js';
import dashboardRoutes from './routes/dashboard.js';
import voucherRoutes from './routes/vouchers.js';
import foodRoutes    from './routes/foods.js';
import reviewRoutes  from './routes/reviews.js';
import vnpayRoutes   from './routes/vnpay.js';

// Import cron
import { startCronUnlock }          from './scripts/cronUnlock.js';
import { startCronSeedShows }       from './scripts/cronSeedShows.js';
import { startCronExpireBookings }  from './scripts/cronExpireBookings.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve avatar tĩnh — GET /avatars/<filename>
const AVATAR_DIR = path.resolve(
  __dirname,
  '../frontend/client/src/assets/images/avatars'
);
app.use('/avatars', express.static(AVATAR_DIR));

// Serve poster/backdrop/cast tĩnh — GET /images/posters/<f>  /images/backdrops/<f>  /images/cast/<f>
const POSTER_DIR_STATIC   = path.resolve(__dirname, '../frontend/client/src/assets/images/posters');
const BACKDROP_DIR_STATIC = path.resolve(__dirname, '../frontend/client/src/assets/images/backdrops');
const CAST_DIR_STATIC     = path.resolve(__dirname, '../frontend/client/src/assets/images/cast');
app.use('/images/posters',   express.static(POSTER_DIR_STATIC));
app.use('/images/backdrops', express.static(BACKDROP_DIR_STATIC));
app.use('/images/cast',      express.static(CAST_DIR_STATIC));

// Connect to MongoDB
connectDB().then(() => {
  startCronUnlock(60_000);          // Giải phóng ghế lock hết hạn (mỗi 60s)
  startCronSeedShows();             // Tạo lịch chiếu mới (mỗi 24h)
  startCronExpireBookings();        // Hủy booking treo chưa thanh toán (mỗi 5ph)
});

// Routes
app.use('/api/movies', movieRoutes);
app.use('/api/theaters', theaterRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/shows', showRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/foods',    foodRoutes);
app.use('/api/reviews',  reviewRoutes);
app.use('/api/vnpay',    vnpayRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;
