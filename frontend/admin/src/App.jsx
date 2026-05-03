import { BrowserRouter as Router, Routes, Route } from "react-router";
import { ScrollToTop } from "./components/common/ScrollToTop";

// ── Providers ──────────────────────────────────────────────────────────────────
import { AuthProvider } from "./context/AuthContext";

// ── Route Guards ──────────────────────────────────────────────────────────────
import ProtectedRoute from "./components/ProtectedRoute";

// ── Layout ────────────────────────────────────────────────────────────────────
import AppLayout from "./layout/AppLayout";

// ── Admin Pages ───────────────────────────────────────────────────────────────
import Home         from "./pages/Dashboard/Home";
import MovieList    from "./pages/Movies/MovieList";
import MovieForm    from "./pages/Movies/MovieForm";
import TheaterList  from "./pages/Theaters/TheaterList";
import TheaterForm  from "./pages/Theaters/TheaterForm";
import RoomList     from "./pages/Theaters/RoomList";
import ShowList     from "./pages/Shows/ShowList";
import ShowForm     from "./pages/Shows/ShowForm";
import UserList     from "./pages/Users/UserList";
import VoucherList  from "./pages/Vouchers/VoucherList";
import VoucherForm  from "./pages/Vouchers/VoucherForm";
import BookingList  from "./pages/Bookings/BookingList";

// ── Public Pages ──────────────────────────────────────────────────────────────
import SignIn       from "./pages/AuthPages/SignIn";
import SignUp       from "./pages/AuthPages/SignUp";
import NotFound     from "./pages/OtherPage/NotFound";
import AccessDenied from "./pages/OtherPage/AccessDenied";

export default function App() {
  return (
    // AuthProvider bọc toàn bộ app — mọi component đều có thể dùng useAuth()
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Routes>

          {/* ── PUBLIC ROUTES ─────────────────────────────────────────────── */}
          <Route path="/signin"        element={<SignIn />} />
          <Route path="/signup"        element={<SignUp />} />
          <Route path="/access-denied" element={<AccessDenied />} />

          {/* ── PRIVATE ADMIN ROUTES ──────────────────────────────────────── */}
          {/*
            ProtectedRoute là layout-route:
            - Nếu chưa login  → redirect /signin
            - Nếu không phải admin → redirect /access-denied
            - Nếu hợp lệ → render AppLayout + Outlet (nội dung trang)
          */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>

              {/* Dashboard */}
              <Route index path="/" element={<Home />} />

              {/* Movies */}
              <Route path="/movies"           element={<MovieList />} />
              <Route path="/movies/create"    element={<MovieForm />} />
              <Route path="/movies/edit/:id"  element={<MovieForm />} />

              {/* Theaters & Rooms */}
              <Route path="/theaters"                    element={<TheaterList />} />
              <Route path="/theaters/create"             element={<TheaterForm />} />
              <Route path="/theaters/edit/:id"           element={<TheaterForm />} />
              <Route path="/theaters/:theaterId/rooms"   element={<RoomList />} />

              {/* Shows */}
              <Route path="/shows"          element={<ShowList />} />
              <Route path="/shows/create"   element={<ShowForm />} />
              <Route path="/shows/edit/:id" element={<ShowForm />} />

              {/* Users */}
              <Route path="/users" element={<UserList />} />

              {/* Vouchers */}
              <Route path="/vouchers"           element={<VoucherList />} />
              <Route path="/vouchers/create"    element={<VoucherForm />} />
              <Route path="/vouchers/edit/:id"  element={<VoucherForm />} />

              {/* Bookings */}
              <Route path="/bookings" element={<BookingList />} />

            </Route>
          </Route>

          {/* ── FALLBACK ──────────────────────────────────────────────────── */}
          <Route path="*" element={<NotFound />} />

        </Routes>
      </Router>
    </AuthProvider>
  );
}