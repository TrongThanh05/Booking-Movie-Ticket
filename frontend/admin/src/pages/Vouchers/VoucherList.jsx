/**
 * VoucherList.jsx — Quản lý Khuyến mãi (with pagination)
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

const VoucherList = () => {
  const [vouchers, setVouchers] = useState([]);
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

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/vouchers', {
        params: { page, limit, search: searchDebounced },
      });
      const res = r.data;
      if (res.pagination) {
        setVouchers(res.data);
        setPagination(res.pagination);
      } else {
        setVouchers(Array.isArray(res) ? res : res.vouchers || []);
      }
    } catch {
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchDebounced]);

  useEffect(() => { fetchVouchers(); }, [fetchVouchers]);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

  return (<>
    <PageMeta title="Khuyến mãi | CineAdmin"/>
    <PageBreadCrumb pageTitle="Quản lý Khuyến mãi" items={[{label:'Khuyến mãi'}]}/>

    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text" placeholder="Tìm theo mã, mô tả..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-10 w-full sm:w-64 rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm
              focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/10
              dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-brand-500 dark:focus:bg-gray-900 transition-colors"
          />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{pagination.totalItems} mã khuyến mãi</p>
      </div>
      <Link to="/admin/vouchers/create"><Button><svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Thêm mã</Button></Link>
    </div>

    {loading ? <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800"/>)}</div> : (
      <Table>
        <Table.Head><tr><Table.Header>Mã</Table.Header><Table.Header>Mô tả</Table.Header><Table.Header>Giảm giá</Table.Header><Table.Header>Sử dụng</Table.Header><Table.Header>Hết hạn</Table.Header><Table.Header>Trạng thái</Table.Header><Table.Header className="text-right">Thao tác</Table.Header></tr></Table.Head>
        <Table.Body>
          {vouchers.length === 0 ? (
            <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400 dark:text-gray-500">Không tìm thấy mã khuyến mãi nào</td></tr>
          ) : vouchers.map(v => (
            <Table.Row key={v._id}>
              <Table.Cell><span className="font-mono text-xs font-bold text-brand-500 bg-brand-50 px-2 py-1 rounded dark:bg-brand-500/15">{v.code}</span></Table.Cell>
              <Table.Cell><p className="truncate max-w-[180px]">{v.description||'—'}</p></Table.Cell>
              <Table.Cell><span className="font-semibold">{v.discount > 100 ? new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(v.discount) : `${v.discount}%`}</span></Table.Cell>
              <Table.Cell><span>{v.used_count}/{v.usage_limit}</span></Table.Cell>
              <Table.Cell className="whitespace-nowrap">{fmtDate(v.expires_at)}</Table.Cell>
              <Table.Cell><Badge variant="light" color={v.is_active?'success':'error'} size="sm">{v.is_active?'Hoạt động':'Hết hạn'}</Badge></Table.Cell>
              <Table.Cell><div className="flex justify-end"><Link to={`/admin/vouchers/edit/${v._id}`}><button className="rounded-lg p-2 text-gray-500 hover:bg-brand-50 hover:text-brand-500 transition-colors"><svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button></Link></div></Table.Cell>
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
export default VoucherList;
