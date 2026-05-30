/**
 * RoomList.jsx — Danh sách & quản lý phòng chiếu (RBAC-aware, full CRUD)
 *
 * Hai chế độ vận hành:
 *
 *  1. SUPER_ADMIN (qua route /admin/theaters/:theaterId/rooms)
 *     - useParams lấy theaterId từ URL
 *     - Thấy nút Thêm / Sửa / Xóa phòng
 *     - Breadcrumb gồm cả "Cụm Rạp"
 *
 *  2. THEATER_MANAGER (qua route /admin/rooms — không có theaterId)
 *     - theaterId tự động = user.theater_id (từ AuthContext)
 *     - Thấy nút Thêm / Sửa / Xóa (chỉ trên phòng của rạp mình)
 *     - Breadcrumb bắt đầu từ "Danh sách phòng" (bỏ bước chọn rạp)
 *
 * Tính năng chung:
 *   - Modal xem sơ đồ ghế (SeatMap component)
 *   - Modal Thêm / Sửa phòng (RoomFormModal inline)
 *   - Confirm dialog xóa
 *   - Loading skeleton
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import PageBreadCrumb from '../../components/common/PageBreadCrumb';
import Badge from '../../components/ui/badge/Badge';
import Button from '../../components/ui/button/Button';
import Table from '../../components/ui/table/Table';
import SeatMap from '../../components/SeatMap';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/useAuth';

// ── Status helpers ─────────────────────────────────────────────────────────────
const STATUS_MAP = {
  active:      { label: 'Hoạt động', color: 'success' },
  maintenance: { label: 'Bảo trì',   color: 'warning' },
  inactive:    { label: 'Ngừng',     color: 'error'   },
};

const SCREEN_TYPES = ['2D', '3D', 'IMAX', '4DX'];

// ── ROW CONFIG default ────────────────────────────────────────────────────────
const defaultRowConfig = (rows, cols) => {
  return Array.from({ length: rows }, (_, i) => ({
    row: String.fromCharCode(65 + i),
    type: 'regular',
    price_multiplier: 1.0,
  }));
};

// ── Room Form Modal ────────────────────────────────────────────────────────────
const RoomFormModal = ({ room, theaterId, onClose, onSaved }) => {
  const isEdit = Boolean(room);
  const [form, setForm] = useState(
    room
      ? {
          name:        room.name,
          screen_type: room.screen_type,
          status:      room.status,
          rows:        room.layout?.rows    || 5,
          cols:        room.layout?.columns || 8,
        }
      : { name: '', screen_type: '2D', status: 'active', rows: 5, cols: 8 }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleChange = (field) => (e) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const rows = Number(form.rows);
      const cols = Number(form.cols);
      const payload = {
        theater_id:  theaterId,
        name:        form.name,
        screen_type: form.screen_type,
        status:      form.status,
        layout: {
          rows,
          columns:     cols,
          row_configs: defaultRowConfig(rows, cols),
        },
      };

      if (isEdit) {
        await api.put(`/rooms/${room._id}`, payload);
      } else {
        await api.post('/rooms', payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {isEdit ? 'Chỉnh sửa phòng chiếu' : 'Thêm phòng chiếu mới'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error && (
            <div className="rounded-lg bg-error-50 px-4 py-2 text-sm text-error-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Tên phòng */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tên phòng <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={handleChange('name')}
              placeholder="VD: Phòng 1, IMAX Hall..."
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* Loại màn hình + Trạng thái */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Loại màn hình
              </label>
              <select
                value={form.screen_type}
                onChange={handleChange('screen_type')}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                {SCREEN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Trạng thái
              </label>
              <select
                value={form.status}
                onChange={handleChange('status')}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="active">Hoạt động</option>
                <option value="maintenance">Bảo trì</option>
                <option value="inactive">Ngừng hoạt động</option>
              </select>
            </div>
          </div>

          {/* Layout: Số hàng + cột (chỉ khi tạo mới) */}
          {!isEdit && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Cấu hình ghế (sẽ sinh tự động)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Số hàng (A–Z)</label>
                  <input
                    type="number" min={1} max={26}
                    value={form.rows}
                    onChange={handleChange('rows')}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Số cột / hàng</label>
                  <input
                    type="number" min={1} max={30}
                    value={form.cols}
                    onChange={handleChange('cols')}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
              <p className="mt-1.5 text-xs text-gray-400">
                Sẽ tạo {Number(form.rows) * Number(form.cols)} ghế loại "Thường".
                Có thể chỉnh loại ghế thủ công sau khi tạo.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={onClose} type="button">Huỷ</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Tạo phòng'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Seat Map Modal ─────────────────────────────────────────────────────────────
const SeatMapModal = ({ room, onClose }) => {
  const [seats, setSeats]       = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get(`/rooms/${room._id}/seats`)
      .then((r) => setSeats(r.data.seats || []))
      .catch(() => setSeats([]))
      .finally(() => setLoading(false));
  }, [room._id]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Sơ đồ ghế — {room.name}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {room.screen_type} · {room.capacity} ghế
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading
            ? <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
              </div>
            : <SeatMap seats={seats} screenType={room.screen_type} />
          }
        </div>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const RoomList = () => {
  const { theaterId: paramTheaterId } = useParams();        // undefined khi là /admin/rooms
  const { isSuperAdmin, theaterId: authTheaterId } = useAuth();

  // Resolve theaterId: URL param (SUPER_ADMIN) hoặc từ token (THEATER_MANAGER)
  const theaterId = paramTheaterId || authTheaterId;

  const [rooms,   setRooms]   = useState([]);
  const [theater, setTheater] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [formModal,    setFormModal]    = useState(null); // null | 'create' | room object
  const [seatMapRoom,  setSeatMapRoom]  = useState(null); // null | room object
  const [deleteTarget, setDeleteTarget] = useState(null); // null | room object
  const [deleting,     setDeleting]     = useState(false);

  // Fetch rooms + theater info
  const fetchRooms = useCallback(async () => {
    if (!theaterId) return;
    setLoading(true);
    try {
      const [roomsRes, theaterRes] = await Promise.all([
        api.get(`/rooms?theater_id=${theaterId}`),
        api.get(`/theaters/${theaterId}`),
      ]);
      setRooms(roomsRes.data?.rooms || roomsRes.data || []);
      setTheater(theaterRes.data);
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [theaterId]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  // Delete room
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/rooms/${deleteTarget._id}`);
      setDeleteTarget(null);
      fetchRooms();
    } catch (err) {
      alert(err.response?.data?.message || 'Xóa thất bại!');
    } finally {
      setDeleting(false);
    }
  };

  // Breadcrumb động theo role
  const breadcrumbItems = isSuperAdmin
    ? [{ label: 'Cụm Rạp', path: '/admin/theaters' }, { label: theater?.name || 'Phòng chiếu' }]
    : [{ label: 'Danh sách phòng' }];

  return (
    <>
      <PageMeta title={`Phòng chiếu${theater ? ` — ${theater.name}` : ''} | CineAdmin`} />
      <PageBreadCrumb
        pageTitle={isSuperAdmin ? `Phòng chiếu — ${theater?.name || ''}` : 'Danh sách phòng của tôi'}
        items={breadcrumbItems}
      />

      {/* ── Toolbar ── */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* Thông tin rạp (chỉ hiện khi có theater) */}
          {theater && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-900/20">
                <svg className="h-4 w-4 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="2" y="3" width="20" height="14" rx="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white">{theater.name}</p>
                <p className="text-xs text-gray-400">{theater.location} · {rooms.length} phòng</p>
              </div>
            </div>
          )}
        </div>

        {/* Nút Thêm phòng: cả 2 role đều được */}
        <Button onClick={() => setFormModal('create')}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Thêm phòng
        </Button>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 dark:border-gray-700">
          <svg className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          <p className="text-sm text-gray-400 dark:text-gray-500">Chưa có phòng chiếu nào</p>
          <button
            onClick={() => setFormModal('create')}
            className="mt-3 text-sm font-medium text-brand-500 hover:underline"
          >
            + Thêm phòng chiếu đầu tiên
          </button>
        </div>
      ) : (
        <Table>
          <Table.Head>
            <tr>
              <Table.Header>Tên phòng</Table.Header>
              <Table.Header>Màn hình</Table.Header>
              <Table.Header>Sức chứa</Table.Header>
              <Table.Header>Trạng thái</Table.Header>
              <Table.Header className="text-right">Thao tác</Table.Header>
            </tr>
          </Table.Head>
          <Table.Body>
            {rooms.map((room) => (
              <Table.Row key={room._id}>
                <Table.Cell>
                  <p className="font-semibold text-gray-800 dark:text-white/90">{room.name}</p>
                </Table.Cell>
                <Table.Cell>
                  <Badge variant="light" color="info" size="sm">{room.screen_type}</Badge>
                </Table.Cell>
                <Table.Cell>
                  <span className="font-medium">{room.capacity}</span>
                  <span className="ml-1 text-xs text-gray-400">ghế</span>
                </Table.Cell>
                <Table.Cell>
                  <Badge
                    variant="light"
                    color={STATUS_MAP[room.status]?.color || 'light'}
                    size="sm"
                  >
                    {STATUS_MAP[room.status]?.label || room.status}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex items-center justify-end gap-1">
                    {/* Xem sơ đồ ghế — mọi role */}
                    <button
                      onClick={() => setSeatMapRoom(room)}
                      className="rounded-lg p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-500 transition-colors dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                      title="Xem cấu trúc phòng"
                    >
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <path d="M3 9h18M3 15h18M9 3v18"/>
                      </svg>
                    </button>

                    {/* Sửa phòng — mọi role (backend enforce scope) */}
                    <button
                      onClick={() => setFormModal(room)}
                      className="rounded-lg p-2 text-gray-500 hover:bg-brand-50 hover:text-brand-500 transition-colors dark:hover:bg-brand-900/20 dark:hover:text-brand-400"
                      title="Chỉnh sửa"
                    >
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>

                    {/* Xóa phòng — mọi role (backend enforce scope) */}
                    <button
                      onClick={() => setDeleteTarget(room)}
                      className="rounded-lg p-2 text-gray-500 hover:bg-error-50 hover:text-error-500 transition-colors dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      title="Xóa"
                    >
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                      </svg>
                    </button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      {/* ── Modal: Thêm / Sửa phòng ── */}
      {formModal && (
        <RoomFormModal
          room={formModal === 'create' ? null : formModal}
          theaterId={theaterId}
          onClose={() => setFormModal(null)}
          onSaved={() => { setFormModal(null); fetchRooms(); }}
        />
      )}

      {/* ── Modal: Sơ đồ ghế ── */}
      {seatMapRoom && (
        <SeatMapModal room={seatMapRoom} onClose={() => setSeatMapRoom(null)} />
      )}

      {/* ── Confirm Delete Dialog ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error-50 dark:bg-red-900/20">
              <svg className="h-6 w-6 text-error-500 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              </svg>
            </div>
            <h3 className="mb-1 text-base font-bold text-gray-900 dark:text-white">Xóa phòng chiếu?</h3>
            <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
              Phòng <strong>"{deleteTarget.name}"</strong> sẽ bị xóa vĩnh viễn. Thao tác này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Huỷ</Button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-error-500 px-4 py-2 text-sm font-medium text-white hover:bg-error-600 disabled:opacity-60 dark:bg-red-600 dark:hover:bg-red-700"
              >
                {deleting ? 'Đang xóa...' : 'Xóa phòng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RoomList;
