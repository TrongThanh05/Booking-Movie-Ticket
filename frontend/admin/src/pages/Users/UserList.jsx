/**
 * UserList.jsx — Quản lý Tài khoản (4 phân cấp: user/staff/theater-manager/admin)
 * Chức năng: xem danh sách, tạo mới, sửa role, ban/unban, gán rạp, reset mật khẩu, xoá
 */
import { useState, useEffect, useCallback } from 'react';
import PageMeta from '../../components/common/PageMeta';
import PageBreadCrumb from '../../components/common/PageBreadCrumb';
import Badge from '../../components/ui/badge/Badge';
import Table from '../../components/ui/table/Table';
import Pagination from '../../components/ui/pagination/Pagination';
import { api } from '../../lib/api';

// ── Cấu hình vai trò ───────────────────────────────────────────────────────
const ROLE_CONFIG = {
  admin:            { label: 'Admin',         color: 'error',   icon: '👑' },
  'theater-manager':{ label: 'Quản lý rạp',  color: 'warning', icon: '🎬' },
  staff:            { label: 'Nhân viên',     color: 'info',    icon: '🎫' },
  user:             { label: 'Khách hàng',    color: 'primary', icon: '👤' },
};
const ROLES = Object.keys(ROLE_CONFIG);

// ── Toast ──────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 rounded-xl px-5 py-3.5 shadow-2xl text-sm font-semibold transition-all
      ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
      {toast.type === 'success' ? '✓' : '✗'} {toast.msg}
    </div>
  );
}

