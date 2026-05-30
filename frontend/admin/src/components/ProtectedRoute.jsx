/**
 * ProtectedRoute.jsx — Admin role guard
 * Redirect to /admin/access-denied nếu không phải admin
 */
import { Navigate, Outlet } from 'react-router-dom';
// admin/src/components/ → ../lib/useAuth (re-exports from client AuthContext)
import { useAuth } from '../lib/useAuth';

const AdminProtectedRoute = () => {
  const { isLoggedIn, isAdmin } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }
  if (!isAdmin) {
    return <Navigate to="/admin/access-denied" replace />;
  }
  return <Outlet />;
};

export default AdminProtectedRoute;
