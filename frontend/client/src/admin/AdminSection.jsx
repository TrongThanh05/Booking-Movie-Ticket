/**
 * AdminSection.jsx — Wrapper cho toàn bộ admin routes
 *
 * Cung cấp:
 * - ThemeProvider (dark/light toggle cho admin)
 * - AppWrapper (Helmet async cho SEO)
 * - Admin CSS (scoped)
 * - Admin routes
 *
 * Phân quyền route:
 *   /admin/theaters/*  → SuperAdminRoute (chỉ SUPER_ADMIN)
 *   /admin/rooms       → AdminProtectedRoute (cả SUPER_ADMIN + THEATER_MANAGER)
 */
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@admin/context/ThemeContext';
import { AppWrapper } from '@admin/components/common/PageMeta';
import AdminProtectedRoute from '@admin/components/ProtectedRoute';
import SuperAdminRoute    from '@admin/components/SuperAdminRoute';
import AppLayout from '@admin/layout/AppLayout';

// ── Import admin CSS ──────────────────────────────────────────────────────────
import './admin-css-loader.js';

// ── Admin Pages ───────────────────────────────────────────────────────────────
import Home         from '@admin/pages/Dashboard/Home';
import MovieList    from '@admin/pages/Movies/MovieList';
import MovieForm    from '@admin/pages/Movies/MovieForm';
import TheaterList  from '@admin/pages/Theaters/TheaterList';
import TheaterForm  from '@admin/pages/Theaters/TheaterForm';
import RoomList     from '@admin/pages/Theaters/RoomList';
import ShowList     from '@admin/pages/Shows/ShowList';
import ShowForm     from '@admin/pages/Shows/ShowForm';
import UserList     from '@admin/pages/Users/UserList';
import VoucherList  from '@admin/pages/Vouchers/VoucherList';
import VoucherForm  from '@admin/pages/Vouchers/VoucherForm';
import BookingList   from '@admin/pages/Bookings/BookingList';
import BookingDetail from '@admin/pages/Bookings/BookingDetail';
import FoodList     from '@admin/pages/Foods/FoodList';
import FoodForm     from '@admin/pages/Foods/FoodForm';
import ReviewList   from '@admin/pages/Reviews/ReviewList';
import AccessDenied from '@admin/pages/OtherPage/AccessDenied';
import Settings     from '@admin/pages/Settings/Settings';

const AdminSection = () => {
  return (
    <ThemeProvider>
      <AppWrapper>
        <div className="admin-scope">
          <Routes>
            {/* Public admin route */}
            <Route path="access-denied" element={<AccessDenied />} />

            {/* Protected admin routes — yêu cầu role === 'admin' */}
            <Route element={<AdminProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<Home />} />
                <Route path="movies"          element={<MovieList />} />
                <Route path="movies/create"   element={<MovieForm />} />
                <Route path="movies/edit/:id" element={<MovieForm />} />

                {/* ── Theaters: CHỈ SUPER_ADMIN ─────────────────────────────
                    THEATER_MANAGER cố vào đây → redirect /admin/rooms
                    SuperAdminRoute xử lý redirect tự động.              ── */}
                <Route element={<SuperAdminRoute />}>
                  <Route path="theaters"            element={<TheaterList />} />
                  <Route path="theaters/create"     element={<TheaterForm />} />
                  <Route path="theaters/edit/:id"   element={<TheaterForm />} />
                  <Route path="theaters/:theaterId/rooms" element={<RoomList />} />
                </Route>

                {/* ── Rooms: cả 2 role ──────────────────────────────────────
                    THEATER_MANAGER vào /admin/rooms → thẳng phòng của mình
                    SUPER_ADMIN vào /admin/rooms → cũng hoạt động (fallback)  */}
                <Route path="rooms" element={<RoomList />} />

                <Route path="shows"           element={<ShowList />} />
                <Route path="shows/create"    element={<ShowForm />} />
                <Route path="shows/edit/:id"  element={<ShowForm />} />
                <Route path="users"           element={<UserList />} />
                <Route path="vouchers"        element={<VoucherList />} />
                <Route path="vouchers/create" element={<VoucherForm />} />
                <Route path="vouchers/edit/:id" element={<VoucherForm />} />
                <Route path="bookings"        element={<BookingList />} />
                <Route path="bookings/:id"    element={<BookingDetail />} />
                <Route path="foods"           element={<FoodList />} />
                <Route path="foods/create"    element={<FoodForm />} />
                <Route path="foods/edit/:id"  element={<FoodForm />} />
                <Route path="reviews"         element={<ReviewList />} />
                <Route path="settings"        element={<Settings />} />
              </Route>
            </Route>
          </Routes>
        </div>
      </AppWrapper>
    </ThemeProvider>
  );
};

export default AdminSection;

