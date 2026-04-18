import React from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar       from './components/Navbar';
import Footer       from './components/Footer';
import AuthModal    from './components/AuthModal';
import PrivateRoute from './components/PrivateRoute';
import Home         from './pages/Home';
import MovieDetail  from './pages/MovieDetail';
import SeatLayout   from './pages/SeatLayout';
import MyBooking    from './pages/MyBooking';
import Favorites    from './pages/Favorite';
import Movies       from './pages/Movies';
import Releases     from './pages/Releases';
import Theaters     from './pages/Theaters';

const App = () => {
  const isAdminRoute = useLocation().pathname.startsWith('/admin');

  return (
    <>
      <Toaster position="top-center" toastOptions={{ duration: 3500 }} />

      {/* Global floating auth modal — rendered at root level so it can float above everything */}
      <AuthModal />

      {!isAdminRoute && <Navbar />}

      <Routes>
        {/* Public routes */}
        <Route path="/"        element={<Home />} />
        <Route path="/movies"  element={<Movies />} />
        <Route path="/movies/:id" element={<MovieDetail />} />
        <Route path="/theaters"   element={<Theaters />} />
        <Route path="/releases"   element={<Releases />} />

        {/* Protected routes (requires login) */}
        <Route path="/movies/book/:movieId/:showId"
          element={<PrivateRoute><SeatLayout /></PrivateRoute>} />
        <Route path="/my-booking"
          element={<PrivateRoute><MyBooking /></PrivateRoute>} />
        <Route path="/favorites"
          element={<PrivateRoute><Favorites /></PrivateRoute>} />

        {/* Admin routes — placeholder, swap AdminLayout when ready */}
        <Route path="/admin/*"
          element={<PrivateRoute adminOnly><div className="p-8 text-white">Admin Dashboard (coming soon)</div></PrivateRoute>} />
      </Routes>

      {!isAdminRoute && <Footer />}
    </>
  );
};

export default App;
