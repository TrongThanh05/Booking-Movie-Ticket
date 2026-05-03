import { createContext, useContext, useState, useEffect, useCallback } from "react";

// ─── Auth Context ──────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

// Storage keys
const TOKEN_KEY = "admin_token";
const USER_KEY  = "admin_user";

export function AuthProvider({ children }) {
  // Khởi tạo state từ localStorage (persist across page refresh)
  const [user, setUser]       = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken]     = useState(() => localStorage.getItem(TOKEN_KEY) || null);
  const [loading, setLoading] = useState(false); // global loading (e.g., initial token validation)

  // ── Computed: true nếu user đã đăng nhập ──────────────────────────────────
  const isAuthenticated = Boolean(token && user);
  const isAdmin         = isAuthenticated && user?.role === "admin";

  // ── login() — Lưu user + token vào state & localStorage ───────────────────
  const login = useCallback((userData, accessToken) => {
    // Lưu vào localStorage để persist qua reload
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));

    setToken(accessToken);
    setUser(userData);
  }, []);

  // ── logout() — Xóa toàn bộ session ────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // ── Optional: Validate token với server khi app khởi chạy ─────────────────
  // Nếu token hết hạn sẽ tự logout
  useEffect(() => {
    if (!token) return;

    // Nếu muốn verify token với backend, bỏ comment đoạn dưới:
    // setLoading(true);
    // fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
    //   .then((res) => { if (!res.ok) logout(); })
    //   .catch(logout)
    //   .finally(() => setLoading(false));
  }, [token, logout]);

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    isAdmin,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Custom hook để dùng trong components ──────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}

export default AuthContext;
