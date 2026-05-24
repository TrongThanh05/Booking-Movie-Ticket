import { useState, useEffect, useCallback } from 'react';

/**
 * useDarkMode – Hook quản lý Dark/Light mode.
 *
 * Fixes so với version cũ:
 * 1. SYNC: Dùng CustomEvent 'theme-change' để đồng bộ isDark state
 *    giữa TẤT CẢ các component đang gọi hook này (tránh kẹt màu).
 * 2. SMOOTH: Thêm class 'theme-transitioning' vào <html> trước khi
 *    đổi class 'light', xóa sau 420ms → tất cả elements chạy transition
 *    mượt mà mà không ảnh hưởng hover animations.
 * 3. SYNC DOM FIRST: cập nhật DOM ngay lập tức (synchronous) thay vì
 *    chờ React re-render → không có frame nào bị "kẹt" màu cũ.
 *
 * Returns: [isDark, toggleTheme]
 */

const THEME_EVENT = 'theme-change'; // tên custom event để sync các instances
const TRANSITION_DURATION = 420;    // ms — khớp với CSS transition 0.4s

const useDarkMode = () => {
  const [isDark, setIsDark] = useState(() => {
    // Đọc từ localStorage; mặc định dark nếu chưa từng chọn
    return localStorage.getItem('theme') !== 'light';
  });

  // ── Lắng nghe event từ các instance khác (giải quyết vấn đề kẹt màu) ──
  useEffect(() => {
    const handler = (e) => {
      // Chỉ cập nhật nếu giá trị thực sự khác để tránh vòng lặp
      setIsDark((current) => {
        if (current !== e.detail.isDark) return e.detail.isDark;
        return current;
      });
    };
    window.addEventListener(THEME_EVENT, handler);
    return () => window.removeEventListener(THEME_EVENT, handler);
  }, []);

  // ── Áp dụng class lên DOM khi isDark thay đổi ──
  useEffect(() => {
    const html = document.documentElement;

    // Bước 1: Thêm class transition TRƯỚC khi đổi theme
    html.classList.add('theme-transitioning');

    // Bước 2: Đổi class theme ngay sau (cùng frame paint)
    if (isDark) {
      html.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    } else {
      html.classList.add('light');
      localStorage.setItem('theme', 'light');
    }

    // Bước 3: Xóa transition class sau khi animation hoàn tất
    const timer = setTimeout(() => {
      html.classList.remove('theme-transitioning');
    }, TRANSITION_DURATION);

    return () => clearTimeout(timer);
  }, [isDark]);

  // ── Toggle: cập nhật state + broadcast cho tất cả instances ──
  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      // Phát sự kiện để sync các component khác đang dùng hook này
      window.dispatchEvent(
        new CustomEvent(THEME_EVENT, { detail: { isDark: next } })
      );
      return next;
    });
  }, []);

  return [isDark, toggleTheme];
};

export default useDarkMode;
