import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";

/**
 * ProtectedRoute — Bảo vệ các route yêu cầu đăng nhập + quyền admin.
 *
 * Logic phân quyền:
 *   1. Chưa đăng nhập  → redirect /signin (kèm `from` để quay lại sau login)
 *   2. Đã đăng nhập + role !== 'admin' → redirect /access-denied
 *   3. Đã đăng nhập + role === 'admin' → render <Outlet /> (nội dung trang)
 */
export default function ProtectedRoute() {
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  // ── Chưa đăng nhập: về trang login, lưu lại URL hiện tại ─────────────────
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/signin"
        state={{ from: location }}  // dùng để redirect lại sau khi login thành công
        replace
      />
    );
  }

  // ── Đã login nhưng không phải admin ───────────────────────────────────────
  if (!isAdmin) {
    return <Navigate to="/access-denied" replace />;
  }

  // ── Hợp lệ: render trang được bảo vệ ─────────────────────────────────────
  return <Outlet />;
}
