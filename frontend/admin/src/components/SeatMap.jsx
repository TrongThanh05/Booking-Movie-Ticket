/**
 * SeatMap.jsx — Hiển thị sơ đồ ghế của một phòng chiếu
 *
 * Props:
 *   seats: Array<{ seat_id, row, number, type, status, price_multiplier }>
 *   screenType?: string  — Tên loại màn hình (2D, IMAX, 4DX...)
 *
 * Màu sắc ghế:
 *   active   + regular → xám nhạt / hover xanh dương
 *   active   + vip     → vàng nhạt / hover vàng đậm
 *   active   + couple  → hồng nhạt / hover hồng đậm
 *   broken   → đỏ nhạt (có icon X)
 *   maintenance → cam nhạt (có icon wrench)
 */
import { useMemo } from 'react';

// ── Màu ghế theo type + status ────────────────────────────────────────────────
const SEAT_STYLES = {
  active: {
    regular: 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-blue-100 hover:border-blue-400 hover:text-blue-700 cursor-default dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-blue-900/30 dark:hover:border-blue-500',
    vip    : 'bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100 hover:border-yellow-500 cursor-default dark:bg-yellow-900/20 dark:border-yellow-600 dark:text-yellow-400 dark:hover:bg-yellow-900/40',
    couple : 'bg-pink-50 border-pink-300 text-pink-700 hover:bg-pink-100 hover:border-pink-400 cursor-default dark:bg-pink-900/20 dark:border-pink-600 dark:text-pink-400 dark:hover:bg-pink-900/40',
  },
  broken     : 'bg-red-100 border-red-400 text-red-600 cursor-not-allowed dark:bg-red-900/30 dark:border-red-600 dark:text-red-400',
  maintenance: 'bg-orange-100 border-orange-400 text-orange-600 cursor-not-allowed dark:bg-orange-900/30 dark:border-orange-600 dark:text-orange-400',
};

const getSeatStyle = (seat) => {
  if (seat.status === 'broken')      return SEAT_STYLES.broken;
  if (seat.status === 'maintenance') return SEAT_STYLES.maintenance;
  return SEAT_STYLES.active[seat.type] ?? SEAT_STYLES.active.regular;
};

// ── Icon trạng thái ghế hỏng / bảo trì ──────────────────────────────────────
const SeatIcon = ({ status }) => {
  if (status === 'broken') {
    return (
      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    );
  }
  if (status === 'maintenance') {
    return (
      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
      </svg>
    );
  }
  return null;
};

// ── Legend item ───────────────────────────────────────────────────────────────
const LegendItem = ({ colorClass, label }) => (
  <div className="flex items-center gap-1.5">
    <div className={`w-4 h-4 rounded border ${colorClass} shrink-0`} />
    <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────
const SeatMap = ({ seats = [], screenType = '2D' }) => {
  // Nhóm ghế theo hàng (row)
  const rowsMap = useMemo(() => {
    const map = {};
    for (const seat of seats) {
      if (!map[seat.row]) map[seat.row] = [];
      map[seat.row].push(seat);
    }
    // Sắp xếp ghế trong mỗi hàng theo số
    for (const row of Object.keys(map)) {
      map[row].sort((a, b) => a.number - b.number);
    }
    return map;
  }, [seats]);

  const sortedRows = Object.keys(rowsMap).sort();

  // Thống kê
  const stats = useMemo(() => {
    const total       = seats.length;
    const broken      = seats.filter(s => s.status === 'broken').length;
    const maintenance = seats.filter(s => s.status === 'maintenance').length;
    const active      = total - broken - maintenance;
    const vip         = seats.filter(s => s.type === 'vip' && s.status === 'active').length;
    const couple      = seats.filter(s => s.type === 'couple' && s.status === 'active').length;
    return { total, active, broken, maintenance, vip, couple };
  }, [seats]);

  if (seats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-600">
        <svg className="w-12 h-12 mb-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
        <p className="text-sm">Phòng chưa có dữ liệu ghế</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Màn hình ── */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-2/3 h-2 rounded-t-full bg-gradient-to-r from-blue-300 via-blue-500 to-blue-300 opacity-80" />
        <div className="w-3/4 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-40 blur-sm" />
        <p className="text-xs font-medium text-blue-500 dark:text-blue-400 tracking-widest uppercase mt-1">
          Màn hình — {screenType}
        </p>
      </div>

      {/* ── Sơ đồ ghế ── */}
      <div className="overflow-x-auto pb-2">
        <div className="inline-flex flex-col items-start gap-1.5 min-w-max mx-auto">
          {sortedRows.map((row) => (
            <div key={row} className="flex items-center gap-1.5">
              {/* Label hàng */}
              <span className="w-5 text-center text-xs font-bold text-gray-400 dark:text-gray-500 shrink-0">
                {row}
              </span>

              {/* Ghế trong hàng */}
              {rowsMap[row].map((seat) => (
                <div
                  key={seat.seat_id}
                  title={`${seat.seat_id} · ${seat.type} · ${seat.status}`}
                  className={`
                    relative w-7 h-7 rounded border flex items-center justify-center
                    text-[9px] font-semibold transition-all duration-150
                    ${getSeatStyle(seat)}
                  `}
                >
                  {seat.status === 'active'
                    ? <span>{seat.number}</span>
                    : <SeatIcon status={seat.status} />
                  }
                </div>
              ))}

              {/* Label hàng (phải) */}
              <span className="w-5 text-center text-xs font-bold text-gray-400 dark:text-gray-500 shrink-0">
                {row}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Legend + Thống kê ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/50">
        <div className="flex flex-wrap gap-3">
          <LegendItem colorClass="bg-gray-100 border-gray-300 dark:bg-gray-800 dark:border-gray-600"    label="Thường" />
          <LegendItem colorClass="bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-600" label="VIP" />
          <LegendItem colorClass="bg-pink-50 border-pink-300 dark:bg-pink-900/20 dark:border-pink-600"  label="Đôi" />
          <LegendItem colorClass="bg-orange-100 border-orange-400 dark:bg-orange-900/30 dark:border-orange-600" label="Bảo trì" />
          <LegendItem colorClass="bg-red-100 border-red-400 dark:bg-red-900/30 dark:border-red-600"     label="Hỏng" />
        </div>
        <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span>Tổng: <strong className="text-gray-700 dark:text-gray-300">{stats.total}</strong></span>
          <span>Hoạt động: <strong className="text-green-600 dark:text-green-400">{stats.active}</strong></span>
          {stats.vip > 0    && <span>VIP: <strong className="text-yellow-600 dark:text-yellow-400">{stats.vip}</strong></span>}
          {stats.couple > 0 && <span>Đôi: <strong className="text-pink-600 dark:text-pink-400">{stats.couple}</strong></span>}
          {stats.maintenance > 0 && <span>Bảo trì: <strong className="text-orange-600 dark:text-orange-400">{stats.maintenance}</strong></span>}
          {stats.broken > 0 && <span>Hỏng: <strong className="text-red-600 dark:text-red-400">{stats.broken}</strong></span>}
        </div>
      </div>
    </div>
  );
};

export default SeatMap;
