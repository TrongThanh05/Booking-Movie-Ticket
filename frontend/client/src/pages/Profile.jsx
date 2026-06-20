/**
 * Profile.jsx — Trang hồ sơ cá nhân
 * Features:
 *   - Tab "Thông tin chung": xem/sửa name, email, phone + upload avatar với preview
 *   - Tab "Đổi mật khẩu": form 3 trường + eye toggle + validation
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Phone, Camera, Save, Eye, EyeOff,
  Lock, ShieldCheck, Loader2, CheckCircle2, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../context/AuthContext';
import useDarkMode from '../hooks/useDarkMode';
import api from '../lib/api';

// URL gốc của backend — dùng để tạo đường dẫn ảnh avatar đầy đủ
const BACKEND_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:5000';

/** Chuyển filename lưu trong DB thành URL đầy đủ */
const toAvatarUrl = (filename) =>
  filename ? `${BACKEND_URL}/avatars/${filename}` : null;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[0-9+\-\s()]{7,15}$/;

const TABS = [
  { id: 'info',     label: 'Thông tin chung',  icon: User   },
  { id: 'password', label: 'Đổi mật khẩu',     icon: Lock   },
];

// ─── Avatar helpers ────────────────────────────────────────────────────────────
const getInitials = (name = '') =>
  name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';

