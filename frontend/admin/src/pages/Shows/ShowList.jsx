/**
 * ShowList.jsx — Quản lý Lịch Chiếu (with pagination + RBAC UI)
 *
 * Phân quyền:
 *   Super-admin    → thấy tất cả suất chiếu, có nút Thêm và Sửa
 *   Cinema Manager → chỉ thấy suất chiếu của rạp mình (server filter),
 *                    vẫn có nút Thêm và Sửa (được phép quản lý lịch chiếu rạp mình)
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

  // Bộ lọc — rạp và phím
  const [cinemaId, setCinemaId] = useState('');
  const [movieId,  setMovieId]  = useState('');
  const [cinemaOptions, setCinemaOptions] = useState([]);   // [{ _id, name }]
  const [movieOptions,  setMovieOptions]  = useState([]);   // [{ _id, title }]

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

  // Reset page khi filter thay đổi
  useEffect(() => { setPage(1); }, [cinemaId, movieId]);

  // Load options một lần khi mount
  useEffect(() => {
    api.get('/theaters/admin', { params: { limit: 200 } })
      .then(r => setCinemaOptions(r.data?.data || []))
      .catch(() => {});
    api.get('/movies/admin', { params: { limit: 200 } })
      .then(r => setMovieOptions(r.data?.data || []))
      .catch(() => {});
  }, []);

  const fetchShows = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/shows/admin', {
        params: {
          page, limit,
          search: searchDebounced,
          cinema_id: cinemaId || undefined,
          movie_id:  movieId  || undefined,
        },
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
  }, [page, limit, searchDebounced, cinemaId, movieId]);

  useEffect(() => { fetchShows(); }, [fetchShows]);

  const fmtDate = (d) => d
    ? new Date(d).toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
    : '—';
  const fmtPrice = (n) => new Intl.NumberFormat('vi-VN', { style:'currency', currency:'VND' }).format(n || 0);

  return (<>
    <PageMeta title="Lịch Chiếu | CineAdmin"/>
    <PageBreadCrumb pageTitle="Quản lý Lịch Chiếu" items={[{ label:'Lịch Chiếu' }]}/>

    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">

        {/* Thanh tìm kiếm */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text" placeholder="Tìm kiếm..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-10 w-full sm:w-48 rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm
              focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/10
              dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-brand-500 dark:focus:bg-gray-900 transition-colors"
          />
        </div>

        {/* Bộ lọc theo rạp */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <select
            value={cinemaId}
            onChange={e => setCinemaId(e.target.value)}
            className="h-10 w-full sm:w-44 rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-8 text-sm appearance-none
              focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/10
              dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-brand-500 dark:focus:bg-gray-900 transition-colors"
          >
            <option value="">Tất cả rạp</option>
            {cinemaOptions.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
          <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>

        {/* Bộ lọc theo phím */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
            <line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/>
            <line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/>
            <line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>
          </svg>
          <select
            value={movieId}
            onChange={e => setMovieId(e.target.value)}
            className="h-10 w-full sm:w-48 rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-8 text-sm appearance-none
              focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/10
              dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-brand-500 dark:focus:bg-gray-900 transition-colors"
          >
            <option value="">Tất cả phím</option>
            {movieOptions.map(m => (
              <option key={m._id} value={m._id}>{m.title}</option>
            ))}
          </select>
          <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">{pagination.totalItems} suất chiếu</p>
      </div>

      {/* Thêm suất chiếu: mọi admin đều có quyền thêm lịch chiếu cho rạp mình */}
      <Link to="/admin/shows/create">
        <Button>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Thêm suất chiếu
        </Button>
      </Link>
    </div>

    {loading
      ? <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800"/>)}</div>
      : (
        <Table>
          <Table.Head>
            <tr>
              <Table.Header>Phim</Table.Header>
              <Table.Header>Rạp</Table.Header>
              <Table.Header>Phòng</Table.Header>
              <Table.Header>Thời gian</Table.Header>
              <Table.Header>Giá</Table.Header>
              <Table.Header>Định dạng</Table.Header>
              <Table.Header>Trạng thái</Table.Header>
              <Table.Header className="text-right">Thao tác</Table.Header>
            </tr>
          </Table.Head>
          <Table.Body>
            {shows.length === 0
              ? <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-400 dark:text-gray-500">Không tìm thấy suất chiếu nào</td></tr>
              : shows.map(s => (
                <Table.Row key={s._id}>
                  <Table.Cell>
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700">
                        {s.movie?.poster_path && <img src={`/src/assets/images/posters/${s.movie?.poster_path}`} alt="" className="h-full w-full object-cover"/>}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-white/90 truncate max-w-[200px]">{s.movie?.title}</p>
                        {s.movie?.tagline && <p className="text-xs text-gray-400 italic truncate max-w-[200px]">{s.movie?.tagline}</p>}
                      </div>
                    </div>
                  </Table.Cell>
                  <Table.Cell>{s.cinema?.name || '—'}</Table.Cell>
                  <Table.Cell>{s.room_id?.name || '—'}</Table.Cell>
                  <Table.Cell className="whitespace-nowrap">{fmtDate(s.showDateTime)}</Table.Cell>
                  <Table.Cell className="whitespace-nowrap">{fmtPrice(s.base_price)}</Table.Cell>
                  <Table.Cell><Badge variant="light" color="info" size="sm">{s.format || '2D'}</Badge></Table.Cell>
                  <Table.Cell>
                    <Badge variant="light" color={s.is_active ? 'success' : 'error'} size="sm">
                      {s.is_active ? 'Hoạt động' : 'Tạm dừng'}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex justify-end">
                      <Link to={`/admin/shows/edit/${s._id}`}>
                        <button className="rounded-lg p-2 text-gray-500 hover:bg-brand-50 hover:text-brand-500 transition-colors" title="Chỉnh sửa">
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                      </Link>
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
  </>);
};

export default ShowList;
