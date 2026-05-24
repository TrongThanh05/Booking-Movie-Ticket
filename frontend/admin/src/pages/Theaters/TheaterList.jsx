/**
 * TheaterList.jsx — Quản lý Cụm Rạp (with pagination + RBAC UI)
 *
 * Phân quyền hiển thị:
 *   Super-admin    → Thấy tất cả rạp, nút Thêm rạp, nút Sửa
 *   Cinema Manager → Chỉ thấy rạp mình quản lý (server đã filter),
 *                    KHÔNG có nút Thêm rạp, KHÔNG có nút Sửa
 */
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import PageBreadCrumb from '../../components/common/PageBreadCrumb';
import Badge from '../../components/ui/badge/Badge';
import Button from '../../components/ui/button/Button';
import Table from '../../components/ui/table/Table';
import Pagination from '../../components/ui/pagination/Pagination';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/useAuth';

const TheaterList = () => {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  // isSuperAdmin = true  → theater_id === null  → toàn quyền
  // isSuperAdmin = false → Cinema Manager       → chỉ quản lý rạp được gán
  const { isSuperAdmin } = useAuth();

  const [theaters, setTheaters] = useState([]);
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

  const fetchTheaters = useCallback(async () => {
    setLoading(true);
    try {
      // API GET /theaters tự động scope theo token:
      //   Super-admin  → trả tất cả (có phân trang + search)
      //   Cinema Mgr   → trả chỉ rạp của mình (1 item)
      const r = await api.get('/theaters', {
        params: { page, limit, search: searchDebounced },
      });
      const res = r.data;
      if (res.pagination) {
        setTheaters(res.data);
        setPagination(res.pagination);
      } else {
        setTheaters(Array.isArray(res) ? res : res.theaters || []);
      }
    } catch {
      setTheaters([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchDebounced]);

  useEffect(() => { fetchTheaters(); }, [fetchTheaters]);

  return (
    <>
      <PageMeta title="Cụm Rạp | CineAdmin" />
      <PageBreadCrumb pageTitle="Quản lý Cụm Rạp" items={[{ label: 'Cụm Rạp' }]} />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm rạp..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-10 w-full sm:w-64 rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm
                focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/10
                dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-brand-500 dark:focus:bg-gray-900 transition-colors"
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{pagination.totalItems} cụm rạp</p>
        </div>

        {/* ── Nút Thêm rạp: CHỈ Super-admin ── */}
        {isSuperAdmin && (
          <Link to="/admin/theaters/create">
            <Button>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Thêm rạp
            </Button>
          </Link>
        )}
      </div>

      {loading
        ? <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800"/>)}</div>
        : (
          <Table>
            <Table.Head>
              <tr>
                <Table.Header>Tên rạp</Table.Header>
                <Table.Header>Khu vực</Table.Header>
                <Table.Header>Địa chỉ</Table.Header>
                <Table.Header>Phòng</Table.Header>
                <Table.Header>SĐT</Table.Header>
                <Table.Header className="text-right">Thao tác</Table.Header>
              </tr>
            </Table.Head>
            <Table.Body>
              {theaters.length === 0
                ? <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-400 dark:text-gray-500">Không tìm thấy rạp nào</td></tr>
                : theaters.map(t => (
                  <Table.Row key={t._id}>
                    <Table.Cell><p className="font-semibold text-gray-800 dark:text-white/90">{t.name}</p></Table.Cell>
                    <Table.Cell><Badge variant="light" color="info" size="sm">{t.location}</Badge></Table.Cell>
                    <Table.Cell><p className="truncate max-w-[200px]">{t.address}</p></Table.Cell>
                    <Table.Cell><span className="font-medium">{t.totalRooms}</span></Table.Cell>
                    <Table.Cell>{t.phone || '—'}</Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center justify-end gap-1">
                        {/* Xem phòng chiếu: mọi admin đều xem được */}
                        <Link to={`/admin/theaters/${t._id}/rooms`}>
                          <button
                            className="rounded-lg p-2 text-gray-500 hover:bg-success-50 hover:text-success-500 transition-colors"
                            title="Phòng chiếu"
                          >
                            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <rect x="2" y="3" width="20" height="14" rx="2"/>
                              <line x1="8" y1="21" x2="16" y2="21"/>
                              <line x1="12" y1="17" x2="12" y2="21"/>
                            </svg>
                          </button>
                        </Link>

                        {/* ── Nút Sửa: CHỈ Super-admin ── */}
                        {isSuperAdmin && (
                          <Link to={`/admin/theaters/edit/${t._id}`}>
                            <button
                              className="rounded-lg p-2 text-gray-500 hover:bg-brand-50 hover:text-brand-500 transition-colors"
                              title="Chỉnh sửa"
                            >
                              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                          </Link>
                        )}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))
              }
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
    </>
  );
};

export default TheaterList;