// ─── Sub-component: Field ─────────────────────────────────────────────────────
const Field = ({ label, icon: Icon, error, isDark, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className={`text-sm font-medium flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
      {Icon && <Icon className="w-4 h-4 opacity-70" />}
      {label}
    </label>
    {children}
    {error && (
      <p className="text-xs text-red-400 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" /> {error}
      </p>
    )}
  </div>
);

// ─── Sub-component: Input ─────────────────────────────────────────────────────
const Input = ({ isDark, className = '', ...props }) => (
  <input
    {...props}
    className={`w-full px-4 py-3 rounded-xl border text-sm transition-all duration-200 outline-none
      focus:ring-2 focus:ring-red-500/40 focus:border-red-500
      disabled:opacity-50 disabled:cursor-not-allowed
      ${isDark
        ? 'bg-white/5 border-white/15 text-white placeholder-gray-500'
        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
      } ${className}`}
  />
);

// ─── Sub-component: PasswordInput ─────────────────────────────────────────────
const PasswordInput = ({ isDark, value, onChange, placeholder, id, disabled }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        isDark={isDark}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="pr-11"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
          isDark ? 'text-gray-400 hover:text-gray-200' : 'text-slate-400 hover:text-slate-700'
        }`}
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const Profile = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [isDark] = useDarkMode();

  // ── State: tab ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('info');

  // ── State: profile data ──────────────────────────────────────────────────────
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // ── State: info form ─────────────────────────────────────────────────────────
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [formErrors, setFormErrors] = useState({});
  const [savingInfo, setSavingInfo] = useState(false);

  // ── State: avatar ────────────────────────────────────────────────────────────
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile]       = useState(null);
  const [savingAvatar, setSavingAvatar]   = useState(false);
  const fileInputRef = useRef(null);

  // ── State: password form ─────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [savingPw, setSavingPw] = useState(false);

  // ── Redirect if not logged in ────────────────────────────────────────────────
  useEffect(() => {
    if (!token) navigate('/');
  }, [token, navigate]);

  // ── Helper: lấy userId an toàn (hỗ trợ cả _id lẫn id) ────────────────
  const userId = user?._id || user?.id || null;

  // ── Fetch profile ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const fetch = async () => {
      try {
        setLoadingProfile(true);
        const res = await api.get(`/users/profile/${userId}`);
        const data = res.data;
        setProfile(data);
        setForm({ name: data.name || '', email: data.email || '', phone: data.phone || '' });
      } catch {
        toast.error('Không thể tải thông tin người dùng');
      } finally {
        setLoadingProfile(false);
      }
    };
    fetch();
  }, [userId]);

  // ── Validate info form ───────────────────────────────────────────────────────
  const validateInfo = useCallback(() => {
    const errs = {};
    if (!form.name.trim())              errs.name  = 'Họ tên không được để trống';
    if (!emailRegex.test(form.email))   errs.email = 'Email không đúng định dạng';
    if (form.phone && !phoneRegex.test(form.phone)) errs.phone = 'Số điện thoại không hợp lệ';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  // ── Save info ────────────────────────────────────────────────────────────────
  const handleSaveInfo = async (e) => {
    e.preventDefault();
    if (!validateInfo()) return;
    const targetId = profile?._id || userId;
    if (!targetId) { toast.error('Không xác định được tài khoản'); return; }
    try {
      setSavingInfo(true);
      const res = await api.put(`/users/${targetId}`, {
        name:  form.name.trim(),
        phone: form.phone.trim(),
      });
      setProfile(res.data);
      toast.success('Cập nhật thông tin thành công!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Lưu thất bại');
    } finally {
      setSavingInfo(false);
    }
  };

  // ── Avatar: chọn file ────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh (jpg, png, webp...)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ảnh không được vượt quá 5MB');
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  // ── Avatar: upload ────────────────────────────────────────────────────────────
  const handleSaveAvatar = async () => {
    if (!avatarFile) return;
    const targetId = profile?._id || userId;
    if (!targetId) { toast.error('Không xác định được tài khoản'); return; }
    try {
      setSavingAvatar(true);
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      // Gọi endpoint upload riêng: PUT /api/users/:id/avatar
      const res = await api.put(`/users/${targetId}/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Backend trả về { avatar: 'filename.jpg', avatarUrl: '/avatars/...' }
      setProfile((prev) => ({ ...prev, avatar: res.data.avatar }));
      setAvatarFile(null);
      setAvatarPreview(null);
      toast.success('Cập nhật ảnh đại diện thành công!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Upload ảnh thất bại');
    } finally {
      setSavingAvatar(false);
    }
  };

  // ── Validate password form ───────────────────────────────────────────────────
  const validatePw = useCallback(() => {
    const errs = {};
    if (!pwForm.current)                          errs.current = 'Vui lòng nhập mật khẩu hiện tại';
    if (pwForm.newPw.length < 8)                  errs.newPw  = 'Mật khẩu mới phải có ít nhất 8 ký tự';
    if (pwForm.newPw !== pwForm.confirm)           errs.confirm = 'Xác nhận mật khẩu không khớp';
    setPwErrors(errs);
    return Object.keys(errs).length === 0;
  }, [pwForm]);

  // ── Save password ────────────────────────────────────────────────────────────
  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!validatePw()) return;
    const targetId = profile?._id || userId;
    if (!targetId) { toast.error('Không xác định được tài khoản'); return; }
    try {
      setSavingPw(true);
      await api.put(`/users/${targetId}/change-password`, {
        currentPassword: pwForm.current,
        newPassword:     pwForm.newPw,
      });
      setPwForm({ current: '', newPw: '', confirm: '' });
      toast.success('Đổi mật khẩu thành công!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Đổi mật khẩu thất bại');
    } finally {
      setSavingPw(false);
    }
  };

  // ── Computed ────────────────────────────────────────────────────────────
  // preview (base64) ưu tiên, sau đó xây dựng URL từ filename lưu trong DB
  const displayAvatar = avatarPreview || toAvatarUrl(profile?.avatar) || null;
  const initials      = getInitials(profile?.name || user?.name);

  const roleLabel = {
    admin:            'Quản trị viên',
    'theater-manager':'Quản lý rạp',
    staff:            'Nhân viên',
    user:             'Thành viên',
  }[profile?.role || 'user'];

  const roleBadgeClass = {
    admin:            'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'theater-manager':'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    staff:            'bg-blue-500/20   text-blue-400   border-blue-500/30',
    user:             'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  }[profile?.role || 'user'];

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (loadingProfile) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#0a0f1e]' : 'bg-slate-100'}`}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Đang tải hồ sơ...</p>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen py-10 px-4 transition-colors duration-300 ${
      isDark ? 'bg-[#0a0f1e]' : 'bg-slate-100'
    }`}>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── Page Title ───────────────────────────────────────────────── */}
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Hồ sơ cá nhân</h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            Quản lý thông tin tài khoản của bạn
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT: Avatar card ──────────────────────────────────────── */}
          <div className={`lg:col-span-1 rounded-2xl p-6 flex flex-col items-center gap-4 border ${
            isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'
          }`}>
            {/* Avatar */}
            <div className="relative group">
              <div
                className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-red-500/30 cursor-pointer relative"
                onClick={() => fileInputRef.current?.click()}
              >
                {displayAvatar ? (
                  <img src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-3xl font-bold">
                    {initials}
                  </div>
                )}
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>

              {/* Camera badge */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-colors"
              >
                <Camera className="w-4 h-4 text-white" />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Name & role */}
            <div className="text-center">
              <p className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {profile?.name}
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{profile?.email}</p>
              <span className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-medium border ${roleBadgeClass}`}>
                <ShieldCheck className="w-3 h-3" /> {roleLabel}
              </span>
            </div>

            {/* Preview notice + Save avatar */}
            {avatarPreview && (
              <div className="w-full space-y-2">
                <div className={`text-xs text-center px-3 py-2 rounded-lg ${
                  isDark ? 'bg-yellow-500/10 text-yellow-400' : 'bg-yellow-50 text-yellow-700'
                }`}>
                  Ảnh xem trước — chưa được lưu
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setAvatarPreview(null); setAvatarFile(null); }}
                    className={`flex-1 py-2 text-sm rounded-xl border transition-colors ${
                      isDark
                        ? 'border-white/15 text-gray-400 hover:bg-white/5'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    Huỷ
                  </button>
                  <button
                    onClick={handleSaveAvatar}
                    disabled={savingAvatar}
                    className="flex-1 py-2 text-sm rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-1"
                  >
                    {savingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Lưu ảnh
                  </button>
                </div>
              </div>
            )}

            {/* Joined date */}
            {profile?.createdAt && (
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                Tham gia:{' '}
                {new Date(profile.createdAt).toLocaleDateString('vi-VN', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </p>
            )}
          </div>

          {/* ── RIGHT: Tabs ────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Tab header */}
            <div className={`flex rounded-2xl p-1 border gap-1 ${
              isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'
            }`}>
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                    activeTab === id
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                      : isDark
                        ? 'text-gray-400 hover:text-white hover:bg-white/10'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* ── Tab: Thông tin chung ──────────────────────────────────── */}
            {activeTab === 'info' && (
              <div className={`rounded-2xl p-6 border ${
                isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'
              }`}>
                <h2 className={`text-base font-semibold mb-5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Thông tin cá nhân
                </h2>

                <form onSubmit={handleSaveInfo} className="space-y-4" noValidate>
                  {/* Họ tên */}
                  <Field label="Họ và tên" icon={User} error={formErrors.name} isDark={isDark}>
                    <Input
                      isDark={isDark}
                      id="profile-name"
                      type="text"
                      placeholder="Nguyễn Văn A"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      disabled={savingInfo}
                    />
                  </Field>

                  {/* Email — chỉ đọc */}
                  <Field label="Email" icon={Mail} isDark={isDark}>
                    <Input
                      isDark={isDark}
                      id="profile-email"
                      type="email"
                      value={form.email}
                      disabled
                      className="opacity-60 cursor-not-allowed"
                    />
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                      Email không thể thay đổi
                    </p>
                  </Field>

                  {/* Số điện thoại */}
                  <Field label="Số điện thoại" icon={Phone} error={formErrors.phone} isDark={isDark}>
                    <Input
                      isDark={isDark}
                      id="profile-phone"
                      type="tel"
                      placeholder="0912 345 678"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      disabled={savingInfo}
                    />
                  </Field>

                  {/* Submit */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={savingInfo}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-xl transition-all duration-200 disabled:opacity-60 shadow-lg shadow-red-500/20 hover:shadow-red-500/30 hover:scale-[1.02] active:scale-100"
                    >
                      {savingInfo
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...</>
                        : <><Save className="w-4 h-4" /> Lưu thay đổi</>
                      }
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ── Tab: Đổi mật khẩu ────────────────────────────────────── */}
            {activeTab === 'password' && (
              <div className={`rounded-2xl p-6 border ${
                isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'
              }`}>
                <h2 className={`text-base font-semibold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Đổi mật khẩu
                </h2>
                <p className={`text-sm mb-5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                  Mật khẩu mới phải có ít nhất 8 ký tự
                </p>

                <form onSubmit={handleSavePassword} className="space-y-4" noValidate>
                  {/* Mật khẩu hiện tại */}
                  <Field label="Mật khẩu hiện tại" icon={Lock} error={pwErrors.current} isDark={isDark}>
                    <PasswordInput
                      isDark={isDark}
                      id="pw-current"
                      placeholder="••••••••"
                      value={pwForm.current}
                      onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
                      disabled={savingPw}
                    />
                  </Field>

                  {/* Mật khẩu mới */}
                  <Field label="Mật khẩu mới" icon={Lock} error={pwErrors.newPw} isDark={isDark}>
                    <PasswordInput
                      isDark={isDark}
                      id="pw-new"
                      placeholder="Tối thiểu 8 ký tự"
                      value={pwForm.newPw}
                      onChange={(e) => setPwForm((f) => ({ ...f, newPw: e.target.value }))}
                      disabled={savingPw}
                    />
                    {/* Strength indicator */}
                    {pwForm.newPw && (
                      <div className="flex gap-1 mt-1">
                        {[...Array(4)].map((_, i) => {
                          const strength = Math.min(Math.floor(pwForm.newPw.length / 3), 4);
                          const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500'];
                          return (
                            <div
                              key={i}
                              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                i < strength ? colors[strength - 1] : (isDark ? 'bg-white/10' : 'bg-slate-200')
                              }`}
                            />
                          );
                        })}
                      </div>
                    )}
                  </Field>

                  {/* Xác nhận mật khẩu mới */}
                  <Field label="Xác nhận mật khẩu mới" icon={Lock} error={pwErrors.confirm} isDark={isDark}>
                    <PasswordInput
                      isDark={isDark}
                      id="pw-confirm"
                      placeholder="Nhập lại mật khẩu mới"
                      value={pwForm.confirm}
                      onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                      disabled={savingPw}
                    />
                    {/* Match indicator */}
                    {pwForm.confirm && (
                      <p className={`text-xs flex items-center gap-1 ${
                        pwForm.newPw === pwForm.confirm ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {pwForm.newPw === pwForm.confirm
                          ? <><CheckCircle2 className="w-3 h-3" /> Mật khẩu khớp</>
                          : <><AlertCircle className="w-3 h-3" /> Mật khẩu không khớp</>
                        }
                      </p>
                    )}
                  </Field>

                  {/* Submit */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={savingPw}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-xl transition-all duration-200 disabled:opacity-60 shadow-lg shadow-red-500/20 hover:shadow-red-500/30 hover:scale-[1.02] active:scale-100"
                    >
                      {savingPw
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang cập nhật...</>
                        : <><ShieldCheck className="w-4 h-4" /> Cập nhật mật khẩu</>
                      }
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
