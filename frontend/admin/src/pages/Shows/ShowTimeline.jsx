/**
 * ShowTimeline.jsx — Vertical timeline, hiển thị lịch chiếu từ trên xuống theo thời gian
 * Background sáng, dễ nhìn, dùng cho Admin quản lý lịch chiếu
 */
import { useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';

// ─── Giờ hoạt động: 07:00 – 24:00 ───────────────────────────────────────────
const HOUR_START = 7;
const HOUR_END   = 24;

const pad  = (n) => String(n).padStart(2, '0');
const toHM = (date) => {
  const d = new Date(date);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Phút kể từ HOUR_START
const toMin = (date) => {
  const d = new Date(date);
  return d.getHours() * 60 + d.getMinutes() - HOUR_START * 60;
};

const TOTAL_MINS = (HOUR_END - HOUR_START) * 60;

// Palette màu pastel dễ nhìn trên nền sáng
const PALETTES = [
  { bg: '#EDE9FE', border: '#7C3AED', text: '#5B21B6', dot: '#7C3AED', badge: '#DDD6FE' }, // violet
  { bg: '#DBEAFE', border: '#2563EB', text: '#1E40AF', dot: '#2563EB', badge: '#BFDBFE' }, // blue
  { bg: '#D1FAE5', border: '#059669', text: '#065F46', dot: '#059669', badge: '#A7F3D0' }, // emerald
  { bg: '#FEF3C7', border: '#D97706', text: '#92400E', dot: '#D97706', badge: '#FDE68A' }, // amber
  { bg: '#FCE7F3', border: '#DB2777', text: '#9D174D', dot: '#DB2777', badge: '#FBCFE8' }, // pink
  { bg: '#CFFAFE', border: '#0891B2', text: '#164E63', dot: '#0891B2', badge: '#A5F3FC' }, // cyan
];

export default function ShowTimeline({
  shows = [],
  editingId    = null,
  editingStart = null,
  editingEnd   = null,
  editingTitle = '',
}) {
  const hours = useMemo(
    () => Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i),
    [],
  );

  // Chuẩn hoá các suất chiếu thành blocks với vị trí theo %
  const blocks = useMemo(() => {
    return shows
      .map((s, idx) => {
        const startMin = toMin(s.showDateTime);
        const endMin   = s.endDateTime
          ? toMin(s.endDateTime)
          : startMin + (s.duration || 120);
        if (endMin <= 0 || startMin >= TOTAL_MINS) return null;
        const clamped = { s: Math.max(0, startMin), e: Math.min(TOTAL_MINS, endMin) };

        // Giờ kết thúc tính toán (dùng endDateTime nếu có, ngược lại tính từ duration)
        const computedEnd = s.endDateTime
          ? new Date(s.endDateTime)
          : new Date(new Date(s.showDateTime).getTime() + (s.duration || 120) * 60000);

        return {
          id:          s._id,
          title:       s.movie?.title || 'Phim',
          backdrop:    s.movie?.backdrop_path || null,   // ảnh backdrop
          startStr:    toHM(s.showDateTime),
          endStr:      toHM(computedEnd),               // luôn có giờ kết thúc
          format:      s.format || '2D',
          language:    s.language || '',
          topPct:      (clamped.s / TOTAL_MINS) * 100,
          heightPct:   Math.max(2, ((clamped.e - clamped.s) / TOTAL_MINS) * 100),
          isEditing:   s._id === editingId,
          palette:     PALETTES[idx % PALETTES.length],
          durationMin: clamped.e - clamped.s,
        };
      })
      .filter(Boolean);
  }, [shows, editingId]);

  // Block của suất đang tạo/sửa mới
  const editingBlock = useMemo(() => {
    if (!editingStart || !editingEnd) return null;
    const startMin = toMin(editingStart);
    const endMin   = toMin(editingEnd);
    if (endMin <= startMin) return null;
    const clamped = { s: Math.max(0, startMin), e: Math.min(TOTAL_MINS, endMin) };
    return {
      topPct:    (clamped.s / TOTAL_MINS) * 100,
      heightPct: Math.max(2, ((clamped.e - clamped.s) / TOTAL_MINS) * 100),
      startStr:  toHM(editingStart),
      endStr:    toHM(editingEnd),
      title:     editingTitle || 'Suất chiếu mới',
      durationMin: clamped.e - clamped.s,
    };
  }, [editingStart, editingEnd, editingTitle]);

  const { theme } = useTheme();
  const dk = theme === 'dark';

  // ── Token màu theo theme ──
  const C = {
    wrapBg:       dk ? '#111827' : '#F8FAFF',
    wrapBorder:   dk ? '#1F2937' : '#E2E8F0',
    headerBg:     dk ? '#1F2937' : '#fff',
    headerBorder: dk ? '#374151' : '#E2E8F0',
    headerTitle:  dk ? '#F1F5F9' : '#1E293B',
    legendText:   dk ? '#94A3B8' : '#64748B',
    bodyBg:       'transparent',
    hourText:     (h) => h % 2 === 0 ? (dk ? '#CBD5E1' : '#475569') : (dk ? '#6B7280' : '#94A3B8'),
    gridLine:     (h) => h % 2 === 0 ? (dk ? '#374151' : '#CBD5E1') : (dk ? '#1F2937' : '#E2E8F0'),
    emptyGrad:    dk
      ? 'linear-gradient(to bottom, #0F172A 0%, #111827 100%)'
      : 'linear-gradient(to bottom, #F0F7FF 0%, #F8FAFF 100%)',
    editPulse:    dk ? 'rgba(250,204,21,0.15)' : 'rgba(245,158,11,0.08)',
    editBorder:   '#F59E0B',
    editText:     dk ? '#FDE68A' : '#92400E',
  };

  // Chiều cao mỗi giờ trong px (1 giờ = 64px)
  const PX_PER_HOUR = 64;
  const totalPx = (HOUR_END - HOUR_START) * PX_PER_HOUR;

  return (
    <div style={{ background: C.wrapBg, borderRadius: 16, border: `1px solid ${C.wrapBorder}`, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ background: C.headerBg, borderBottom: `1px solid ${C.headerBorder}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="#6366F1" strokeWidth={2}>
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.headerTitle }}>Lịch chiếu phòng trong ngày</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.legendText }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: dk ? '#4C1D95' : '#EDE9FE', border: '1.5px solid #7C3AED', display: 'inline-block' }}/>
            Đã lên lịch
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.legendText }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: dk ? '#451A03' : '#FFF3CD', border: '1.5px dashed #F59E0B', display: 'inline-block' }}/>
            Đang chỉnh sửa
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.legendText }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: dk ? '#052E16' : '#F0FDF4', border: `1.5px solid ${dk ? '#166534' : '#86EFAC'}`, display: 'inline-block' }}/>
            Trống
          </span>
        </div>
      </div>

      {/* Timeline body */}
      <div style={{ overflowY: 'auto', maxHeight: 520, padding: '0 16px 16px' }}>
        <div style={{ display: 'flex', gap: 0, position: 'relative', paddingTop: 8 }}>

          {/* Cột giờ (trái) */}
          <div style={{ width: 52, flexShrink: 0, position: 'relative', height: totalPx }}>
            {hours.map((h) => (
              <div
                key={h}
                style={{
                  position: 'absolute',
                  top: ((h - HOUR_START) / (HOUR_END - HOUR_START)) * totalPx - 9,
                  left: 0,
                  width: '100%',
                  textAlign: 'right',
                  paddingRight: 10,
                  fontSize: 11,
                  fontWeight: 600,
                  color: C.hourText(h),
                  userSelect: 'none',
                }}
              >
                {pad(h)}:00
              </div>
            ))}
          </div>

          {/* Khu vực grid + blocks */}
          <div style={{ flex: 1, position: 'relative', height: totalPx }}>

            {/* Grid lines theo giờ */}
            {hours.map((h) => (
              <div
                key={h}
                style={{
                  position: 'absolute',
                  top: ((h - HOUR_START) / (HOUR_END - HOUR_START)) * totalPx,
                  left: 0, right: 0,
                  height: 1,
                  background: C.gridLine(h),
                }}
              />
            ))}

            {/* Khoảng trống nổi bật (gradient nền) */}
            <div style={{ position: 'absolute', inset: 0, background: C.emptyGrad, borderRadius: 8 }} />

            {blocks.map((b) => (
              <div
                key={b.id}
                title={`${b.title} | ${b.startStr} – ${b.endStr}`}
                style={{
                  position: 'absolute',
                  top:    `${b.topPct}%`,
                  height: `${b.heightPct}%`,
                  left: 4, right: 4,
                  minHeight: 40,
                  borderRadius: 10,
                  overflow: 'hidden',
                  boxShadow: b.isEditing
                    ? `0 0 0 3px ${b.palette.border}, 0 2px 8px rgba(0,0,0,0.18)`
                    : '0 2px 6px rgba(0,0,0,0.13)',
                  zIndex: b.isEditing ? 10 : 5,
                  cursor: 'default',
                  transition: 'box-shadow 0.2s',
                  border: `2px solid ${b.palette.border}`,
                }}
              >
                {/* Backdrop image */}
                {b.backdrop ? (
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: `url(/src/assets/images/backdrops/${b.backdrop})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center top',
                  }} />
                ) : (
                  <div style={{ position: 'absolute', inset: 0, background: b.palette.bg }} />
                )}

                {/* Gradient overlay — tối bên dưới, sáng bên trên cho dễ đọc */}
                {b.backdrop && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.75) 100%)',
                  }} />
                )}

                {/* Nội dung block (z-index cao hơn overlay) */}
                <div style={{ position: 'relative', zIndex: 1, padding: '6px 10px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>

                  {/* Badge thời gian: giờ bắt đầu → giờ kết thúc */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, flexWrap: 'wrap' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      background: b.backdrop ? 'rgba(255,255,255,0.18)' : b.palette.badge,
                      backdropFilter: b.backdrop ? 'blur(4px)' : 'none',
                      borderRadius: 99,
                      border: b.backdrop ? '1px solid rgba(255,255,255,0.30)' : 'none',
                      padding: '2px 8px',
                      fontSize: 10, fontWeight: 700,
                      color: b.backdrop ? '#fff' : b.palette.text,
                    }}>
                      <svg width={9} height={9} fill="none" viewBox="0 0 24 24"
                        stroke={b.backdrop ? '#fff' : b.palette.dot} strokeWidth={2.5}>
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                      {b.startStr}
                    </span>

                    <svg width={10} height={10} fill="none" viewBox="0 0 24 24"
                      stroke={b.backdrop ? 'rgba(255,255,255,0.7)' : b.palette.text} strokeWidth={2}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>

                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      background: b.backdrop ? 'rgba(255,255,255,0.18)' : b.palette.badge,
                      backdropFilter: b.backdrop ? 'blur(4px)' : 'none',
                      borderRadius: 99,
                      border: b.backdrop ? '1px solid rgba(255,255,255,0.30)' : 'none',
                      padding: '2px 8px',
                      fontSize: 10, fontWeight: 700,
                      color: b.backdrop ? '#fff' : b.palette.text,
                    }}>
                      {b.endStr}
                    </span>

                    {b.isEditing && (
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        color: b.backdrop ? '#fff' : b.palette.border,
                        background: b.backdrop ? 'rgba(255,255,255,0.20)' : b.palette.badge,
                        borderRadius: 99, padding: '1px 6px',
                        border: b.backdrop ? '1px solid rgba(255,255,255,0.30)' : 'none',
                      }}>
                        ✎ Đang sửa
                      </span>
                    )}
                  </div>

                  {/* Tên phim */}
                  <p style={{
                    margin: 0,
                    fontSize: 12, fontWeight: 700,
                    color: b.backdrop ? '#fff' : b.palette.text,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    textShadow: b.backdrop ? '0 1px 3px rgba(0,0,0,0.6)' : 'none',
                  }}>
                    {b.title}
                  </p>

                  {/* Format + duration (chỉ khi block đủ cao) */}
                  {b.durationMin >= 45 && (
                    <p style={{
                      margin: '2px 0 0',
                      fontSize: 10,
                      color: b.backdrop ? 'rgba(255,255,255,0.75)' : b.palette.text,
                      opacity: b.backdrop ? 1 : 0.75,
                    }}>
                      {b.format}{b.language ? ` · ${b.language}` : ''} · {b.durationMin} phút
                    </p>
                  )}
                </div>
              </div>
            ))}

            {/* Block suất đang tạo/sửa */}
            {editingBlock && (
              <div
                title={`${editingBlock.title} | ${editingBlock.startStr} – ${editingBlock.endStr}`}
                style={{
                  position: 'absolute',
                  top:    `${editingBlock.topPct}%`,
                  height: `${editingBlock.heightPct}%`,
                  left: 4, right: 4,
                  minHeight: 36,
                  borderRadius: 10,
                  background: '#FFFBEB',
                  border: '2.5px dashed #F59E0B',
                  padding: '6px 10px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(245,158,11,0.20)',
                  zIndex: 20,
                  animation: 'pulse-soft 2s ease-in-out infinite',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    background: '#FDE68A', borderRadius: 99,
                    padding: '1px 7px', fontSize: 10, fontWeight: 700, color: '#92400E',
                  }}>
                    <svg width={9} height={9} fill="none" viewBox="0 0 24 24" stroke="#D97706" strokeWidth={2.5}>
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    {editingBlock.startStr} – {editingBlock.endStr}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#D97706', background: '#FDE68A', borderRadius: 99, padding: '1px 6px' }}>
                    ✦ Mới
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#92400E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {editingBlock.title}
                </p>
                {editingBlock.durationMin >= 45 && (
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: '#92400E', opacity: 0.75 }}>
                    {editingBlock.durationMin} phút
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer: danh sách tóm tắt */}
      {(blocks.length > 0 || editingBlock) && (
        <div style={{ borderTop: '1px solid #E2E8F0', background: '#fff', padding: '10px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {blocks.map((b) => (
            <div
              key={b.id}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: b.palette.bg, border: `1.5px solid ${b.palette.border}`,
                borderRadius: 99, padding: '3px 10px',
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: b.palette.dot }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: b.palette.text }}>{b.title}</span>
              <span style={{ fontSize: 10, color: b.palette.text, opacity: 0.7 }}>{b.startStr}–{b.endStr}</span>
              {b.isEditing && <span style={{ fontSize: 10, color: b.palette.border }}>✎</span>}
            </div>
          ))}
          {editingBlock && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#FFFBEB', border: '1.5px dashed #F59E0B',
              borderRadius: 99, padding: '3px 10px',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#F59E0B' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#92400E' }}>{editingBlock.title}</span>
              <span style={{ fontSize: 10, color: '#92400E', opacity: 0.7 }}>{editingBlock.startStr}–{editingBlock.endStr}</span>
              <span style={{ fontSize: 10, color: '#D97706' }}>✦ Mới</span>
            </div>
          )}
        </div>
      )}

      {blocks.length === 0 && !editingBlock && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#94A3B8', fontSize: 13 }}>
          Không có suất chiếu nào — toàn bộ khung giờ đang trống
        </div>
      )}

      {/* Inline keyframe animation */}
      <style>{`
        @keyframes pulse-soft {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.75; }
        }
      `}</style>
    </div>
  );
}
