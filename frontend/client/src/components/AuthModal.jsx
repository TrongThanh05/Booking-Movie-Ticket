/**
 * AuthModal.jsx
 * Floating modal với slide-tab Login / Register.
 * Hiển thị trước trang hiện tại với backdrop blur.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Eye, EyeOff, Mail, Lock, User, Phone, Loader2, Clapperboard, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// ── Validation helpers ─────────────────────────────────────────────────────────
const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isValidPhone  = (v) => !v || /^[0-9]{9,11}$/.test(v.replace(/\s/g, ''));

// ── Input component ───────────────────────────────────────────────────────────
const Field = ({ label, id, icon: Icon, error, type = 'text', rightEl, ...props }) => (
  <div className="space-y-1">
    <label htmlFor={id} className="block text-sm font-medium text-gray-300">
      {label}
    </label>
    <div className="relative">
      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
        <Icon className="w-4 h-4" />
      </span>
      <input
        id={id}
        type={type}
        className={`w-full pl-10 pr-${rightEl ? '10' : '4'} py-3 rounded-xl bg-white/5 border ${
          error ? 'border-red-500 focus:ring-red-500' : 'border-white/10 focus:ring-red-500/50'
        } text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 text-sm`}
        {...props}
      />
      {rightEl && (
        <span className="absolute inset-y-0 right-0 flex items-center pr-3">
          {rightEl}
        </span>
      )}
    </div>
    {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
  </div>
);

// ── Login Form ────────────────────────────────────────────────────────────────
const LoginForm = ({ onSuccess }) => {
  const { login } = useAuth();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [errors, setErrors]   = useState({});
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.email)              e.email    = 'Vui lòng nhập email';
    else if (!isValidEmail(form.email)) e.email = 'Email không hợp lệ';
    if (!form.password)           e.password = 'Vui lòng nhập mật khẩu';
    else if (form.password.length < 6) e.password = 'Mật khẩu ít nhất 6 ký tự';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Chào mừng trở lại, ${user.name}!`);
      onSuccess(user);
    } catch (err) {
      const msg = err.response?.data?.message || 'Đăng nhập thất bại';
      toast.error(msg);
      setErrors({ server: msg });
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => {
    setForm((p) => ({ ...p, [k]: e.target.value }));
    setErrors((p) => ({ ...p, [k]: '', server: '' }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {errors.server && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-400 text-sm animate-[errorShake_0.4s_ease-out]">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{errors.server}</span>
        </div>
      )}

      <Field label="Email" id="login-email" icon={Mail} type="email"
        placeholder="you@example.com" value={form.email} onChange={set('email')} error={errors.email} />

      <Field label="Mật khẩu" id="login-password" icon={Lock}
        type={showPwd ? 'text' : 'password'} placeholder="••••••••"
        value={form.password} onChange={set('password')} error={errors.password}
        rightEl={
          <button type="button" onClick={() => setShowPwd((p) => !p)}
            className="text-gray-400 hover:text-white transition-colors">
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
      />

      <div className="flex justify-end">
        <button type="button" className="text-xs text-gray-400 hover:text-red-400 transition-colors">
          Quên mật khẩu?
        </button>
      </div>

      <button type="submit" disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-red-500/20">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </button>
    </form>
  );
};

// ── Register Form ─────────────────────────────────────────────────────────────
const RegisterForm = ({ onSuccess }) => {
  const { register } = useAuth();
  const [form, setForm]       = useState({ name: '', email: '', phone: '', password: '', confirmPwd: '' });
  const [errors, setErrors]   = useState({});
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim())             e.name       = 'Vui lòng nhập họ tên';
    if (!form.email)                   e.email      = 'Vui lòng nhập email';
    else if (!isValidEmail(form.email)) e.email     = 'Email không hợp lệ';
    if (!isValidPhone(form.phone))     e.phone      = 'Số điện thoại không hợp lệ (9-11 chữ số)';
    if (!form.password)                e.password   = 'Vui lòng nhập mật khẩu';
    else if (form.password.length < 6) e.password   = 'Mật khẩu ít nhất 6 ký tự';
    if (form.confirmPwd !== form.password) e.confirmPwd = 'Mật khẩu không khớp';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const user = await register({ name: form.name, email: form.email, password: form.password, phone: form.phone });
      toast.success(`Chào mừng, ${user.name}! Tài khoản đã được tạo thành công.`);
      onSuccess(user);
    } catch (err) {
      const msg = err.response?.data?.message || 'Đăng ký thất bại';
      toast.error(msg);
      setErrors({ server: msg });
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => {
    setForm((p) => ({ ...p, [k]: e.target.value }));
    setErrors((p) => ({ ...p, [k]: '', server: '' }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {errors.server && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-400 text-sm animate-[errorShake_0.4s_ease-out]">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{errors.server}</span>
        </div>
      )}

      <Field label="Họ và tên" id="reg-name" icon={User} placeholder="Nguyễn Văn A"
        value={form.name} onChange={set('name')} error={errors.name} />

      <Field label="Email" id="reg-email" icon={Mail} type="email" placeholder="you@example.com"
        value={form.email} onChange={set('email')} error={errors.email} />

      <Field label="Số điện thoại (không bắt buộc)" id="reg-phone" icon={Phone}
        type="tel" placeholder="0901234567"
        value={form.phone} onChange={set('phone')} error={errors.phone} />

      <Field label="Mật khẩu" id="reg-password" icon={Lock}
        type={showPwd ? 'text' : 'password'} placeholder="Ít nhất 6 ký tự"
        value={form.password} onChange={set('password')} error={errors.password}
        rightEl={
          <button type="button" onClick={() => setShowPwd((p) => !p)}
            className="text-gray-400 hover:text-white transition-colors">
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
      />

      <Field label="Xác nhận mật khẩu" id="reg-confirm" icon={Lock}
        type={showPwd ? 'text' : 'password'} placeholder="Nhập lại mật khẩu"
        value={form.confirmPwd} onChange={set('confirmPwd')} error={errors.confirmPwd} />

      <button type="submit" disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-red-500/20">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
      </button>
    </form>
  );
};

// ── Main Modal ────────────────────────────────────────────────────────────────
const AuthModal = () => {
  const { authModalOpen, authModalTab, setAuthModalTab, closeAuthModal, isAdmin } = useAuth();
  const navigate  = useNavigate();
  const overlayRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    if (!authModalOpen) return;
    const handler = (e) => { if (e.key === 'Escape') closeAuthModal(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [authModalOpen, closeAuthModal]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = authModalOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [authModalOpen]);

  if (!authModalOpen) return null;

  const handleSuccess = (user) => {
    closeAuthModal();
    if (user.role === 'admin') {
      // Cùng port → cùng app → navigate trực tiếp đến admin dashboard
      navigate('/admin');
    }
    // user thường: ở lại trang hiện tại — toast là đủ
  };

  const tab = authModalTab;

  return (
    /* Backdrop */
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === overlayRef.current) closeAuthModal(); }}
    >
      {/* Blur backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-md bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden
        animate-[modalIn_0.25s_ease-out]">

        {/* Decorative gradient top bar */}
        <div className="h-1 w-full bg-gradient-to-r from-red-500 via-pink-500 to-red-600" />

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
              <Clapperboard className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-500">
                {tab === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
              </h2>
              <p className="text-xs text-gray-400">
                {tab === 'login' ? 'Chào mừng trở lại!' : 'Tham gia cùng chúng tôi'}
              </p>
            </div>
          </div>
          <button onClick={closeAuthModal}
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-6 mb-5">
          <div className="flex bg-white/5 rounded-xl p-1 gap-1">
            {['login', 'register'].map((t) => (
              <button
                key={t}
                onClick={() => setAuthModalTab(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  tab === t
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {t === 'login' ? 'Đăng nhập' : 'Đăng ký'}
              </button>
            ))}
          </div>
        </div>

        {/* Form content — scrollable on small screens */}
        <div className="px-6 pb-6 overflow-y-auto max-h-[65vh]">
          {tab === 'login'
            ? <LoginForm    onSuccess={handleSuccess} />
            : <RegisterForm onSuccess={handleSuccess} />
          }

          {/* Switch tab link */}
          <p className="text-center text-sm text-gray-400 mt-5">
            {tab === 'login' ? (
              <>Chưa có tài khoản?{' '}
                <button onClick={() => setAuthModalTab('register')}
                  className="text-red-400 hover:text-red-300 font-medium transition-colors">
                  Đăng ký ngay
                </button>
              </>
            ) : (
              <>Đã có tài khoản?{' '}
                <button onClick={() => setAuthModalTab('login')}
                  className="text-red-400 hover:text-red-300 font-medium transition-colors">
                  Đăng nhập
                </button>
              </>
            )}
          </p>
        </div>
      </div>

      {/* CSS animation (inline keyframes via style tag) */}
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(-8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);     }
        }
        @keyframes errorShake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-6px); }
          40%     { transform: translateX(6px); }
          60%     { transform: translateX(-4px); }
          80%     { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
};

export default AuthModal;