// ── Confirm Dialog ─────────────────────────────────────────────────────────
function ConfirmDialog({ open, title, desc, confirmLabel, confirmClass, loading, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <h3 className="mb-2 text-base font-bold text-gray-800 dark:text-white">{title}</h3>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">{desc}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            Huỷ
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 ${confirmClass}`}>
            {loading ? 'Đang xử lý...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Tạo / Sửa Tài khoản ─────────────────────────────────────────────
function UserFormModal({ open, user, theaters, onClose, onSaved }) {
  const isEdit = Boolean(user);
  const [form, setForm] = useState({ name:'', email:'', password:'', phone:'', role:'user', theater_id:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      setForm(isEdit
        ? {
            name:       user.name       || '',
            email:      user.email      || '',
            password:   '',
            phone:      user.phone      || '',
            role:       user.role       || 'user',
            theater_id: user.theater_id || '',
          }
        : { name:'', email:'', password:'', phone:'', role:'user', theater_id:'' }
      );
    }
  }, [open, user]);

  if (!open) return null;

  const needsTheater = ['staff','theater-manager'].includes(form.role);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isEdit) {
        // 1. Cập nhật thông tin cơ bản (name, phone)
        await api.put(`/users/${user._id}`, { name: form.name, phone: form.phone });

        // 2. Đổi role nếu thay đổi
        if (form.role !== user.role) {
          await api.put(`/users/${user._id}/role`, { role: form.role });
        }

        // 3. Gán / huỷ gán rạp
        const oldTheaterId = user.theater_id?._id || user.theater_id || '';
        const newTheaterId = form.theater_id || '';
        if (needsTheater && newTheaterId && newTheaterId !== oldTheaterId) {
          await api.put(`/users/${user._id}/assign-theater`, { theater_id: newTheaterId });
        } else if (!needsTheater && oldTheaterId) {
          await api.delete(`/users/${user._id}/assign-theater`);
        }
      } else {
        // Tạo mới
        const payload = { ...form };
        if (!payload.theater_id || !needsTheater) delete payload.theater_id;
        if (!payload.password) delete payload.password;
        await api.post('/users/admin/create', payload);
      }
      onSaved(isEdit ? 'Cập nhật thành công' : 'Tạo tài khoản thành công');
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <h2 className="text-base font-bold text-gray-800 dark:text-white">
            {isEdit ? `✏️ Sửa: ${user.name}` : '➕ Tạo tài khoản mới'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error && <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">{error}</p>}

          {/* Thông tin cơ bản — luôn hiển thị */}
          <Field label="Họ và tên *">
            <input required value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Nguyễn Văn A" className={inputCls}/>
          </Field>

          {!isEdit && (
            <Field label="Email *">
              <input required type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="example@email.com" className={inputCls}/>
            </Field>
          )}

          {isEdit && (
            <Field label="Email">
              <input disabled value={form.email} className={`${inputCls} cursor-not-allowed opacity-60`}/>
            </Field>
          )}

          {!isEdit && (
            <Field label="Mật khẩu *">
              <input required type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Tối thiểu 6 ký tự" className={inputCls}/>
            </Field>
          )}

          <Field label="Số điện thoại">
            <input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="0901234567" className={inputCls}/>
          </Field>

          {/* Phân quyền */}
          <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Phân quyền</p>
            <Field label="Vai trò">
              <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value,theater_id:''}))} className={inputCls}>
                {ROLES.map(r => (
                  <option key={r} value={r}>{ROLE_CONFIG[r].icon} {ROLE_CONFIG[r].label}</option>
                ))}
              </select>
            </Field>
          </div>

          {needsTheater && (
            <Field label="Rạp chiếu phim">
              <select value={form.theater_id} onChange={e=>setForm(f=>({...f,theater_id:e.target.value}))} className={inputCls}>
                <option value="">-- Chọn rạp --</option>
                {theaters.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </Field>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={loading}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">
              Huỷ
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
              {loading ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo tài khoản'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls = `w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm
  focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/10
  dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-brand-500`;

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</label>
      {children}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
const UserList = () => {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage]         = useState(1);
  const [limit, setLimit]       = useState(10);
  const [pagination, setPagination] = useState({ currentPage:1, totalPages:1, totalItems:0, limit:10 });
  const [searchDebounced, setSearchDebounced] = useState('');
  const [theaters, setTheaters] = useState([]);

  // Modals / dialogs state
  const [formModal, setFormModal] = useState({ open:false, user:null }); // create/edit
  const [confirmBan,   setConfirmBan]   = useState(null); // { user, ban }
  const [confirmDel,   setConfirmDel]   = useState(null); // user
  const [confirmReset, setConfirmReset] = useState(null); // user
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearchDebounced(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // fetch theaters for form
  useEffect(() => {
    api.get('/theaters').then(r => setTheaters(Array.isArray(r.data) ? r.data : r.data.data || [])).catch(()=>{});
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit, search: searchDebounced };
      if (roleFilter) params.role = roleFilter;
      const r = await api.get('/users', { params });
      const res = r.data;
      if (res.pagination) {
        setUsers(res.data);
        setPagination(res.pagination);
      } else {
        setUsers(Array.isArray(res) ? res : res.users || []);
      }
    } catch { setUsers([]); }
    finally { setLoading(false); }
  }, [page, limit, searchDebounced, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleBanConfirm = async () => {
    setActionLoading(true);
    try {
      await api.put(`/users/${confirmBan.user._id}/ban`, { ban: confirmBan.ban });
      showToast('success', confirmBan.ban ? `Đã khoá "${confirmBan.user.name}"` : `Đã mở khoá "${confirmBan.user.name}"`);
      fetchUsers();
    } catch (err) { showToast('error', err?.response?.data?.message || 'Thất bại'); }
    finally { setActionLoading(false); setConfirmBan(null); }
  };

  const handleDeleteConfirm = async () => {
    setActionLoading(true);
    try {
      await api.delete(`/users/${confirmDel._id}`);
      showToast('success', `Đã xoá "${confirmDel.name}"`);
      fetchUsers();
    } catch (err) { showToast('error', err?.response?.data?.message || 'Thất bại'); }
    finally { setActionLoading(false); setConfirmDel(null); }
  };

  const handleResetConfirm = async () => {
    setActionLoading(true);
    try {
      const { data } = await api.put(`/users/${confirmReset._id}/reset-password`);
      showToast('success', `${data.message} (mật khẩu: ${data.defaultPassword})`);
    } catch (err) { showToast('error', err?.response?.data?.message || 'Thất bại'); }
    finally { setActionLoading(false); setConfirmReset(null); }
  };

  const fmtDate = d => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

  const theaterName = (tid) => {
    if (!tid) return null;
    const t = theaters.find(t => t._id === (tid?._id || tid));
    return t?.name || null;
  };

  return (<>
    <PageMeta title="Quản lý Tài khoản | CineAdmin"/>
    <PageBreadCrumb pageTitle="Quản lý Tài khoản" items={[{ label:'Tài khoản' }]}/>

    <Toast toast={toast}/>

    {/* Ban confirm */}
    <ConfirmDialog
      open={Boolean(confirmBan)}
      title={confirmBan?.ban ? '🔒 Khoá tài khoản?' : '🔓 Mở khoá tài khoản?'}
      desc={confirmBan?.ban
        ? `Tài khoản "${confirmBan?.user?.name}" sẽ bị khoá và không thể đăng nhập.`
        : `Tài khoản "${confirmBan?.user?.name}" sẽ được phép đăng nhập trở lại.`}
      confirmLabel={confirmBan?.ban ? 'Khoá' : 'Mở khoá'}
      confirmClass={confirmBan?.ban ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}
      loading={actionLoading}
      onConfirm={handleBanConfirm}
      onCancel={() => setConfirmBan(null)}
    />

    {/* Delete confirm */}
    <ConfirmDialog
      open={Boolean(confirmDel)}
      title="🗑️ Xoá tài khoản?"
      desc={`Hành động này không thể hoàn tác. Tài khoản "${confirmDel?.name}" sẽ bị xoá vĩnh viễn.`}
      confirmLabel="Xoá vĩnh viễn"
      confirmClass="bg-red-500 hover:bg-red-600"
      loading={actionLoading}
      onConfirm={handleDeleteConfirm}
      onCancel={() => setConfirmDel(null)}
    />

    {/* Reset password confirm */}
    <ConfirmDialog
      open={Boolean(confirmReset)}
      title="🔑 Reset mật khẩu?"
      desc={`Mật khẩu của "${confirmReset?.name}" sẽ được đặt về mặc định theo role.`}
      confirmLabel="Xác nhận reset"
      confirmClass="bg-amber-500 hover:bg-amber-600"
      loading={actionLoading}
      onConfirm={handleResetConfirm}
      onCancel={() => setConfirmReset(null)}
    />

    {/* Form create/edit */}
    <UserFormModal
      open={formModal.open}
      user={formModal.user}
      theaters={theaters}
      onClose={() => setFormModal({ open:false, user:null })}
      onSaved={(msg) => { showToast('success', msg); fetchUsers(); }}
    />

    {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" placeholder="Tìm theo tên, email, SĐT..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="h-10 w-64 rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"/>
        </div>

        {/* Role filter */}
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 focus:outline-none">
          <option value="">Tất cả vai trò</option>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_CONFIG[r].icon} {ROLE_CONFIG[r].label}</option>)}
        </select>

        <span className="text-sm text-gray-500 dark:text-gray-400">{pagination.totalItems} tài khoản</span>
      </div>

      {/* Tạo mới */}
      <button onClick={() => setFormModal({ open:true, user:null })}
        className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 transition-colors">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Tạo tài khoản
      </button>
    </div>

    {/* ── Table ───────────────────────────────────────────────────────────── */}
    {loading
      ? <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"/>)}</div>
      : (
        <Table>
          <Table.Head>
            <tr>
              <Table.Header>Tài khoản</Table.Header>
              <Table.Header>Liên hệ</Table.Header>
              <Table.Header>Vai trò</Table.Header>
              <Table.Header>Rạp / Trạng thái</Table.Header>
              <Table.Header>Ngày tạo</Table.Header>
              <Table.Header>Hành động</Table.Header>
            </tr>
          </Table.Head>
          <Table.Body>
            {users.length === 0 ? (
              <tr><td colSpan={6} className="py-16 text-center text-gray-400">Không tìm thấy tài khoản nào</td></tr>
            ) : users.map(u => {
              const cfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.user;
              const tName = theaterName(u.theater_id);
              return (
                <Table.Row key={u._id}>
                  {/* Tài khoản */}
                  <Table.Cell>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold
                        ${u.isBanned ? 'bg-red-100 text-red-500 dark:bg-red-500/15' : 'bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400'}`}>
                        {u.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-white/90">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </div>
                  </Table.Cell>

                  {/* Liên hệ */}
                  <Table.Cell>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{u.phone || '—'}</span>
                  </Table.Cell>

                  {/* Vai trò */}
                  <Table.Cell>
                    <Badge variant="light" color={cfg.color} size="sm">
                      {cfg.icon} {cfg.label}
                    </Badge>
                  </Table.Cell>

                  {/* Rạp / Trạng thái */}
                  <Table.Cell>
                    <div className="flex flex-col gap-1">
                      {tName && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
                          🏛️ {tName}
                        </span>
                      )}
                      {u.isBanned ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-500/10">
                          🔒 Bị khoá
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600 dark:bg-green-500/10">
                          ✓ Hoạt động
                        </span>
                      )}
                    </div>
                  </Table.Cell>

                  {/* Ngày tạo */}
                  <Table.Cell>
                    <span className="text-sm text-gray-500">{fmtDate(u.createdAt)}</span>
                  </Table.Cell>

                  {/* Hành động */}
                  <Table.Cell>
                    <div className="flex items-center justify-end gap-1">
                      {/* Sửa — pencil SVG đồng bộ FoodList */}
                      <button
                        onClick={() => setFormModal({ open:true, user:u })}
                        title="Chỉnh sửa tài khoản"
                        className="rounded-lg p-2 text-gray-500 hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10 transition-colors"
                      >
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>

                      {/* Ban/Unban */}
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => setConfirmBan({ user:u, ban:!u.isBanned })}
                          title={u.isBanned ? 'Mở khoá tài khoản' : 'Khoá tài khoản'}
                          className={`rounded-lg p-2 transition-colors ${
                            u.isBanned
                              ? 'text-gray-500 hover:bg-green-50 hover:text-green-500 dark:hover:bg-green-500/10'
                              : 'text-gray-500 hover:bg-orange-50 hover:text-orange-500 dark:hover:bg-orange-500/10'
                          }`}
                        >
                          {u.isBanned ? (
                            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                              <path d="M7 11V7a5 5 0 019.9-1"/>
                            </svg>
                          ) : (
                            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                              <path d="M7 11V7a5 5 0 0110 0v4"/>
                            </svg>
                          )}
                        </button>
                      )}

                      {/* Reset mật khẩu */}
                      <button
                        onClick={() => setConfirmReset(u)}
                        title="Reset mật khẩu về mặc định"
                        className="rounded-lg p-2 text-gray-500 hover:bg-amber-50 hover:text-amber-500 dark:hover:bg-amber-500/10 transition-colors"
                      >
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                        </svg>
                      </button>

                      {/* Xoá — trash SVG đồng bộ FoodList */}
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => setConfirmDel(u)}
                          title="Xoá tài khoản"
                          className="rounded-lg p-2 text-gray-500 hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10 transition-colors"
                        >
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <polyline points="3,6 5,6 21,6"/>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table>
      )
    }

    <Pagination
      currentPage={pagination.currentPage}
      totalPages={pagination.totalPages}
      totalItems={pagination.totalItems}
      limit={pagination.limit}
      onPageChange={setPage}
      onLimitChange={(l) => { setLimit(l); setPage(1); }}
    />
  </>);
};



export default UserList;
