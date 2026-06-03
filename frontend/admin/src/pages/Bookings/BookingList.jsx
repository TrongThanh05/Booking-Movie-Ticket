/**
 * BookingList.jsx — Quản lý Đơn hàng (UPGRADED)
 * Thêm: status tabs, payment filter, check-in badge, link chi tiết
 */
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageMeta from '../../components/common/PageMeta';
import PageBreadCrumb from '../../components/common/PageBreadCrumb';
import Badge from '../../components/ui/badge/Badge';
import Table from '../../components/ui/table/Table';
import Pagination from '../../components/ui/pagination/Pagination';
import { api } from '../../lib/api';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

const STATUS_TABS = [
  { value: 'all',       label: 'Tất cả' },
  { value: 'pending',   label: '⏳ Chờ xử lý' },
  { value: 'confirmed', label: '✅ Đã xác nhận' },
  { value: 'completed', label: '🎬 Hoàn thành' },
  { value: 'cancelled', label: '❌ Đã hủy' },
];

const STATUS_BADGE = {
  confirmed: { l: 'Đã xác nhận', c: 'success' },
  completed: { l: 'Hoàn thành',  c: 'primary' },
  pending:   { l: 'Chờ xử lý',  c: 'warning' },
  cancelled: { l: 'Đã hủy',     c: 'error' },
};

const PAY_BADGE = {
  paid:     { l: 'Đã thanh toán', c: 'success' },
  pending:  { l: 'Chờ TT',        c: 'warning' },
  failed:   { l: 'Thất bại',      c: 'error' },
  refunded: { l: 'Hoàn tiền',     c: 'primary' },
};

