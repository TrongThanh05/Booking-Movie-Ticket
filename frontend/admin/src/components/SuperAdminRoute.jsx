/**
 * SuperAdminRoute.jsx — Route Guard: chỉ SUPER_ADMIN truy cập được
 *
 * THEATER_MANAGER cố truy cập /admin/theaters → redirect /admin/rooms
 * (Phòng của rạp mình, không cần bước chọn rạp)
 */
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/useAuth';

const SuperAdminRoute = () => {
  const { isAdmin, isSuperAdmin } = useAuth();

  // Chưa đăng nhập → về trang chủ
  if (!isAdmin) return <Navigate to="/" replace />;

  // Theater Manager → redirect thẳng vào danh sách phòng của mình
  if (!isSuperAdmin) return <Navigate to="/admin/rooms" replace />;

  return <Outlet />;
};

export default SuperAdminRoute;
