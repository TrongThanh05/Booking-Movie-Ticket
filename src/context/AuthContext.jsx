/**
 * AuthContext.jsx
 * Quản lý trạng thái xác thực toàn cục với React Context.
 * Lưu user + token vào localStorage để persist qua page reload.
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import api from '../lib/api';

// ── Types (JSDoc) ──────────────────────────────────────────────────────────────
/**
 * @typedef {{ _id: string, name: string, email: string, phone?: string, role: 'user'|'admin', avatar?: string }} UserData
 */

const AuthContext = createContext(null);

// ── Helpers ───────────────────────────────────────────────────────────────────
const LS_TOKEN = 'authToken';
const LS_USER  = 'user';

const persistSession = (user, token) => {
  localStorage.setItem(LS_TOKEN, token);
  localStorage.setItem(LS_USER, JSON.stringify(user));
};

const clearSession = () => {
  localStorage.removeItem(LS_TOKEN);
  localStorage.removeItem(LS_USER);
};

const readSession = () => {
  try {
    const token = localStorage.getItem(LS_TOKEN);
    const user  = JSON.parse(localStorage.getItem(LS_USER) || 'null');
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
};

// ── Provider ──────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const saved = readSession();

  const [user,  setUser]  = useState(/** @type {UserData|null} */ (saved.user));
  const [token, setToken] = useState(saved.token);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab,  setAuthModalTab]  = useState('login'); // 'login' | 'register'

  // ── Actions ─────────────────────────────────────────────────────────────────

  /** Đăng nhập với email + password */
  const login = useCallback(async (email, password) => {
    const res = await api.post('/users/login', { email, password });
    const { user: userData, token: newToken } = res.data;
    persistSession(userData, newToken);
    setUser(userData);
    setToken(newToken);
    return userData; // trả về để caller dùng role redirect
  }, []);

  /** Đăng ký tài khoản mới */
  const register = useCallback(async ({ name, email, password, phone }) => {
    const res = await api.post('/users/register', { name, email, password, phone });
    const { user: userData, token: newToken } = res.data;
    persistSession(userData, newToken);
    setUser(userData);
    setToken(newToken);
    return userData;
  }, []);

  /** Đăng xuất */
  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    setToken(null);
  }, []);

  /** Mở Auth Modal (mặc định tab login) */
  const openAuthModal = useCallback((tab = 'login') => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => setAuthModalOpen(false), []);

  const isAdmin = user?.role === 'admin';
  const isLoggedIn = !!user;

  return (
    <AuthContext.Provider
      value={{
        user, token, isAdmin, isLoggedIn,
        login, register, logout,
        authModalOpen, authModalTab,
        openAuthModal, closeAuthModal, setAuthModalTab,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ── Custom hook ───────────────────────────────────────────────────────────────
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};

export default AuthContext;
