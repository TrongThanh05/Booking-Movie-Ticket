/**
 * ProtectedRoute.jsx — Admin panel route guard
 *
 * Phân quyền vào Admin Panel:
 *   ✅ admin          — toàn quyền
 *   ✅ theater-manager — quản lý rạp của mình
 *   ✅ staff          — nhân viên rạp (xem báo cáo, soát vé...)
 *   ❌ user           — redirect về trang access-denied
 */
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/useAuth';

const AdminProtectedRoute = () => {
  const { isLoggedIn, isStaffRole } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }
  // isStaffRole = isAdmin || isTheaterManager || isStaff
  if (!isStaffRole) {
    return <Navigate to="/admin/access-denied" replace />;
  }
  return <Outlet />;
};

export default AdminProtectedRoute;
