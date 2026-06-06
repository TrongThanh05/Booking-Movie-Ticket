/**
 * DatePickerField.jsx
 * Calendar popup date picker — chặn ngày quá khứ, UX dễ dùng hơn type="date"
 * Dark mode: detect via useTheme()
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';

const DAYS   = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTHS = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
                'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

const pad  = (n) => String(n).padStart(2, '0');
const toISO = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parseISO = (str) => {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
};

const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const firstDayOf  = (year, month) => new Date(year, month, 1).getDay();

export default function DatePickerField({
  label,
  id,
  value,
  onChange,
  disabled = false,
  required = false,
  error,
  minDate,
}) {
  const { theme } = useTheme();
  const dk = theme === 'dark';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minISO    = minDate || toISO(today.getFullYear(), today.getMonth(), today.getDate());
  const minParsed = parseISO(minISO);

  const parsed = parseISO(value);
  const [open, setOpen]         = useState(false);
  const [viewYear, setViewYear] = useState(parsed?.year  ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth());
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (parsed) { setViewYear(parsed.year); setViewMonth(parsed.month); }
  }, [value]); // eslint-disable-line

  const isBeforeMin = useCallback((y, m, d) => {
    const cell = new Date(y, m, d);
    const min  = new Date(minParsed.year, minParsed.month, minParsed.day);
    return cell < min;
  }, [minParsed]);

  const selectDate = (day) => {
    const iso = toISO(viewYear, viewMonth, day);
    if (typeof onChange === 'function') onChange({ target: { value: iso } });
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const displayValue = parsed
    ? `${pad(parsed.day)}/${pad(parsed.month + 1)}/${parsed.year}`
    : '';

  const totalDays = daysInMonth(viewYear, viewMonth);
  const startDay  = firstDayOf(viewYear, viewMonth);
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  const isSelected = (d) => parsed && parsed.year === viewYear && parsed.month === viewMonth && parsed.day === d;
  const isToday    = (d) => today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === d;

  // ── Token màu theo theme ──
  const C = {
    inputBg:     dk ? '#1F2937' : (disabled ? '#F9FAFB' : '#fff'),
    inputBorder: error ? '#EF4444' : (dk ? '#374151' : '#D1D5DB'),
    inputText:   displayValue ? (dk ? '#F9FAFB' : '#111827') : (dk ? '#6B7280' : '#9CA3AF'),
    popupBg:     dk ? '#1F2937' : '#fff',
    popupBorder: dk ? '#374151' : '#E5E7EB',
    headerBtn:   dk ? '#374151' : '#F9FAFB',
    headerBtnBorder: dk ? '#4B5563' : '#E5E7EB',
    monthText:   dk ? '#F9FAFB' : '#111827',
    dayLabel:    dk ? '#6B7280' : '#9CA3AF',
    dayNormal:   dk ? '#D1D5DB' : '#111827',
    dayPast:     dk ? '#4B5563' : '#D1D5DB',
    dayHover:    dk ? '#312E81' : '#EEF2FF',
    footerBorder: dk ? '#374151' : '#F3F4F6',
    todayBtn:    dk ? '#312E81' : '#EEF2FF',
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {label && (
        <label
          htmlFor={id}
          style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: dk ? '#D1D5DB' : '#374151' }}
        >
          {label}
          {required && <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>}
        </label>
      )}

      {/* Input hiển thị */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '9px 14px',
          borderRadius: 8,
          border: `1.5px solid ${C.inputBorder}`,
          background: C.inputBg,
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: 13,
          color: C.inputText,
          transition: 'border-color 0.15s, box-shadow 0.15s',
          boxShadow: open ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
          outline: 'none',
        }}
      >
        <span>{displayValue || 'Chọn ngày chiếu...'}</span>
        <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke={open ? '#6366F1' : (dk ? '#6B7280' : '#9CA3AF')} strokeWidth={2}>
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </button>

      {error && <p style={{ marginTop: 4, fontSize: 11, color: '#EF4444' }}>{error}</p>}

      {/* Calendar popup */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 999,
            background: C.popupBg,
            border: `1.5px solid ${C.popupBorder}`,
            borderRadius: 14,
            boxShadow: dk ? '0 8px 32px rgba(0,0,0,0.45)' : '0 8px 32px rgba(0,0,0,0.13)',
            padding: 16,
            minWidth: 280,
            userSelect: 'none',
          }}
        >
          {/* Header: tháng/năm + điều hướng */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button
              type="button"
              onClick={prevMonth}
              style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.headerBtnBorder}`, background: C.headerBtn, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke={dk ? '#9CA3AF' : '#6B7280'} strokeWidth={2}><polyline points="15 18 9 12 15 6"/></svg>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.monthText }}>{MONTHS[viewMonth]}</span>
              <select
                value={viewYear}
                onChange={e => setViewYear(Number(e.target.value))}
                style={{ fontSize: 13, fontWeight: 600, color: '#6366F1', border: 'none', background: 'transparent', cursor: 'pointer', outline: 'none' }}
              >
                {Array.from({ length: 5 }, (_, i) => today.getFullYear() + i).map(y => (
                  <option key={y} value={y} style={{ background: C.popupBg, color: C.monthText }}>{y}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.headerBtnBorder}`, background: C.headerBtn, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke={dk ? '#9CA3AF' : '#6B7280'} strokeWidth={2}><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          {/* Tiêu đề thứ */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 6 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: C.dayLabel, paddingBottom: 4 }}>{d}</div>
            ))}
          </div>

          {/* Lưới ngày */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((day, idx) => {
              if (!day) return <div key={`e-${idx}`} />;
              const past      = isBeforeMin(viewYear, viewMonth, day);
              const selected  = isSelected(day);
              const todayCell = isToday(day);

              return (
                <button
                  key={day}
                  type="button"
                  disabled={past}
                  onClick={() => !past && selectDate(day)}
                  style={{
                    height: 34,
                    borderRadius: 8,
                    border: todayCell && !selected ? '1.5px solid #6366F1' : '1.5px solid transparent',
                    background: selected ? '#6366F1' : 'transparent',
                    color: selected ? '#fff' : past ? C.dayPast : todayCell ? '#6366F1' : C.dayNormal,
                    fontSize: 13,
                    fontWeight: selected ? 700 : todayCell ? 600 : 400,
                    cursor: past ? 'not-allowed' : 'pointer',
                    transition: 'background 0.12s',
                    textDecoration: past ? 'line-through' : 'none',
                    opacity: past ? 0.4 : 1,
                  }}
                  onMouseEnter={e => { if (!past && !selected) e.currentTarget.style.background = C.dayHover; }}
                  onMouseLeave={e => { if (!past && !selected) e.currentTarget.style.background = 'transparent'; }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Nút "Hôm nay" */}
          <div style={{ marginTop: 10, borderTop: `1px solid ${C.footerBorder}`, paddingTop: 10, display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); selectDate(today.getDate()); }}
              style={{
                fontSize: 12, fontWeight: 600, color: '#6366F1',
                background: C.todayBtn, border: 'none', borderRadius: 8,
                padding: '5px 16px', cursor: 'pointer',
              }}
            >
              Hôm nay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
