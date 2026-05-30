/**
 * main.jsx — Entry point cho ứng dụng Client (khách hàng)
 * Chỉ import CSS của client, không load admin CSS
 */
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';

// ── CSS ───────────────────────────────────────────────────────────────────────
import './index.css';          // Client cinema theme (dark, primary #F84565)

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </AuthProvider>
  </BrowserRouter>,
);
