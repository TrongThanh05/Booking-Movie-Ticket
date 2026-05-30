/**
 * BookingList.jsx — Quản lý Đơn hàng (with pagination)
 */
import { useState, useEffect, useCallback } from 'react';
import PageMeta from '../../components/common/PageMeta';
import PageBreadCrumb from '../../components/common/PageBreadCrumb';
import Badge from '../../components/ui/badge/Badge';
import Table from '../../components/ui/table/Table';
import Pagination from '../../components/ui/pagination/Pagination';
import { api } from '../../lib/api';

const fmt = (n) => new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(n||0);

const BookingList = () => {
  const [bookings, setBookings] = useState([]);
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

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/bookings/all', {
        params: { page, limit, search: searchDebounced },
      });
      const res = r.data;
      if (res.pagination) {
        setBookings(res.data);
        setPagination(res.pagination);
      } else {
        setBookings(Array.isArray(res) ? res : res.bookings || []);
      }
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchDebounced]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const statusMap = { confirmed:{l:'Đã xác nhận',c:'success'}, completed:{l:'Hoàn thành',c:'primary'}, pending:{l:'Chờ xử lý',c:'warning'}, cancelled:{l:'Đã huỷ',c:'error'} };
  const fmtDate = (d) => d ? new Date(d).toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';

  return (<>
    <PageMeta title="Đơn hàng / Vé | CineAdmin"/>
    <PageBreadCrumb pageTitle="Quản lý Đơn hàng" items={[{label:'Đơn hàng'}]}/>

    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text" placeholder="Tìm theo mã vé..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-10 w-full sm:w-64 rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm
              focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/10
              dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-brand-500 dark:focus:bg-gray-900 transition-colors"
          />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{pagination.totalItems} đơn hàng</p>
      </div>
    </div>

    {loading ? <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800"/>)}</div> : (
      <Table>
        <Table.Head><tr><Table.Header>Mã vé</Table.Header><Table.Header>Khách hàng</Table.Header><Table.Header>Phim</Table.Header><Table.Header>Ghế</Table.Header><Table.Header>Tổng tiền</Table.Header><Table.Header>Thanh toán</Table.Header><Table.Header>Trạng thái</Table.Header><Table.Header>Ngày đặt</Table.Header></tr></Table.Head>
        <Table.Body>
          {bookings.length === 0 ? (
            <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-400 dark:text-gray-500">Không tìm thấy đơn hàng nào</td></tr>
          ) : bookings.map(b => (
            <Table.Row key={b._id}>
              <Table.Cell><span className="font-mono text-xs font-semibold text-brand-500">{b.booking_code}</span></Table.Cell>
              <Table.Cell><div><p className="font-medium text-gray-800 dark:text-white/90">{b.user?.name}</p><p className="text-xs text-gray-400">{b.user?.email}</p></div></Table.Cell>
              <Table.Cell><p className="truncate max-w-[120px]">{b.show?.movie?.title||'N/A'}</p></Table.Cell>
              <Table.Cell><span className="text-xs">{b.tickets?.map(t=>t.seat_id).join(', ')}</span></Table.Cell>
              <Table.Cell className="whitespace-nowrap font-medium">{fmt(b.total_amount)}</Table.Cell>
              <Table.Cell><Badge variant="light" color="light" size="sm">{b.payment_method||'—'}</Badge></Table.Cell>
              <Table.Cell><Badge variant="light" color={statusMap[b.status]?.c||'light'} size="sm">{statusMap[b.status]?.l||b.status}</Badge></Table.Cell>
              <Table.Cell className="whitespace-nowrap text-xs">{fmtDate(b.booked_at)}</Table.Cell>
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
export default BookingList;
