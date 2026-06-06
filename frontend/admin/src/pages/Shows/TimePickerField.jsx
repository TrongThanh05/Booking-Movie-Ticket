/**
 * TimePickerField.jsx
 * Input giờ linh hoạt:
 *  - Gõ tay trực tiếp HH:MM (hỗ trợ giờ lẻ như 10:11)
 *  - Panel quick-select các mốc phổ biến (mỗi 30 phút)
 *  - Auto-format và validate khi blur
 *  - Dark mode: detect via useTheme()
 */
import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';

const pad = (n) => String(n).padStart(2, '0');

// Mốc quick-select: 07:00 → 23:30, step 30 phút
const QUICK_SLOTS = (() => {
  const list = [];
  for (let h = 7; h <= 23; h++) {
    list.push(`${pad(h)}:00`);
    if (h < 23) list.push(`${pad(h)}:30`);
  }
  return list;
})();

// Parse chuỗi người dùng nhập → "HH:MM" hoặc null nếu không hợp lệ
const parseInput = (raw) => {
  if (!raw) return null;
  const digits = raw.replace(/[^\d:]/g, '');
  let h, m;
  if (digits.includes(':')) {
    [h, m] = digits.split(':').map(Number);
  } else if (digits.length === 4) {
    h = Number(digits.slice(0, 2));
    m = Number(digits.slice(2, 4));
  } else if (digits.length === 3) {
    h = Number(digits.slice(0, 1));
    m = Number(digits.slice(1, 3));
  } else {
    return null;
  }
  if (isNaN(h) || isNaN(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${pad(h)}:${pad(m)}`;
};

export default function TimePickerField({
  label,
  id,
  value,
  onChange,
  disabled = false,
  required = false,
  error,
}) {
  const { theme } = useTheme();
  const dk = theme === 'dark';

  const [inputVal, setInputVal]   = useState(value || '');
  const [showPanel, setShowPanel] = useState(false);
  const ref = useRef(null);

  useEffect(() => { setInputVal(value || ''); }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShowPanel(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const emit = (val) => onChange?.({ target: { value: val } });

  const handleBlur = () => {
    const parsed = parseInput(inputVal);
    if (parsed) { setInputVal(parsed); emit(parsed); }
    else if (!inputVal) emit('');
  };

  const handleChange = (e) => {
    const raw = e.target.value;
    setInputVal(raw);
    if (/^\d{2}:\d{2}$/.test(raw)) {
      const parsed = parseInput(raw);
      if (parsed) emit(parsed);
    }
  };

  const handleKeyDown = (e) => {
    const raw = e.target.value;
    if (/^\d{2}$/.test(raw) && e.key !== 'Backspace' && e.key !== ':') {
      setInputVal(raw + ':');
    }
  };

  const handleQuickSelect = (slot) => {
    setInputVal(slot);
    emit(slot);
    setShowPanel(false);
  };

  const isValid = !inputVal || parseInput(inputVal) !== null;

  const panelRef = useRef(null);
  useEffect(() => {
    if (!showPanel) return;
    const el = panelRef.current?.querySelector('[data-active="true"]');
    if (el) el.scrollIntoView({ block: 'center', behavior: 'auto' });
  }, [showPanel]);

  // ── Token màu theo theme ──
  const C = {
    labelColor:    dk ? '#D1D5DB' : '#374151',
    inputBg:       dk ? '#1F2937' : (disabled ? '#F9FAFB' : '#fff'),
    inputBorder:   (error || (!isValid && inputVal)) ? '#EF4444' : (dk ? '#374151' : '#D1D5DB'),
    inputText:     dk ? '#F9FAFB' : '#111827',
    inputDisabled: dk ? '#374151' : '#F9FAFB',
    iconColor:     inputVal && isValid ? '#6366F1' : (dk ? '#6B7280' : '#9CA3AF'),
    btnBg:         showPanel ? (dk ? '#312E81' : '#EEF2FF') : (dk ? '#374151' : '#F9FAFB'),
    btnBorder:     showPanel ? '#6366F1' : (dk ? '#4B5563' : '#D1D5DB'),
    btnIcon:       showPanel ? '#6366F1' : (dk ? '#9CA3AF' : '#6B7280'),
    panelBg:       dk ? '#1F2937' : '#fff',
    panelBorder:   dk ? '#374151' : '#E5E7EB',
    panelHead:     dk ? '#111827' : '#F8FAFF',
    panelHeadBorder: dk ? '#374151' : '#F3F4F6',
    slotBg:        dk ? '#111827' : '#F8FAFF',
    slotText:      dk ? '#D1D5DB' : '#374151',
    slotHoverBg:   dk ? '#312E81' : '#EEF2FF',
    slotHoverText: '#4F46E5',
    hintColor:     dk ? '#6B7280' : '#94A3B8',
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {label && (
        <label
          htmlFor={id}
          style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: C.labelColor }}
        >
          {label}
          {required && <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>}
        </label>
      )}

      {/* Input row */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>

        {/* Text input — gõ tay tự do */}
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke={C.iconColor} strokeWidth={2}>
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </span>
          <input
            id={id}
            type="text"
            inputMode="numeric"
            placeholder="HH:MM  (vd: 10:11)"
            value={inputVal}
            disabled={disabled}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            maxLength={5}
            style={{
              width: '100%',
              padding: '9px 12px 9px 34px',
              borderRadius: 8,
              border: `1.5px solid ${C.inputBorder}`,
              background: disabled ? C.inputDisabled : C.inputBg,
              fontSize: 13,
              color: C.inputText,
              outline: 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s',
              cursor: disabled ? 'not-allowed' : 'text',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.05em',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)';
              e.currentTarget.style.borderColor = '#6366F1';
            }}
            onBlurCapture={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              if (isValid || !inputVal) e.currentTarget.style.borderColor = C.inputBorder;
            }}
          />
        </div>

        {/* Nút mở quick-select */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setShowPanel((p) => !p)}
          title="Chọn nhanh giờ phổ biến"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 40, flexShrink: 0,
            borderRadius: 8,
            border: `1.5px solid ${C.btnBorder}`,
            background: C.btnBg,
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <svg width={15} height={15} fill="none" viewBox="0 0 24 24" stroke={C.btnIcon} strokeWidth={2}>
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Hint / error message */}
      {error && <p style={{ marginTop: 4, fontSize: 11, color: '#EF4444' }}>{error}</p>}
      {!error && !isValid && inputVal && (
        <p style={{ marginTop: 4, fontSize: 11, color: '#EF4444' }}>
          Định dạng không hợp lệ — nhập theo dạng HH:MM (vd: 10:11)
        </p>
      )}
      {!error && isValid && !inputVal && !disabled && (
        <p style={{ marginTop: 4, fontSize: 11, color: C.hintColor }}>
          Gõ giờ tự do hoặc bấm nút bên phải để chọn nhanh
        </p>
      )}

      {/* Quick-select panel */}
      {showPanel && (
        <div
          ref={panelRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0, right: 0,
            zIndex: 999,
            background: C.panelBg,
            border: `1.5px solid ${C.panelBorder}`,
            borderRadius: 12,
            boxShadow: dk ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.11)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '8px 12px', borderBottom: `1px solid ${C.panelHeadBorder}`,
            background: C.panelHead, fontSize: 11, fontWeight: 600, color: '#6366F1',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <svg width={11} height={11} fill="none" viewBox="0 0 24 24" stroke="#6366F1" strokeWidth={2}>
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Chọn nhanh (bước 30 phút)
            <span style={{ marginLeft: 'auto', fontWeight: 400, color: C.hintColor }}>
              hoặc gõ tay giờ bất kỳ
            </span>
          </div>

          {/* Grid slots */}
          <div style={{ maxHeight: 240, overflowY: 'auto', padding: '8px 10px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
            {QUICK_SLOTS.map((slot) => {
              const isActive = value === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  data-active={isActive}
                  onClick={() => handleQuickSelect(slot)}
                  style={{
                    padding: '7px 0',
                    borderRadius: 7,
                    border: isActive ? '1.5px solid #6366F1' : '1.5px solid transparent',
                    background: isActive ? '#6366F1' : C.slotBg,
                    color: isActive ? '#fff' : C.slotText,
                    fontSize: 12,
                    fontWeight: isActive ? 700 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.1s',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                  onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = C.slotHoverBg; e.currentTarget.style.color = C.slotHoverText; } }}
                  onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = C.slotBg; e.currentTarget.style.color = C.slotText; } }}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
