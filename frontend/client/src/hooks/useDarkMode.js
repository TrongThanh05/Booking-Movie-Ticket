import { useState, useEffect } from 'react';

/**
 * useDarkMode – Hook quản lý Dark/Light mode.
 *
 * - Đọc giá trị từ localStorage ('theme') khi mount.
 * - Toggle class 'light' trên thẻ <html> (dark là mặc định).
 * - Lưu lựa chọn vào localStorage để giữ qua reload.
 *
 * Returns: [isDark, toggleTheme]
 */
const useDarkMode = () => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    // Mặc định dark nếu chưa từng chọn
    return saved !== 'light';
  });

  useEffect(() => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    } else {
      html.classList.add('light');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  return [isDark, toggleTheme];
};

export default useDarkMode;
