/**
 * PrivateRoute.jsx
 * Bảo vệ route chỉ cho phép:
 *   - <PrivateRoute>           → user đã đăng nhập
 *   - <PrivateRoute adminOnly> → chỉ admin
 *
 * Nếu chưa đăng nhập → mở AuthModal thay vì redirect (giữ người dùng trên trang hiện tại)
 * Nếu không đủ quyền admin → redirect về trang chủ
 *
 * Usage:
 *   <Route path="/my-booking" element={<PrivateRoute><MyBooking /></PrivateRoute>} />
 *   <Route path="/admin/*"    element={<PrivateRoute adminOnly><AdminLayout /></PrivateRoute>} />
 */
import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children, adminOnly = false }) => {
  const { isLoggedIn, isAdmin, openAuthModal } = useAuth();

  // User chưa đăng nhập → mở modal, render null (trang hiện tại vẫn giữ nguyên phía dưới modal)
  useEffect(() => {
    if (!isLoggedIn) {
      openAuthModal('login');
    }
  }, [isLoggedIn, openAuthModal]);

  if (!isLoggedIn) return null;

  // Đã đăng nhập nhưng không phải admin
  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PrivateRoute;
