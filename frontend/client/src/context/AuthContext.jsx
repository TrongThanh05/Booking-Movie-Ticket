/**
 * AuthContext.jsx — HỆ THỐNG XÁC THỰC THỐNG NHẤT
 * Dùng chung cho cả Client (user) và Admin dashboard.
 *
 * Features:
 *   - login(email, password)  → gọi API, lưu token + user
 *   - register(data)          → gọi API, tự động login
 *   - logout()                → xóa session
 *   - AuthModal controls      → mở/đóng floating modal (client side)
 *   - isLoggedIn, isAdmin     → computed flags cho route guards
 */
import { createContext, useContext, useState, useCallback } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

// ── LocalStorage keys ─────────────────────────────────────────────────────────
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

  const [user,  setUser]  = useState(saved.user);
  const [token, setToken] = useState(saved.token);

  // AuthModal state (dùng cho client floating login modal)
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab,  setAuthModalTab]  = useState('login');

  // ── Computed flags ──────────────────────────────────────────────────────────
  const isLoggedIn = Boolean(token && user);
  const isAdmin    = isLoggedIn && user?.role === 'admin';

  // ── login() — Gọi API đăng nhập ────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const res = await api.post('/users/login', { email, password });
    const { user: userData, token: newToken } = res.data;
    persistSession(userData, newToken);
    setUser(userData);
    setToken(newToken);
    return userData; // trả về để caller kiểm tra role
  }, []);

  // ── register() — Gọi API đăng ký ───────────────────────────────────────────
  const register = useCallback(async ({ name, email, password, phone }) => {
    const res = await api.post('/users/register', { name, email, password, phone });
    const { user: userData, token: newToken } = res.data;
    persistSession(userData, newToken);
    setUser(userData);
    setToken(newToken);
    return userData;
  }, []);

  // ── logout() — Xóa session ─────────────────────────────────────────────────
  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    setToken(null);
  }, []);

  // ── AuthModal controls (client floating modal) ─────────────────────────────
  const openAuthModal  = useCallback((tab = 'login') => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  }, []);
  const closeAuthModal = useCallback(() => setAuthModalOpen(false), []);

  return (
    <AuthContext.Provider
      value={{
        user, token,
        isLoggedIn, isAdmin,
        login, register, logout,
        authModalOpen, authModalTab,
        openAuthModal, closeAuthModal, setAuthModalTab,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};

export default AuthContext;
