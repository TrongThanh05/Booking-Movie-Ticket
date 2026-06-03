/**
 * UserList.jsx — Quản lý Khách hàng (with pagination)
 */
import { useState, useEffect, useCallback } from 'react';
import PageMeta from '../../components/common/PageMeta';
import PageBreadCrumb from '../../components/common/PageBreadCrumb';
import Badge from '../../components/ui/badge/Badge';
import Table from '../../components/ui/table/Table';
import Pagination from '../../components/ui/pagination/Pagination';
import { api } from '../../lib/api';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    currentPage: 1, totalPages: 1, totalItems: 0, limit: 10,
    hasNextPage: false, hasPrevPage: false,
  });

  const [searchDebounced, setSearchDebounced] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => { setSearchDebounced(search); setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/users', {
        params: { page, limit, search: searchDebounced },
      });
      const res = r.data;
      if (res.pagination) {
        setUsers(res.data);
        setPagination(res.pagination);
      } else {
        setUsers(Array.isArray(res) ? res : res.users || []);
      }
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchDebounced]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── Reset password ────────────────────────────────────────────────────────
  const [confirmReset, setConfirmReset] = useState(null); // { id, name, role }
  const [resetting, setResetting]       = useState(false);
  const [toast, setToast]               = useState(null); // { type, msg }

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleResetPassword = async () => {
    if (!confirmReset) return;
    setResetting(true);
    try {
      const { data } = await api.put(`/users/${confirmReset.id}/reset-password`);
      const defaultPwd = confirmReset.role === 'admin' ? 'Admin@123' : 'User@123';
      showToast('success', `${data.message} (mật khẩu: ${defaultPwd})`);
    } catch (err) {
      showToast('error', err?.response?.data?.message || 'Reset thất bại');
    } finally {
      setResetting(false);
      setConfirmReset(null);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

  return (<>
    <PageMeta title="Khách hàng | CineAdmin"/>
    <PageBreadCrumb pageTitle="Quản lý Khách hàng" items={[{label:'Khách hàng'}]}/>

    {/* Toast notification */}
    {toast && (
      <div
        className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 rounded-xl px-5 py-3.5 shadow-xl text-sm font-medium
          ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
      >
        {toast.type === 'success' ? (
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
          </svg>
        ) : (
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
        )}
        {toast.msg}
      </div>
    )}

    {/* Confirm dialog */}
    {confirmReset && (
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20">
            <svg className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
          </div>
          <h3 className="mb-2 text-base font-bold text-gray-800 dark:text-white">Reset mật khẩu?</h3>
          <p className="mb-1 text-sm text-gray-600 dark:text-gray-400">
            Tài khoản: <span className="font-semibold text-gray-800 dark:text-white">{confirmReset.name}</span>
          </p>
          <p className="mb-5 text-sm text-gray-600 dark:text-gray-400">
            Mật khẩu sẽ được đặt về{' '}
            <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs font-bold text-gray-800 dark:bg-gray-700 dark:text-white">
              {confirmReset.role === 'admin' ? 'Admin@123' : 'User@123'}
            </span>
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmReset(null)}
              disabled={resetting}
              className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Huỷ
            </button>
            <button
              onClick={handleResetPassword}
              disabled={resetting}
              className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
            >
              {resetting ? 'Đang reset...' : 'Xác nhận'}
            </button>
          </div>
        </div>
      </div>
    )}

    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, email, SĐT..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-10 w-full sm:w-72 rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm
              focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/10
              dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-brand-500 dark:focus:bg-gray-900 transition-colors"
          />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{pagination.totalItems} tài khoản</p>
      </div>
    </div>

    {loading
      ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800"/>)}</div>
      : (
        <Table>
          <Table.Head>
            <tr>
              <Table.Header>Tên</Table.Header>
              <Table.Header>Email</Table.Header>
              <Table.Header>SĐT</Table.Header>
              <Table.Header>Vai trò</Table.Header>
              <Table.Header>Ngày tạo</Table.Header>
              <Table.Header>Hành động</Table.Header>
            </tr>
          </Table.Head>
          <Table.Body>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-gray-400 dark:text-gray-500">
                  Không tìm thấy tài khoản nào
                </td>
              </tr>
            ) : users.map(u => (
              <Table.Row key={u._id}>
                <Table.Cell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-600 text-sm font-bold dark:bg-brand-500/15 dark:text-brand-400">
                      {u.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <p className="font-semibold text-gray-800 dark:text-white/90">{u.name}</p>
                  </div>
                </Table.Cell>
                <Table.Cell>{u.email}</Table.Cell>
                <Table.Cell>{u.phone || '—'}</Table.Cell>
                <Table.Cell>
                  <Badge variant="light" color={u.role === 'admin' ? 'error' : 'primary'} size="sm">
                    {u.role === 'admin' ? 'Admin' : 'User'}
                  </Badge>
                </Table.Cell>
                <Table.Cell>{fmtDate(u.createdAt)}</Table.Cell>
                <Table.Cell>
                  <button
                    onClick={() => setConfirmReset({ id: u._id, name: u.name, role: u.role })}
                    title="Reset mật khẩu về mặc định"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700
                      transition hover:bg-amber-100 hover:border-amber-300
                      dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                    </svg>
                    Reset mật khẩu
                  </button>
                </Table.Cell>
              </Table.Row>
            ))}
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
      onLimitChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
    />
  </>);
};

export default UserList;
