/**
 * BookingDetail.jsx — Chi tiết đơn đặt vé + Check-in tại rạp
 *
 * Hiển thị:
 *   - Booking code + trạng thái nổi bật
 *   - Thông tin khách hàng
 *   - Thông tin suất chiếu (phim, rạp, phòng, giờ)
 *   - Danh sách ghế + loại ghế
 *   - F&B đã đặt
 *   - Voucher & tổng thanh toán
 *   - Check-in button (nếu chưa check-in)
 *   - Nút Hủy vé (nếu còn confirmed)
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageMeta from '../../components/common/PageMeta';
import PageBreadCrumb from '../../components/common/PageBreadCrumb';
import Badge from '../../components/ui/badge/Badge';
import Button from '../../components/ui/button/Button';
import Modal from '../../components/ui/modal/Modal';
import { api } from '../../lib/api';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDate = (d, opts) => d ? new Date(d).toLocaleString('vi-VN', opts || {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
}) : '—';

const STATUS_BADGE = {
  confirmed: { l: 'Đã xác nhận', c: 'success' },
  completed: { l: 'Hoàn thành',  c: 'primary' },
  pending:   { l: 'Chờ xử lý',  c: 'warning' },
  cancelled: { l: 'Đã hủy',     c: 'error' },
};
const PAY_BADGE = {
  paid:     { l: 'Đã thanh toán', c: 'success' },
  pending:  { l: 'Chờ thanh toán', c: 'warning' },
  failed:   { l: 'Thất bại',       c: 'error' },
  refunded: { l: 'Đã hoàn tiền',   c: 'primary' },
};
const SEAT_TYPE_LABEL = { regular: 'Thường', vip: 'VIP', couple: 'Couple' };
const SEAT_TYPE_COLOR = { regular: 'light', vip: 'warning', couple: 'primary' };

// ── Info Row helper ──────────────────────────────────────────────────────────
const InfoRow = ({ label, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-2.5 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
    <span className="w-40 shrink-0 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</span>
    <div className="text-sm text-gray-800 dark:text-white/90 font-medium">{children}</div>
  </div>
);

// ── Section Card helper ──────────────────────────────────────────────────────
const Card = ({ title, icon, children }) => (
  <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
    <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 px-5 py-3.5">
      <span className="text-base">{icon}</span>
      <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">{title}</h3>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const BookingDetail = () => {
  const { id }    = useParams();
  const navigate  = useNavigate();

  const [booking, setBooking]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [checkInLoading, setCILoad]   = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelling, setCancelling]   = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting]       = useState(false);

  useEffect(() => {
    api.get(`/bookings/${id}`)
      .then(r => setBooking(r.data))
      .catch(() => { toast.error('Không tìm thấy đơn hàng'); navigate('/admin/bookings'); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  // ── Check-in ────────────────────────────────────────────────────────────
  const handleCheckIn = async () => {
    setCILoad(true);
    try {
      await api.patch(`/bookings/${id}/checkin`);
      toast.success('Check-in thành công! 🎬');
      // Reload booking data
      const r = await api.get(`/bookings/${id}`);
      setBooking(r.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể check-in');
    } finally { setCILoad(false); }
  };

  // ── Hard Delete ─────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/bookings/admin/${id}`);
      toast.success(`Đã xóa đơn hàng ${b?.booking_code || ''} vĩnh viễn`);
      navigate('/admin/bookings');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể xóa');
    } finally { setDeleting(false); }
  };

  // ── Cancel booking ───────────────────────────────────────────────────────
  const handleCancel = async () => {
    setCancelling(true);
    try {
      await api.put(`/bookings/${id}/cancel`);
      toast.success('Đã hủy vé thành công');
      setCancelModal(false);
      const r = await api.get(`/bookings/${id}`);
      setBooking(r.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể hủy vé này');
    } finally { setCancelling(false); }
  };

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 w-64 rounded-xl bg-gray-200 dark:bg-gray-800" />
      <div className="h-32 rounded-2xl bg-gray-200 dark:bg-gray-800" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 rounded-2xl bg-gray-200 dark:bg-gray-800" />
        <div className="h-64 rounded-2xl bg-gray-200 dark:bg-gray-800" />
      </div>
    </div>
  );

  if (!booking) return null;

  const b    = booking;
  const show = b.show || {};
  const canCheckin = !b.checked_in && (b.status === 'confirmed' || b.status === 'completed');
  const canCancel  = b.status === 'confirmed';
  const canDelete  = b.status === 'cancelled';
  // Ticket subtotal (before discount)
  const ticketSubtotal = b.tickets?.reduce((s, t) => s + (t.price || 0), 0) || 0;
  const foodSubtotal   = b.foods?.reduce((s, f) => s + (f.priceAtPurchase || 0) * (f.quantity || 1), 0) || 0;

  return (
    <>
      <PageMeta title={`Chi tiết vé ${b.booking_code} | CineAdmin`} />
      <PageBreadCrumb
        pageTitle={`Vé ${b.booking_code}`}
        items={[{ label: 'Đơn hàng', path: '/admin/bookings' }, { label: b.booking_code }]}
      />

      {/* ── Hero: Booking code + status ──────────────────────────────────── */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Code */}
          <div className="flex-1">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Mã đặt vé</p>
            <p className="text-2xl font-black font-mono text-brand-500 tracking-widest">{b.booking_code}</p>
            <p className="mt-1 text-xs text-gray-400">Đặt lúc {fmtDate(b.booked_at)}</p>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="light" color={STATUS_BADGE[b.status]?.c || 'light'}>
              {STATUS_BADGE[b.status]?.l || b.status}
            </Badge>
            <Badge variant="light" color={PAY_BADGE[b.payment_status]?.c || 'light'}>
              {PAY_BADGE[b.payment_status]?.l || b.payment_status || '—'}
            </Badge>
            {b.checked_in && (
              <Badge variant="light" color="success">
                ✓ Đã soát vé lúc {fmtDate(b.checked_in_at, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
              </Badge>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 shrink-0">
            {canCheckin && (
              <Button onClick={handleCheckIn} disabled={checkInLoading}>
                {checkInLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Đang xử lý...
                  </span>
                ) : '🎬 Check-in'}
              </Button>
            )}
            {canCancel && (
              <Button variant="danger" onClick={() => setCancelModal(true)}>Hủy vé</Button>
            )}
            {canDelete && (
              <Button
                variant="danger"
                onClick={() => setDeleteModal(true)}
                className="bg-gray-700 hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700"
              >
                🗑️ Xóa vĩnh viễn
              </Button>
            )}
            <Link to="/admin/bookings">
              <Button variant="secondary">← Quay lại</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main Grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        {/* Khách hàng */}
        <Card title="Thông tin khách hàng" icon="👤">
          <InfoRow label="Họ tên">{b.user?.name || '—'}</InfoRow>
          <InfoRow label="Email">
            <a href={`mailto:${b.user?.email}`} className="text-brand-500 hover:underline">{b.user?.email || '—'}</a>
          </InfoRow>
          <InfoRow label="Điện thoại">{b.user?.phone || '—'}</InfoRow>
        </Card>

        {/* Suất chiếu */}
        <Card title="Thông tin suất chiếu" icon="🎬">
          <InfoRow label="Phim">{show.movie?.title || '—'}</InfoRow>
          <InfoRow label="Rạp">{show.cinema?.name || '—'}</InfoRow>
          <InfoRow label="Địa chỉ">{show.cinema?.address || '—'}</InfoRow>
          <InfoRow label="Phòng">
            {show.room_id?.name || '—'}
            {show.room_id?.screen_type && (
              <Badge variant="light" color="primary" size="sm" className="ml-2">{show.room_id.screen_type}</Badge>
            )}
          </InfoRow>
          <InfoRow label="Giờ chiếu">
            {show.showDateTime ? (
              <span className="font-semibold text-brand-600 dark:text-brand-400">
                {fmtDate(show.showDateTime)}
              </span>
            ) : '—'}
          </InfoRow>
          <InfoRow label="Ngôn ngữ">{show.language || '—'}</InfoRow>
          <InfoRow label="Định dạng">{show.format || '—'}</InfoRow>
        </Card>

        {/* Ghế & vé */}
        <Card title={`Ghế đã đặt (${b.tickets?.length || 0} ghế)`} icon="💺">
          {b.tickets?.length ? (
            <div className="flex flex-wrap gap-2">
              {b.tickets.map((t, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2">
                  <span className="font-mono font-bold text-sm text-gray-800 dark:text-white">{t.seat_id}</span>
                  <Badge variant="light" color={SEAT_TYPE_COLOR[t.seat_type] || 'light'} size="sm">
                    {SEAT_TYPE_LABEL[t.seat_type] || t.seat_type}
                  </Badge>
                  <span className="text-xs text-gray-500">{fmt(t.price)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-400 text-sm">Không có ghế</p>}
        </Card>

        {/* F&B */}
        <Card title={`Đồ ăn & Thức uống (${b.foods?.length || 0} món)`} icon="🍿">
          {b.foods?.length ? (
            <div className="space-y-2">
              {b.foods.map((f, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-800 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {f.foodId?.category === 'drink' ? '🥤' : f.foodId?.category === 'combo' ? '🎁' : '🍿'}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {f.foodId?.name || 'Món ăn'}
                      </p>
                      <p className="text-xs text-gray-400">x{f.quantity}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
                    {fmt(f.priceAtPurchase * f.quantity)}
                  </span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-400 text-sm">Không có F&B</p>}
        </Card>
      </div>

      {/* ── Thanh toán summary ────────────────────────────────────────────── */}
      <div className="mt-5 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-5">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-4">💳 Chi tiết thanh toán</h3>
        <div className="max-w-sm ml-auto space-y-2 text-sm">
          <div className="flex justify-between text-gray-500 dark:text-gray-400">
            <span>Tiền vé ({b.tickets?.length || 0} ghế)</span>
            <span>{fmt(ticketSubtotal)}</span>
          </div>
          {foodSubtotal > 0 && (
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
              <span>F&B ({b.foods?.length || 0} món)</span>
              <span>{fmt(foodSubtotal)}</span>
            </div>
          )}
          {b.discount_amount > 0 && (
            <div className="flex justify-between text-success-600 dark:text-success-400">
              <span>
                Giảm giá
                {b.voucher?.code && (
                  <span className="ml-1 font-mono text-xs bg-success-50 dark:bg-success-500/10 px-1.5 py-0.5 rounded">
                    {b.voucher.code}
                  </span>
                )}
              </span>
              <span>-{fmt(b.discount_amount)}</span>
            </div>
          )}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-2 flex justify-between font-bold text-base text-gray-900 dark:text-white">
            <span>Tổng cộng</span>
            <span className="text-brand-600 dark:text-brand-400">{fmt(b.total_amount)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-400 pt-1">
            <span>Phương thức</span>
            <span className="font-medium">{b.payment_method || '—'}</span>
          </div>
          {b.transaction_id && (
            <div className="flex justify-between text-xs text-gray-400">
              <span>Mã giao dịch</span>
              <span className="font-mono">{b.transaction_id}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Cancel Modal ──────────────────────────────────────────────────── */}
      <Modal
        isOpen={cancelModal}
        onClose={() => setCancelModal(false)}
        title="Xác nhận hủy vé"
        size="sm"
        showFooter
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelModal(false)}>Không</Button>
            <Button variant="danger" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? 'Đang hủy...' : 'Hủy vé này'}
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
              Bạn có chắc muốn hủy vé <strong className="text-gray-800 dark:text-white">{b.booking_code}</strong>?
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Ghế sẽ được giải phóng tự động. Hoàn tiền cần xử lý thủ công qua cổng thanh toán.
            </p>
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirm Modal ──────────────────────────────────────────── */}
      <Modal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Xóa vĩnh viễn đơn hàng"
        size="sm"
        showFooter
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModal(false)}>Huỷ</Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Đang xóa...' : '🗑️ Xóa vĩnh viễn'}
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/10">
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2}>
              <polyline points="3,6 5,6 21,6"/>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Xóa <strong className="text-gray-800 dark:text-white font-mono">{b.booking_code}</strong> khỏi hệ thống?
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Hành động này <span className="text-error-500 font-medium">không thể hoàn tác</span>.
              Dữ liệu vé sẽ bị xóa vĩnh viễn khỏi database.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
};


export default BookingDetail;
