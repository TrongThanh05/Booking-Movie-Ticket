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
import { useState, useEffect, useCallback, useMemo } from 'react';
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

// ── Seat Map Modal (nâng cấp: 2 cột — sơ đồ + panel cấu hình) ────────────────
const ROW_TYPE_OPTIONS = [
  { value: 'regular', label: 'Thường',  color: 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400' },
  { value: 'vip',     label: 'VIP',     color: 'bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-600 dark:text-yellow-400' },
  { value: 'couple',  label: 'Đôi',     color: 'bg-pink-50 border-pink-300 text-pink-700 dark:bg-pink-900/20 dark:border-pink-600 dark:text-pink-400' },
];

const SEAT_STATUS_OPTIONS = [
  { value: 'active',      label: 'Hoạt động', icon: '✓', cls: 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' },
  { value: 'maintenance', label: 'Bảo trì',   icon: '🔧', cls: 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20' },
  { value: 'broken',      label: 'Hỏng',      icon: '✕', cls: 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' },
];

const SEAT_STYLE_ADMIN = {
  active: {
    regular: 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400',
    vip    : 'bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-600 dark:text-yellow-400',
    couple : 'bg-pink-50 border-pink-300 text-pink-700 dark:bg-pink-900/20 dark:border-pink-600 dark:text-pink-400',
  },
  broken     : 'bg-red-100 border-red-400 text-red-600 dark:bg-red-900/30 dark:border-red-600 dark:text-red-400',
  maintenance: 'bg-orange-100 border-orange-400 text-orange-600 dark:bg-orange-900/30 dark:border-orange-600 dark:text-orange-400',
};

const getAdminSeatStyle = (seat) => {
  if (seat.status === 'broken')      return SEAT_STYLE_ADMIN.broken;
  if (seat.status === 'maintenance') return SEAT_STYLE_ADMIN.maintenance;
  return SEAT_STYLE_ADMIN.active[seat.type] ?? SEAT_STYLE_ADMIN.active.regular;
};

const SeatMapModal = ({ room, onClose }) => {
  const [seats, setSeats]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);

  // Row-type panel state
  const [rowTypes, setRowTypes]     = useState({}); // { A: 'regular', B: 'vip', ... }
  const [pendingRows, setPending]   = useState({}); // rows chưa save

  // Seat click popup (fixed-position để không bị clip bởi overflow)
  const [activeSeat, setActiveSeat] = useState(null);  // seat object đang được chọn
  const [popupPos,   setPopupPos]   = useState({ top: 0, left: 0, above: true }); // vị trí fixed

  // Load seats
  useEffect(() => {
    api.get(`/rooms/${room._id}/seats`)
      .then((r) => {
        const s = r.data.seats || [];
        setSeats(s);
        // Suy ra loại hàng từ seats
        const types = {};
        for (const seat of s) {
          if (!types[seat.row]) types[seat.row] = seat.type || 'regular';
        }
        setRowTypes(types);
      })
      .catch(() => setSeats([]))
      .finally(() => setLoading(false));
  }, [room._id]);

  // Đóng popup ghế khi click ngoài
  useEffect(() => {
    if (!activeSeat) return;
    const handler = () => setActiveSeat(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [activeSeat]);

  // Helper: tính vị trí fixed cho popup từ rect của ghế được click
  const openSeatPopup = (e, seat) => {
    e.stopPropagation();
    if (activeSeat?.seat_id === seat.seat_id) { setActiveSeat(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const POPUP_H = 132; // ~height of popup (4 rows)
    const above   = rect.top > POPUP_H + 8; // đủ chỗ phía trên?
    setPopupPos({
      top:  above ? rect.top - POPUP_H - 6 : rect.bottom + 6,
      left: Math.min(rect.left + rect.width / 2 - 72, window.innerWidth - 152),
    });
    setActiveSeat(seat);
  };

  // Nhóm ghế theo hàng
  const rowsMap = useMemo(() => {
    const map = {};
    for (const s of seats) {
      if (!map[s.row]) map[s.row] = [];
      map[s.row].push(s);
    }
    for (const r of Object.keys(map)) map[r].sort((a, b) => a.number - b.number);
    return map;
  }, [seats]);
  const sortedRows = Object.keys(rowsMap).sort();

  // Thống kê nhanh
  const stats = useMemo(() => ({
    total:       seats.length,
    active:      seats.filter(s => s.status === 'active').length,
    vip:         seats.filter(s => s.type === 'vip' && s.status === 'active').length,
    couple:      seats.filter(s => s.type === 'couple' && s.status === 'active').length,
    maintenance: seats.filter(s => s.status === 'maintenance').length,
    broken:      seats.filter(s => s.status === 'broken').length,
  }), [seats]);

  // ── Apply row type ──────────────────────────────────────────────────────────
  const applyRowType = async (row, type) => {
    setSaving(true);
    try {
      const res = await api.patch(`/rooms/${room._id}/row-type`, { row, type });
      const newSeats = res.data.seats || [];
      setSeats(newSeats);
      setRowTypes(prev => ({ ...prev, [row]: type }));
      setPending(prev => { const n = { ...prev }; delete n[row]; return n; });
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi cập nhật loại hàng ghế');
    } finally {
      setSaving(false);
    }
  };

  // ── Update seat status ──────────────────────────────────────────────────────
  const updateSeatStatus = async (seat, status) => {
    if (seat.status === status) { setActiveSeat(null); return; }
    setSaving(true);
    setActiveSeat(null);
    try {
      await api.patch(`/rooms/${room._id}/seat-status`, { seat_id: seat.seat_id, status });
      setSeats(prev => prev.map(s => s.seat_id === seat.seat_id ? { ...s, status } : s));
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi cập nhật trạng thái ghế');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      {/* Modal rộng hơn để chứa 2 cột */}
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">

        {/* ── Header ── */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            {saving && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            )}
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Sơ đồ ghế — {room.name}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {room.screen_type} · {room.capacity} ghế
                {saving && <span className="ml-2 text-brand-500">Đang lưu...</span>}
              </p>
            </div>
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

        {/* ── Body (responsive: cột dọc trên mobile, 2 cột ngang trên desktop) ── */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

          {/* ── Cột trái: Sơ đồ ghế tương tác ── */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-800">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
              </div>
            ) : seats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <p className="text-sm">Phòng chưa có dữ liệu ghế</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Màn hình */}
                <div className="flex flex-col items-center gap-1">
                  <div className="w-2/3 h-2 rounded-t-full bg-gradient-to-r from-blue-300 via-blue-500 to-blue-300 opacity-80" />
                  <p className="text-xs font-medium text-blue-500 dark:text-blue-400 tracking-widest uppercase mt-1">
                    Màn hình — {room.screen_type}
                  </p>
                </div>

                {/* Tip */}
                <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                  Click vào ghế để thay đổi trạng thái
                </p>

                {/* Grid ghế */}
                <div className="overflow-x-auto pb-2 flex justify-center">
                  <div className="inline-flex flex-col items-center gap-1.5">
                    {sortedRows.map((row) => (
                      <div key={row} className="flex items-center gap-1.5">
                        <span className="w-5 text-center text-xs font-bold text-gray-400 dark:text-gray-500 shrink-0">{row}</span>
                        {rowsMap[row].map((seat) => (
                          <div
                            key={seat.seat_id}
                            onClick={(e) => openSeatPopup(e, seat)}
                            title={`${seat.seat_id} · ${seat.type} · ${seat.status}`}
                            className={`
                              w-7 h-7 rounded border flex items-center justify-center
                              text-[9px] font-semibold cursor-pointer
                              transition-all duration-150 select-none
                              ${getAdminSeatStyle(seat)}
                              ${activeSeat?.seat_id === seat.seat_id ? 'ring-2 ring-brand-500 ring-offset-1 scale-110' : 'hover:scale-105'}
                            `}
                          >
                            {seat.status === 'active'
                              ? <span>{seat.number}</span>
                              : seat.status === 'broken'
                                ? <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                : <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
                            }
                          </div>
                        ))}
                        <span className="w-5 text-center text-xs font-bold text-gray-400 dark:text-gray-500 shrink-0">{row}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Legend + stats */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/50 text-xs">
                  <div className="flex flex-wrap gap-3">
                    {[
                      { cls: 'bg-gray-100 border-gray-300 dark:bg-gray-800 dark:border-gray-600', label: 'Thường' },
                      { cls: 'bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-600', label: 'VIP' },
                      { cls: 'bg-pink-50 border-pink-300 dark:bg-pink-900/20 dark:border-pink-600', label: 'Đôi' },
                      { cls: 'bg-orange-100 border-orange-400 dark:bg-orange-900/30 dark:border-orange-600', label: 'Bảo trì' },
                      { cls: 'bg-red-100 border-red-400 dark:bg-red-900/30 dark:border-red-600', label: 'Hỏng' },
                    ].map(({ cls, label }) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <div className={`w-3.5 h-3.5 rounded border ${cls}`} />
                        <span className="text-gray-500 dark:text-gray-400">{label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3 text-gray-500 dark:text-gray-400">
                    <span>Tổng: <strong className="text-gray-700 dark:text-gray-300">{stats.total}</strong></span>
                    <span>Hoạt động: <strong className="text-green-600 dark:text-green-400">{stats.active}</strong></span>
                    {stats.vip > 0 && <span>VIP: <strong className="text-yellow-600">{stats.vip}</strong></span>}
                    {stats.couple > 0 && <span>Đôi: <strong className="text-pink-600">{stats.couple}</strong></span>}
                    {stats.maintenance > 0 && <span>Bảo trì: <strong className="text-orange-600">{stats.maintenance}</strong></span>}
                    {stats.broken > 0 && <span>Hỏng: <strong className="text-red-600">{stats.broken}</strong></span>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Cột phải: Panel cấu hình loại hàng ghế ── */}
          <div className="w-full md:w-72 shrink-0 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900/60 max-h-64 md:max-h-none">
            <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-bold text-gray-800 dark:text-white">Cấu hình loại hàng</h3>
              <p className="text-xs text-gray-400 mt-0.5">Chọn loại ghế cho từng hàng</p>
            </div>

            {/* Hướng dẫn multiplier */}
            <div className="px-4 py-3 flex gap-2 flex-wrap border-b border-gray-200 dark:border-gray-800">
              {ROW_TYPE_OPTIONS.map(opt => (
                <div key={opt.value} className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${opt.color}`}>
                  <span>{opt.label}</span>
                  <span className="opacity-60">
                    ×{opt.value === 'regular' ? '1.0' : opt.value === 'vip' ? '1.5' : '2.0'}
                  </span>
                </div>
              ))}
            </div>

            {/* Danh sách hàng — 2 cột trên mobile để tiết kiệm chiều cao */}
            <div className="flex-1 overflow-y-auto">            
              <div className="grid grid-cols-2 md:grid-cols-1 divide-y-0 md:divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                </div>
              ) : sortedRows.map((row) => {
                const currentType = rowTypes[row] || 'regular';
                const pending     = pendingRows[row];
                const displayType = pending ?? currentType;

                return (
                  <div key={row} className="px-3 py-2 md:px-4 md:py-3 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800">
                    {/* Label hàng */}
                    <span className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-200 dark:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 shrink-0">
                      {row}
                    </span>

                    {/* Dropdown chọn loại */}
                    <select
                      value={displayType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPending(prev => ({ ...prev, [row]: val }));
                      }}
                      className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    >
                      {ROW_TYPE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label} (×{opt.value === 'regular' ? '1.0' : opt.value === 'vip' ? '1.5' : '2.0'})</option>
                      ))}
                    </select>

                    {/* Nút Áp dụng — chỉ hiện khi có thay đổi */}
                    {pending && pending !== currentType ? (
                      <button
                        onClick={() => applyRowType(row, pending)}
                        disabled={saving}
                        className="shrink-0 rounded-lg bg-brand-500 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
                      >
                        Lưu
                      </button>
                    ) : (
                      <div className={`shrink-0 w-2 h-2 rounded-full ${
                        currentType === 'vip' ? 'bg-yellow-400' :
                        currentType === 'couple' ? 'bg-pink-400' : 'bg-gray-300 dark:bg-gray-600'
                      }`} />
                    )}
                  </div>
                );
              })}
              </div>
            </div>

            {/* Tip dưới cùng */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800">
              <p className="text-[10px] text-gray-400 leading-relaxed">
                💡 Thay đổi loại hàng sẽ cập nhật <strong>tất cả ghế</strong> trong hàng đó và hệ số giá tương ứng.
              </p>
            </div>
          </div>

        {/* ── Popup trạng thái ghế (fixed — thoát khỏi overflow container) ── */}
        {activeSeat && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'fixed', top: popupPos.top, left: popupPos.left, zIndex: 99999 }}
            className="w-36 rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800 animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="px-2 py-1.5 border-b border-gray-100 dark:border-gray-700">
              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Ghế {activeSeat.seat_id}
              </p>
            </div>
            {SEAT_STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => updateSeatStatus(activeSeat, opt.value)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-colors ${opt.cls} ${activeSeat.status === opt.value ? 'font-bold' : ''}`}
              >
                <span className="w-3 text-center">{activeSeat.status === opt.value ? '●' : opt.icon}</span>
                {opt.label}
                {activeSeat.status === opt.value && <span className="ml-auto text-[9px] opacity-60">Hiện tại</span>}
              </button>
            ))}
          </div>
        )}

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
