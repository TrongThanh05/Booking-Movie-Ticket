/**
 * PageMeta.jsx — Set document title + meta description
 * Sử dụng useEffect thay vì react-helmet-async để tránh thêm dependency
 */
import { useEffect } from 'react';

const PageMeta = ({ title, description }) => {
  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = description;
    }
  }, [title, description]);

  return null;
};

export const AppWrapper = ({ children }) => <>{children}</>;

export default PageMeta;
