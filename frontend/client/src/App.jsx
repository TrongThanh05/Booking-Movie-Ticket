/**
 * App.jsx — Unified Client + Admin Router
 * - Client routes: /, /movies, /theaters, etc.
 * - Admin routes: /admin/* (protected, requires admin role)
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

// ── Admin Section (lazy load để giảm bundle size cho user thường) ─────────────
import AdminSection from './admin/AdminSection';

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
            ADMIN ROUTES — /admin/* (protected, requires admin role)
            Cùng port, cùng localStorage, cùng AuthContext!
            ═══════════════════════════════════════════════════════════════════ */}
        <Route path="/admin/*" element={<AdminSection />} />

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