const BookingList = () => {
  const [bookings, setBookings]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [searchDebounced, setSD]    = useState('');
  const [activeTab, setActiveTab]   = useState('all');
  const [page, setPage]             = useState(1);
  const [limit, setLimit]           = useState(12);
  const [pagination, setPagination] = useState({
    currentPage: 1, totalPages: 1, totalItems: 0, limit: 12,
  });

  // Stale booking stats
  const [staleStats, setStaleStats]     = useState(null);
  const [cleaning, setCleaning]         = useState(false);

  const fetchStaleStats = useCallback(async () => {
    try {
      const r = await api.get('/bookings/admin/stale-stats');
      setStaleStats(r.data);
    } catch { /* silent */ }
  }, []);

  // Fetch stale stats khi mount + mỗi 30s
  useEffect(() => {
    fetchStaleStats();
    const t = setInterval(fetchStaleStats, 30_000);
    return () => clearInterval(t);
  }, [fetchStaleStats]);

  const handleCleanup = async () => {
    setCleaning(true);
    try {
      const r = await api.post('/bookings/admin/expire-stale');
      toast.success(r.data.message || 'Đã dọn dẹp xong');
      fetchStaleStats();
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally { setCleaning(false); }
  };

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSD(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when tab changes
  useEffect(() => { setPage(1); }, [activeTab]);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit, search: searchDebounced };
      if (activeTab !== 'all') params.status = activeTab;
      const r   = await api.get('/bookings/all', { params });
      const res = r.data;
      setBookings(res.pagination ? res.data : (Array.isArray(res) ? res : []));
      if (res.pagination) setPagination(res.pagination);
    } catch { setBookings([]); }
    finally  { setLoading(false); }
  }, [page, limit, searchDebounced, activeTab]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const fmtDate = (d) => d
    ? new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <>
      <PageMeta title="Đơn hàng / Vé | CineAdmin" />
      <PageBreadCrumb pageTitle="Quản lý Đơn hàng" items={[{ label: 'Đơn hàng' }]} />

      {/* ── Stale Booking Warning Banner ──────────────────────────────────── */}
      {staleStats?.stale_count > 0 && (
        <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-warning-200 bg-warning-50 dark:border-warning-500/30 dark:bg-warning-500/10 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="text-xl">⏳</span>
            <div>
              <p className="text-sm font-semibold text-warning-700 dark:text-warning-400">
                {staleStats.stale_count} booking treo chưa thanh toán (quá {staleStats.expire_minutes} phút)
              </p>
              <p className="text-xs text-warning-600/80 dark:text-warning-400/70 mt-0.5">
                Tổng chưa TT: {staleStats.pending_count} · Ghế bị chiếm dụng sẽ được giải phóng khi dọn dẹp
              </p>
            </div>
          </div>
          <button
            onClick={handleCleanup}
            disabled={cleaning}
            className="shrink-0 rounded-xl bg-warning-500 px-4 py-2 text-sm font-semibold text-white hover:bg-warning-600 disabled:opacity-60 transition-colors"
          >
            {cleaning ? '⏳ Đang dọn...' : '🗑️ Dọn dẹp ngay'}
          </button>
        </div>
      )}

      {/* ── Status Tabs ───────────────────────────────────────────────────── */}

      <div className="mb-5 flex gap-2 flex-wrap">
        {STATUS_TABS.map(tab => (
          <button key={tab.value} onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === tab.value
                ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
                : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-brand-300 hover:text-brand-600'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Search bar + count ────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text" placeholder="Tìm theo mã vé, tên khách..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-10 w-full sm:w-72 rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm
                focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/10
                dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-brand-500 dark:focus:bg-gray-900 transition-colors"
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {pagination.totalItems.toLocaleString('vi-VN')} đơn hàng
          </p>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800"/>)}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
          <Table>
            <Table.Head>
              <tr>
                <Table.Header>Mã vé</Table.Header>
                <Table.Header>Khách hàng</Table.Header>
                <Table.Header>Phim & Rạp</Table.Header>
                <Table.Header>Ghế</Table.Header>
                <Table.Header>Tổng tiền</Table.Header>
                <Table.Header>Thanh toán</Table.Header>
                <Table.Header>Trạng thái</Table.Header>
                <Table.Header>Ngày đặt</Table.Header>
                <Table.Header className="text-right">Chi tiết</Table.Header>
              </tr>
            </Table.Head>
            <Table.Body>
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">🎟️</span>
                      <p className="text-gray-400 dark:text-gray-500 text-sm">Không tìm thấy đơn hàng nào</p>
                    </div>
                  </td>
                </tr>
              ) : bookings.map(b => (
                <Table.Row key={b._id}>
                  {/* Mã vé + check-in */}
                  <Table.Cell>
                    <span className="font-mono text-xs font-bold text-brand-500">{b.booking_code}</span>
                    {b.checked_in && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400 px-1.5 py-0.5 rounded-full font-medium">
                        ✓ Đã vào
                      </span>
                    )}
                  </Table.Cell>

                  {/* Khách hàng */}
                  <Table.Cell>
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white/90 truncate max-w-[110px]">{b.user?.name || 'N/A'}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[110px]">{b.user?.email}</p>
                    </div>
                  </Table.Cell>

                  {/* Phim + Rạp */}
                  <Table.Cell>
                    <p className="truncate max-w-[140px] font-medium text-gray-700 dark:text-gray-200 text-sm">
                      {b.show?.movie?.title || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-400 truncate max-w-[140px]">
                      {b.show?.cinema?.name || ''}
                    </p>
                  </Table.Cell>

                  {/* Ghế */}
                  <Table.Cell>
                    <span className="text-xs text-gray-600 dark:text-gray-300">
                      {b.tickets?.map(t => t.seat_id).join(', ') || '—'}
                    </span>
                  </Table.Cell>

                  {/* Tổng tiền */}
                  <Table.Cell>
                    <span className="whitespace-nowrap font-semibold text-gray-800 dark:text-white/90">
                      {fmt(b.total_amount)}
                    </span>
                    {b.discount_amount > 0 && (
                      <p className="text-[10px] text-success-500">-{fmt(b.discount_amount)}</p>
                    )}
                  </Table.Cell>

                  {/* Thanh toán */}
                  <Table.Cell>
                    <div className="space-y-1">
                      <Badge variant="light" color="light" size="sm">{b.payment_method || '—'}</Badge>
                      {b.payment_status && (
                        <Badge variant="light" color={PAY_BADGE[b.payment_status]?.c || 'light'} size="sm">
                          {PAY_BADGE[b.payment_status]?.l || b.payment_status}
                        </Badge>
                      )}
                    </div>
                  </Table.Cell>

                  {/* Trạng thái */}
                  <Table.Cell>
                    <Badge variant="light" color={STATUS_BADGE[b.status]?.c || 'light'} size="sm">
                      {STATUS_BADGE[b.status]?.l || b.status}
                    </Badge>
                  </Table.Cell>

                  {/* Ngày đặt */}
                  <Table.Cell>
                    <span className="whitespace-nowrap text-xs text-gray-500">{fmtDate(b.booked_at)}</span>
                  </Table.Cell>

                  {/* Link chi tiết */}
                  <Table.Cell>
                    <div className="flex justify-end">
                      <Link to={`/admin/bookings/${b._id}`}>
                        <button className="rounded-lg p-2 text-gray-500 hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10 transition-colors" title="Xem chi tiết">
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                          </svg>
                        </button>
                      </Link>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      )}

      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        limit={pagination.limit}
        onPageChange={setPage}
        onLimitChange={(n) => { setLimit(n); setPage(1); }}
      />
    </>
  );
};

export default BookingList;
