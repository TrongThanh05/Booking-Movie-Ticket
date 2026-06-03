/**
 * ReviewList.jsx — Quản lý & Kiểm duyệt Đánh giá phim
 * Features:
 *   - Tabs: Tất cả / Chờ duyệt / Đã duyệt / Từ chối / Bị báo cáo
 *   - Quick actions: Duyệt ✓ / Từ chối ✗ / Xóa cứng 🗑️
 *   - Modal từ chối: nhập lý do
 *   - Modal xem chi tiết: full comment + meta
 *   - Pagination
 */
import { useState, useEffect, useCallback } from 'react';
import PageMeta from '../../components/common/PageMeta';
import PageBreadCrumb from '../../components/common/PageBreadCrumb';
import Badge from '../../components/ui/badge/Badge';
import Button from '../../components/ui/button/Button';
import Table from '../../components/ui/table/Table';
import Modal from '../../components/ui/modal/Modal';
import Pagination from '../../components/ui/pagination/Pagination';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_TABS = [
  { value: 'all',      label: 'Tất cả',      color: null },
  { value: 'pending',  label: '⏳ Chờ duyệt', color: 'warning' },
  { value: 'approved', label: '✅ Đã duyệt',  color: 'success' },
  { value: 'rejected', label: '❌ Từ chối',   color: 'error' },
  { value: 'reported', label: '🚨 Bị báo cáo', color: 'error' },
];

const STATUS_BADGE = {
  pending:  { label: 'Chờ duyệt', color: 'warning' },
  approved: { label: 'Đã duyệt',  color: 'success' },
  rejected: { label: 'Từ chối',   color: 'error' },
};

