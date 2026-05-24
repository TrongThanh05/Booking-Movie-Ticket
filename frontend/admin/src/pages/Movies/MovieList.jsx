/**
 * MovieList.jsx — Trang Quản lý Phim với bảng dữ liệu đẹp mắt
 * CRUD table: poster, title, genres, runtime, rating, release_date
 *
 * Phân quyền UI:
 *   Super-admin    → thấy tất cả phím, có nút Thêm / Sửa / Xóa
 *   Cinema Manager → chỉ thấy phím đang chiếu tại rạp mình (server scope),
 *                    không có nút Thêm / Sửa / Xóa phím toàn cục
 */
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import PageBreadCrumb from '../../components/common/PageBreadCrumb';
import Badge from '../../components/ui/badge/Badge';
import Button from '../../components/ui/button/Button';
import Table from '../../components/ui/table/Table';
import Modal from '../../components/ui/modal/Modal';
import Pagination from '../../components/ui/pagination/Pagination';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/useAuth';

const MovieList = () => {
  const { isSuperAdmin } = useAuth();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, movie: null });

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    currentPage: 1, totalPages: 1, totalItems: 0, limit: 10,
    hasNextPage: false, hasPrevPage: false,
  });

  // Debounce search
  const [searchDebounced, setSearchDebounced] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1); // reset to page 1 on search change
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchMovies = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/movies', {
        params: { page, limit, search: searchDebounced },
      });
      const res = r.data;
      if (res.pagination) {
        setMovies(res.data);
        setPagination(res.pagination);
      } else {
        // Backward compat: if API returns array
        const arr = res.movies || res || [];
        setMovies(Array.isArray(arr) ? arr : []);
      }
    } catch {
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchDebounced]);

  useEffect(() => { fetchMovies(); }, [fetchMovies]);

  const handleDelete = async () => {
    if (!deleteModal.movie) return;
    try {
      await api.delete(`/movies/${deleteModal.movie._id}`);
      fetchMovies(); // Refresh the list
    } catch (e) {
      console.error(e);
    }
    setDeleteModal({ open: false, movie: null });
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN');
  };

  return (
    <>
      <PageMeta title="Quản lý Phim | CineAdmin" />
      <PageBreadCrumb pageTitle="Quản lý Phim" items={[{ label: 'Phim' }]} />

      {/* Actions bar */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text" placeholder="Tìm kiếm phim..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-10 w-full sm:w-72 rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm
              focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/10
              dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-brand-500 dark:focus:bg-gray-900 transition-colors"
          />
        </div>
        {/* Nút Thêm phim: chỉ super-admin */}
        {isSuperAdmin && (
          <Link to="/admin/movies/create">
            <Button>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Thêm phim mới
            </Button>
          </Link>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800"/>)}</div>
      ) : (
        <Table>
          <Table.Head>
            <tr>
              <Table.Header>Phim</Table.Header>
              <Table.Header>Thể loại</Table.Header>
              <Table.Header>Thời lượng</Table.Header>
              <Table.Header>Đánh giá</Table.Header>
              <Table.Header>Ngày chiếu</Table.Header>
              <Table.Header>Ngôn ngữ</Table.Header>
              <Table.Header className="text-right">Thao tác</Table.Header>
            </tr>
          </Table.Head>
          <Table.Body>
            {movies.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400 dark:text-gray-500">Không tìm thấy phim nào</td></tr>
            ) : movies.map(movie => (
              <Table.Row key={movie._id}>
                <Table.Cell>
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700">
                      {movie.poster_path && <img src={`/src/assets/images/posters/${movie.poster_path}`} alt="" className="h-full w-full object-cover"/>}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white/90 truncate max-w-[200px]">{movie.title}</p>
                      {movie.tagline && <p className="text-xs text-gray-400 italic truncate max-w-[200px]">{movie.tagline}</p>}
                    </div>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex flex-wrap gap-1">
                    {movie.genres?.slice(0,2).map((g,i) => <Badge key={i} variant="light" color="primary" size="sm">{g.name}</Badge>)}
                  </div>
                </Table.Cell>
                <Table.Cell>{movie.runtime ? `${movie.runtime} phút` : '—'}</Table.Cell>
                <Table.Cell>
                  <div className="flex items-center gap-1">
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth={1}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    <span className="font-medium text-gray-800 dark:text-white/90">{movie.vote_average?.toFixed(1)||'—'}</span>
                  </div>
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap">{formatDate(movie.release_date)}</Table.Cell>
                <Table.Cell>
                  <Badge variant="light" color="light" size="sm">{movie.original_language?.toUpperCase()||'—'}</Badge>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex items-center justify-end gap-1">
                    {/* Nút Sửa: chỉ super-admin */}
                    {isSuperAdmin && (
                      <Link to={`/admin/movies/edit/${movie._id}`}>
                        <button className="rounded-lg p-2 text-gray-500 hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10 transition-colors" title="Chỉnh sửa">
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                      </Link>
                    )}
                    {/* Nút Xóa: chỉ super-admin */}
                    {isSuperAdmin && (
                      <button onClick={() => setDeleteModal({open:true,movie})} className="rounded-lg p-2 text-gray-500 hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10 transition-colors" title="Xóa">
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                      </button>
                    )}
                    {/* Cinema Manager: chỉ xem, không có thao tác */}
                    {!isSuperAdmin && (
                      <span className="px-2 text-xs text-gray-400 italic">Chỉ xem</span>
                    )}
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        limit={pagination.limit}
        onPageChange={setPage}
        onLimitChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
      />

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModal.open} onClose={() => setDeleteModal({open:false,movie:null})} title="Xác nhận xoá phim" size="sm"
        showFooter footer={<>
          <Button variant="secondary" onClick={() => setDeleteModal({open:false,movie:null})}>Huỷ</Button>
          <Button variant="danger" onClick={handleDelete}>Xoá phim</Button>
        </>}
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Bạn có chắc muốn xoá phim <strong className="text-gray-800 dark:text-white">"{deleteModal.movie?.title}"</strong>? Hành động này không thể hoàn tác.
        </p>
      </Modal>
    </>
  );
};

export default MovieList;
