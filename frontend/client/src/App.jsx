/**
 * App.jsx — Client Router
 * SPA cho khách hàng: xem phim, đặt vé, quản lý booking
 * Admin dashboard là ứng dụng riêng tại frontend/admin/
 */
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// ── Global components ─────────────────────────────────────────────────────────
import AuthModal from './components/AuthModal';

// ── Route Guards ──────────────────────────────────────────────────────────────
import PrivateRoute from './components/PrivateRoute';

// ── Layout ────────────────────────────────────────────────────────────────────
import ClientLayout from './layouts/ClientLayout';

// ── Client Pages ──────────────────────────────────────────────────────────────
import Home from './pages/Home';
import Movies from './pages/Movies';
import MovieDetail from './pages/MovieDetail';
import SeatLayout from './pages/SeatLayout';
import MyBooking from './pages/MyBooking';
import Favorites from './pages/Favorite';
import Releases from './pages/Releases';
import Theaters from './pages/Theaters';

const App = () => {
  return (
    <>
      {/* Global toast notifications */}
      <Toaster position="top-center" toastOptions={{ duration: 3500 }} />

      {/* Floating login/register modal — accessible from anywhere */}
      <AuthModal />

      <Routes>
        {/* ═══════════════════════════════════════════════════════════════════
            CLIENT ROUTES — wrapped by ClientLayout (Navbar + Footer)
            ═══════════════════════════════════════════════════════════════════ */}
        <Route element={<ClientLayout />}>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/movies/:id" element={<MovieDetail />} />
          <Route path="/theaters" element={<Theaters />} />
          <Route path="/releases" element={<Releases />} />

          {/* Protected — requires login */}
          <Route
            path="/movies/book/:movieId/:showId"
            element={<PrivateRoute><SeatLayout /></PrivateRoute>}
          />
          <Route
            path="/my-booking"
            element={<PrivateRoute><MyBooking /></PrivateRoute>}
          />
          <Route
            path="/favorites"
            element={<PrivateRoute><Favorites /></PrivateRoute>}
          />
        </Route>

        {/* ═══════════════════════════════════════════════════════════════════
            FALLBACK — 404
            ═══════════════════════════════════════════════════════════════════ */}
        <Route path="*" element={
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100vh', background: '#0f172a', color: '#f8fafc'
          }}>
            <h1 style={{ fontSize: '4rem', fontWeight: 700, marginBottom: '1rem' }}>404</h1>
            <p style={{ fontSize: '1.25rem', color: '#94a3b8' }}>Không tìm thấy trang bạn yêu cầu.</p>
            <a href="/" style={{ marginTop: '1.5rem', color: '#F84565', textDecoration: 'none' }}>← Về trang chủ</a>
          </div>
        } />
      </Routes>
    </>
  );
};

export default App;