// ── Star rating renderer ──────────────────────────────────────────────────────
const Stars = ({ rating }) => {
  const full = Math.floor(rating / 2);
  const half = rating % 2 >= 1;
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <svg key={i} width={12} height={12} viewBox="0 0 24 24"
          fill={i <= full ? '#fbbf24' : i === full + 1 && half ? 'url(#half)' : '#e5e7eb'}
          stroke="none">
          <defs>
            <linearGradient id="half"><stop offset="50%" stopColor="#fbbf24"/><stop offset="50%" stopColor="#e5e7eb"/></linearGradient>
          </defs>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
      <span className="ml-1 text-xs font-semibold text-gray-700 dark:text-gray-200">{rating}/10</span>
    </span>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const ReviewList = () => {
  const [reviews, setReviews]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState('all');
  const [page, setPage]               = useState(1);
  const [pagination, setPagination]   = useState({ currentPage: 1, totalPages: 1, totalItems: 0, limit: 15 });

  // Modals
  const [detailModal, setDetailModal]   = useState({ open: false, review: null });
  const [rejectModal, setRejectModal]   = useState({ open: false, review: null });
  const [deleteModal, setDeleteModal]   = useState({ open: false, review: null });
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      let url = '/reviews/admin';
      if (activeTab === 'reported') {
        url = '/reviews/admin/reported';
      } else if (activeTab !== 'all') {
        params.status = activeTab;
      }
      const r = await api.get(url, { params });
      setReviews(r.data.data || []);
      setPagination(r.data.pagination || { currentPage: 1, totalPages: 1, totalItems: 0, limit: 15 });
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);
  useEffect(() => { setPage(1); }, [activeTab]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleApprove = async (review) => {
    setActionLoading(true);
    try {
      await api.patch(`/reviews/admin/${review._id}/approve`);
      toast.success(`Đã duyệt review của ${review.user?.name}`);
      fetchReviews();
    } catch { toast.error('Có lỗi xảy ra'); }
    finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!rejectModal.review) return;
    setActionLoading(true);
    try {
      await api.patch(`/reviews/admin/${rejectModal.review._id}/reject`, { reason: rejectReason });
      toast.success('Đã từ chối đánh giá');
      setRejectModal({ open: false, review: null });
      setRejectReason('');
      fetchReviews();
    } catch { toast.error('Có lỗi xảy ra'); }
    finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteModal.review) return;
    setActionLoading(true);
    try {
      await api.delete(`/reviews/admin/${deleteModal.review._id}`);
      toast.success('Đã xóa đánh giá vĩnh viễn');
      setDeleteModal({ open: false, review: null });
      fetchReviews();
    } catch { toast.error('Có lỗi xảy ra'); }
    finally { setActionLoading(false); }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
  const truncate = (str, n = 80) => str?.length > n ? str.slice(0, n) + '…' : (str || '');

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <PageMeta title="Kiểm duyệt Đánh giá | CineAdmin" />
      <PageBreadCrumb pageTitle="Kiểm duyệt Đánh giá" items={[{ label: 'Đánh giá' }]} />

      {/* Tabs */}
      <div className="mb-5 flex gap-2 flex-wrap">
        {STATUS_TABS.map(tab => {
          const isActive = activeTab === tab.value;
          return (
            <button key={tab.value} onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
                  : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-brand-300 hover:text-brand-600'
              }`}>
              {tab.label}
              {isActive && pagination.totalItems > 0 && (
                <span className="ml-2 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-white/25 text-xs font-bold">
                  {pagination.totalItems}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800"/>)}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
          <Table>
            <Table.Head>
              <tr>
                <Table.Header>Người dùng</Table.Header>
                <Table.Header>Phim</Table.Header>
                <Table.Header>Điểm</Table.Header>
                <Table.Header>Nội dung</Table.Header>
                <Table.Header>Trạng thái</Table.Header>
                <Table.Header>Ngày</Table.Header>
                <Table.Header className="text-right">Thao tác</Table.Header>
              </tr>
            </Table.Head>
            <Table.Body>
              {reviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">📝</span>
                      <p className="text-gray-400 text-sm">Không có đánh giá nào trong mục này</p>
                    </div>
                  </td>
                </tr>
              ) : reviews.map(rv => (
                <Table.Row key={rv._id}>
                  {/* User */}
                  <Table.Cell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 shrink-0 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center text-sm font-bold text-brand-600 dark:text-brand-400">
                        {rv.user?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate max-w-[100px]">
                          {rv.user?.name || 'N/A'}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {rv.isVerifiedPurchase && (
                            <span className="text-[10px] bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400 px-1.5 py-0.5 rounded-full font-medium">
                              ✓ Đã xem
                            </span>
                          )}
                          {rv.reportCount >= 3 && (
                            <span className="text-[10px] bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400 px-1.5 py-0.5 rounded-full font-medium">
                              🚨 {rv.reportCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Table.Cell>

                  {/* Movie */}
                  <Table.Cell>
                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[130px]">
                      {rv.movie?.title || 'N/A'}
                    </p>
                  </Table.Cell>

                  {/* Rating */}
                  <Table.Cell><Stars rating={rv.rating} /></Table.Cell>

                  {/* Comment preview */}
                  <Table.Cell>
                    <div className="max-w-[220px]">
                      {rv.isSpoiler && (
                        <span className="inline-block mb-1 text-[10px] bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400 px-1.5 py-0.5 rounded font-medium">
                          ⚠️ Spoiler
                        </span>
                      )}
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {truncate(rv.comment, 90)}
                      </p>
                    </div>
                  </Table.Cell>

                  {/* Status */}
                  <Table.Cell>
                    <Badge
                      variant="light"
                      color={STATUS_BADGE[rv.status]?.color || 'light'}
                      size="sm"
                    >
                      {STATUS_BADGE[rv.status]?.label || rv.status}
                    </Badge>
                    {rv.editCount > 0 && (
                      <p className="mt-1 text-[10px] text-gray-400">Đã sửa {rv.editCount} lần</p>
                    )}
                  </Table.Cell>

                  {/* Date */}
                  <Table.Cell>
                    <span className="text-xs text-gray-500 whitespace-nowrap">{fmtDate(rv.createdAt)}</span>
                  </Table.Cell>

                  {/* Actions */}
                  <Table.Cell>
                    <div className="flex items-center justify-end gap-1">
                      {/* Xem chi tiết */}
                      <button
                        onClick={() => setDetailModal({ open: true, review: rv })}
                        className="rounded-lg p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-500/10 transition-colors"
                        title="Xem chi tiết"
                      >
                        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>
                      {/* Duyệt */}
                      {rv.status !== 'approved' && (
                        <button
                          onClick={() => handleApprove(rv)}
                          disabled={actionLoading}
                          className="rounded-lg p-2 text-gray-500 hover:bg-success-50 hover:text-success-600 dark:hover:bg-success-500/10 transition-colors"
                          title="Duyệt"
                        >
                          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </button>
                      )}
                      {/* Từ chối */}
                      {rv.status !== 'rejected' && (
                        <button
                          onClick={() => { setRejectModal({ open: true, review: rv }); setRejectReason(''); }}
                          className="rounded-lg p-2 text-gray-500 hover:bg-warning-50 hover:text-warning-600 dark:hover:bg-warning-500/10 transition-colors"
                          title="Từ chối"
                        >
                          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      )}
                      {/* Xóa cứng */}
                      <button
                        onClick={() => setDeleteModal({ open: true, review: rv })}
                        className="rounded-lg p-2 text-gray-500 hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10 transition-colors"
                        title="Xóa vĩnh viễn"
                      >
                        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                      </button>
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
        onLimitChange={() => {}}
      />

      {/* ── Detail Modal ──────────────────────────────────────────────────── */}
      <Modal
        isOpen={detailModal.open}
        onClose={() => setDetailModal({ open: false, review: null })}
        title="Chi tiết đánh giá"
        size="md"
        showFooter
        footer={
          <div className="flex gap-2 w-full">
            {detailModal.review?.status !== 'approved' && (
              <Button size="sm" onClick={() => { handleApprove(detailModal.review); setDetailModal({ open: false, review: null }); }}>
                ✓ Duyệt
              </Button>
            )}
            {detailModal.review?.status !== 'rejected' && (
              <Button size="sm" variant="secondary"
                onClick={() => {
                  setDetailModal({ open: false, review: null });
                  setRejectModal({ open: true, review: detailModal.review });
                  setRejectReason('');
                }}>
                ✗ Từ chối
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => setDetailModal({ open: false, review: null })}>
              Đóng
            </Button>
          </div>
        }
      >
        {detailModal.review && (() => {
          const rv = detailModal.review;
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center text-lg font-bold text-brand-600">
                  {rv.user?.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-white">{rv.user?.name}</p>
                  <p className="text-xs text-gray-400">{rv.user?.email}</p>
                </div>
                <div className="ml-auto flex gap-1.5">
                  {rv.isVerifiedPurchase && <Badge variant="light" color="success" size="sm">✓ Đã xem</Badge>}
                  {rv.isSpoiler && <Badge variant="light" color="warning" size="sm">⚠️ Spoiler</Badge>}
                  <Badge variant="light" color={STATUS_BADGE[rv.status]?.color || 'light'} size="sm">
                    {STATUS_BADGE[rv.status]?.label}
                  </Badge>
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
                <p className="text-xs text-gray-400 mb-1">🎬 {rv.movie?.title}</p>
                <Stars rating={rv.rating} />
              </div>

              <div className="rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {rv.comment}
                </p>
              </div>

              {rv.rejectionReason && (
                <div className="rounded-xl bg-error-50 dark:bg-error-500/10 border border-error-100 dark:border-error-500/20 p-3">
                  <p className="text-xs font-semibold text-error-600 dark:text-error-400 mb-1">Lý do từ chối:</p>
                  <p className="text-sm text-error-700 dark:text-error-300">{rv.rejectionReason}</p>
                </div>
              )}

              <div className="flex gap-4 text-xs text-gray-400">
                <span>📅 {new Date(rv.createdAt).toLocaleString('vi-VN')}</span>
                {rv.reportCount > 0 && <span className="text-error-500">🚨 Bị báo cáo {rv.reportCount} lần</span>}
                {rv.editCount > 0 && <span>✏️ Đã sửa {rv.editCount} lần</span>}
                <span>👍 {rv.reactions?.filter(r => r.type === 'like').length || 0} / 👎 {rv.reactions?.filter(r => r.type === 'dislike').length || 0}</span>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Reject Modal ──────────────────────────────────────────────────── */}
      <Modal
        isOpen={rejectModal.open}
        onClose={() => setRejectModal({ open: false, review: null })}
        title="Từ chối đánh giá"
        size="sm"
        showFooter
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectModal({ open: false, review: null })}>Huỷ</Button>
            <Button variant="danger" onClick={handleReject} disabled={actionLoading}>
              {actionLoading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Từ chối đánh giá của <strong className="text-gray-800 dark:text-white">{rejectModal.review?.user?.name}</strong>.
            Nhập lý do để thông báo cho người dùng:
          </p>
          <textarea
            rows={3}
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="VD: Nội dung vi phạm tiêu chuẩn cộng đồng, ngôn từ không phù hợp..."
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white resize-none focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 transition-colors"
          />
        </div>
      </Modal>

      {/* ── Delete Confirm Modal ──────────────────────────────────────────── */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, review: null })}
        title="Xóa vĩnh viễn đánh giá"
        size="sm"
        showFooter
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModal({ open: false, review: null })}>Huỷ</Button>
            <Button variant="danger" onClick={handleDelete} disabled={actionLoading}>
              {actionLoading ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/10">
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2}>
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Xóa <strong>vĩnh viễn</strong> đánh giá này? Điểm phim sẽ được tính lại tự động.
            </p>
            <p className="mt-1.5 text-xs text-gray-400">
              Hành động này <span className="text-error-500 font-medium">không thể hoàn tác</span>. Chỉ dùng cho spam/vi phạm nặng.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ReviewList;
