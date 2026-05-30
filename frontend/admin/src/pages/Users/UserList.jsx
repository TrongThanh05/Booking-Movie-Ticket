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

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

  return (<>
    <PageMeta title="Khách hàng | CineAdmin"/>
    <PageBreadCrumb pageTitle="Quản lý Khách hàng" items={[{label:'Khách hàng'}]}/>

    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text" placeholder="Tìm kiếm theo tên, email, SĐT..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-10 w-full sm:w-72 rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm
              focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/10
              dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-brand-500 dark:focus:bg-gray-900 transition-colors"
          />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{pagination.totalItems} tài khoản</p>
      </div>
    </div>

    {loading ? <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800"/>)}</div> : (
      <Table>
        <Table.Head><tr><Table.Header>Tên</Table.Header><Table.Header>Email</Table.Header><Table.Header>SĐT</Table.Header><Table.Header>Vai trò</Table.Header><Table.Header>Ngày tạo</Table.Header></tr></Table.Head>
        <Table.Body>
          {users.length === 0 ? (
            <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400 dark:text-gray-500">Không tìm thấy tài khoản nào</td></tr>
          ) : users.map(u => (
            <Table.Row key={u._id}>
              <Table.Cell>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-600 text-sm font-bold dark:bg-brand-500/15 dark:text-brand-400">{u.name?.[0]?.toUpperCase()||'?'}</div>
                  <p className="font-semibold text-gray-800 dark:text-white/90">{u.name}</p>
                </div>
              </Table.Cell>
              <Table.Cell>{u.email}</Table.Cell>
              <Table.Cell>{u.phone||'—'}</Table.Cell>
              <Table.Cell><Badge variant="light" color={u.role==='admin'?'error':'primary'} size="sm">{u.role==='admin'?'Admin':'User'}</Badge></Table.Cell>
              <Table.Cell>{fmtDate(u.createdAt)}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    )}

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
