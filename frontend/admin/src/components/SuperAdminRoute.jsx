/**
 * SuperAdminRoute.jsx — Route guard: chỉ role 'admin' mới vào được /admin/theaters
 *
 * theater-manager & staff cố vào /admin/theaters → redirect /admin/rooms
 */
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/useAuth';

const SuperAdminRoute = () => {
  const { isAdmin, isStaffRole } = useAuth();

  // Chưa đăng nhập hoặc không phải staff role → access denied
  if (!isStaffRole) return <Navigate to="/" replace />;

  // theater-manager hoặc staff → không vào được /theaters, redirect về phòng của mình
  if (!isAdmin) return <Navigate to="/admin/rooms" replace />;

  return <Outlet />;
};

export default SuperAdminRoute;
