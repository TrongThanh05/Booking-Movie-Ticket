/**
 * ShowList.jsx — Quản lý Lịch Chiếu (with pagination)
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

const ShowList = () => {
  const [shows, setShows] = useState([]);
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

  const fetchShows = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/shows', {
        params: { page, limit, search: searchDebounced },
      });
      const res = r.data;
      if (res.pagination) {
        setShows(res.data);
        setPagination(res.pagination);
      } else {
        setShows(Array.isArray(res) ? res : res.shows || []);
      }
    } catch {
      setShows([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchDebounced]);

  useEffect(() => { fetchShows(); }, [fetchShows]);

  const fmtDate = (d) => d ? new Date(d).toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
  const fmtPrice = (n) => new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(n||0);

  return (<>
    <PageMeta title="Lịch Chiếu | CineAdmin"/>
    <PageBreadCrumb pageTitle="Quản lý Lịch Chiếu" items={[{label:'Lịch Chiếu'}]}/>

    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text" placeholder="Tìm kiếm..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-10 w-full sm:w-64 rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm
              focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/10
              dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-brand-500 dark:focus:bg-gray-900 transition-colors"
          />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{pagination.totalItems} suất chiếu</p>
      </div>
      <Link to="/admin/shows/create"><Button><svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Thêm suất chiếu</Button></Link>
    </div>

    {loading ? <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800"/>)}</div> : (
      <Table>
        <Table.Head><tr><Table.Header>Phim</Table.Header><Table.Header>Rạp</Table.Header><Table.Header>Phòng</Table.Header><Table.Header>Thời gian</Table.Header><Table.Header>Giá</Table.Header><Table.Header>Định dạng</Table.Header><Table.Header>Trạng thái</Table.Header><Table.Header className="text-right">Thao tác</Table.Header></tr></Table.Head>
        <Table.Body>
          {shows.length === 0 ? (
            <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-400 dark:text-gray-500">Không tìm thấy suất chiếu nào</td></tr>
          ) : shows.map(s => (
            <Table.Row key={s._id}>
              <Table.Cell><p className="font-semibold text-gray-800 dark:text-white/90 truncate max-w-[150px]">{s.movie?.title||'N/A'}</p></Table.Cell>
              <Table.Cell>{s.cinema?.name||'—'}</Table.Cell>
              <Table.Cell>{s.room_id?.name||'—'}</Table.Cell>
              <Table.Cell className="whitespace-nowrap">{fmtDate(s.showDateTime)}</Table.Cell>
              <Table.Cell className="whitespace-nowrap">{fmtPrice(s.base_price)}</Table.Cell>
              <Table.Cell><Badge variant="light" color="info" size="sm">{s.format||'2D'}</Badge></Table.Cell>
              <Table.Cell><Badge variant="light" color={s.is_active?'success':'error'} size="sm">{s.is_active?'Hoạt động':'Tạm dừng'}</Badge></Table.Cell>
              <Table.Cell><div className="flex justify-end"><Link to={`/admin/shows/edit/${s._id}`}><button className="rounded-lg p-2 text-gray-500 hover:bg-brand-50 hover:text-brand-500 transition-colors"><svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button></Link></div></Table.Cell>
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
export default ShowList;
