import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import PageBreadCrumb from '../../components/common/PageBreadCrumb';
import Button from '../../components/ui/button/Button';
import InputField from '../../components/ui/input/InputField';
import ShowTimeline from './ShowTimeline';
import DatePickerField from './DatePickerField';
import TimePickerField from './TimePickerField';
import { api } from '../../lib/api';

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmtPrice = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

const toDatetimeLocal = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
};

const addMinutes = (iso, mins) => {
  if (!iso || !mins) return null;
  return new Date(new Date(iso).getTime() + mins * 60000).toISOString();
};

const FORMATS = ['2D', '3D', 'IMAX', '4DX', 'ScreenX'];
const LANGUAGES = ['Phụ đề Việt', 'Lồng tiếng Việt', 'Phụ đề Anh', 'Nguyên bản'];

// ─── SelectField ──────────────────────────────────────────────────────────────
const SelectField = ({ label, id, value, onChange, options, placeholder, disabled, required, error }) => (
  <div>
    {label && (
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}{required && <span className="text-error-500 ml-0.5">*</span>}
      </label>
    )}
    <div className="relative">
      <select
        id={id} value={value} onChange={onChange} disabled={disabled}
        className={`w-full appearance-none rounded-lg border px-4 py-2.5 pr-10 text-sm transition-colors
          bg-white border-gray-300 text-gray-800
          focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10
          disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500
          dark:bg-gray-900 dark:border-gray-700 dark:text-white/90
          dark:focus:border-brand-400 dark:disabled:bg-gray-800
          ${error ? 'border-error-500 focus:border-error-500' : ''}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>
    {error && <p className="mt-1 text-xs text-error-500">{error}</p>}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const ShowForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  // ── Options
  const [movies,  setMovies]  = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [rooms,   setRooms]   = useState([]);

  // ── Form state — tách date/time để timeline load sau khi chọn ngày
  const [form, setForm] = useState({
    movie: '', cinema: '', room_id: '',
    showDate: '',   // YYYY-MM-DD
    showTime: '',   // HH:MM
    base_price: '80000',
    format: '2D', language: 'Phụ đề Việt',
    extraDuration: 0,  // phút quảng cáo/trailer thêm (admin nhập tay)
    is_active: true,
  });

  // showDateTime kết hợp cho submit / tính toán
  const showDateTime = form.showDate && form.showTime
    ? `${form.showDate}T${form.showTime}`
    : '';

  // ── Derived: selected movie object (for duration)
  const [selectedMovie, setSelectedMovie] = useState(null);

  // ── Timeline
  const [timelineShows, setTimelineShows] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // ── UI state
  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState({});
  const [apiError, setApiError] = useState('');
  const [conflict, setConflict] = useState(null);

  // ─── Load options ────────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/movies/admin', { params: { limit: 200 } })
      .then(r => setMovies(r.data?.data || r.data || []))
      .catch(() => {});
    api.get('/theaters/admin', { params: { limit: 200 } })
      .then(r => setCinemas(r.data?.data || r.data || []))
      .catch(() => {});
  }, []);

  // ─── Load rooms khi chọn rạp — dùng đúng endpoint /rooms?theater_id=xxx
  useEffect(() => {
    if (!form.cinema) { setRooms([]); return; }
    api.get('/rooms', { params: { theater_id: form.cinema } })
      .then(r => setRooms(Array.isArray(r.data) ? r.data : r.data?.data || []))
      .catch(() => setRooms([]));
  }, [form.cinema]);

  // ─── Load show for edit ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    api.get(`/shows/${id}`)
      .then(r => {
        const s = r.data;
        const dtLocal = toDatetimeLocal(s.showDateTime);
        const [datePart, timePart] = dtLocal.split('T');
        // extraDuration = duration - movieRuntime (ờng với trường hợp edit)
        const movieDur = s.movie?.runtime || 0;
        const extra = s.duration ? Math.max(0, s.duration - movieDur) : 0;
        setForm({
          movie:         s.movie?._id  || s.movie  || '',
          cinema:        s.cinema?._id || s.cinema || '',
          room_id:       s.room_id?._id || s.room_id || '',
          showDate:      datePart || '',
          showTime:      timePart || '',
          base_price:    s.base_price || '',
          format:        s.format || '2D',
          language:      s.language || 'Phụ đề Việt',
          extraDuration: extra,
          is_active:     s.is_active ?? true,
        });
        setSelectedMovie(s.movie);
      })
      .catch(() => {});
  }, [id, isEdit]);

  // ─── Update selectedMovie when movie field changes ───────────────────────
  useEffect(() => {
    if (!form.movie) { setSelectedMovie(null); return; }
    const found = movies.find(m => (m._id || m) === form.movie);
    if (found) setSelectedMovie(found);
  }, [form.movie, movies]);

  // ─── Load timeline khi có room + DATE (không cần giờ) ──────────────────
  const loadTimeline = useCallback(async () => {
    if (!form.room_id || !form.showDate) { setTimelineShows([]); return; }
    setTimelineLoading(true);
    try {
      const r = await api.get('/shows/by-date/' + form.showDate);
      const all = Array.isArray(r.data) ? r.data : r.data?.shows || [];
      setTimelineShows(all.filter(s => {
        const roomId = s.room_id?._id || s.room_id?.toString() || s.room_id;
        return roomId === form.room_id;
      }));
    } catch { setTimelineShows([]); }
    finally { setTimelineLoading(false); }
  }, [form.room_id, form.showDate]);

  useEffect(() => { loadTimeline(); }, [loadTimeline]);

  // ─── Computed end time ────────────────────────────────────────────────────
  // Tổng = runtime phim + phút quảng cáo/trailer thêm
  const movieDuration = Number(selectedMovie?.runtime || 0);
  const extraDuration = Number(form.extraDuration || 0);
  const totalDuration = movieDuration + extraDuration;
  const computedEndISO = (() => {
    if (!showDateTime || !totalDuration) return null;
    return addMinutes(new Date(showDateTime).toISOString(), totalDuration);
  })();

  // ─── Kiểm tra vượt 24:00 cùng ngày ─────────────────────────────────────
  const isOverMidnight = (() => {
    if (!showDateTime || !computedEndISO) return false;
    const start = new Date(showDateTime);
    const end   = new Date(computedEndISO);
    // Thời điểm 23:59:59 cùng ngày với start
    const midnight = new Date(start);
    midnight.setHours(24, 0, 0, 0);
    return end > midnight;
  })();

  // ─── Conflict check (client-side) ────────────────────────────────────────
  useEffect(() => {
    if (!showDateTime || !computedEndISO) { setConflict(null); return; }
    const start = new Date(showDateTime);
    const end   = new Date(computedEndISO);
    const found = timelineShows.find(s => {
      if (s._id === id) return false;
      const sStart = new Date(s.showDateTime);
      const sEnd   = s.endDateTime ? new Date(s.endDateTime) : new Date(sStart.getTime() + (s.duration || s.movie?.runtime || 120)*60000);
      return start < sEnd && end > sStart;
    });
    setConflict(found || null);
  }, [showDateTime, computedEndISO, timelineShows, id]);

  // ─── Field handler ────────────────────────────────────────────────────────
  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [field]: val }));
    setErrors(er => ({ ...er, [field]: '' }));
    setApiError('');
  };

  // ─── Validate ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.movie)     e.movie    = 'Vui lòng chọn phim';
    if (!form.cinema)    e.cinema   = 'Vui lòng chọn rạp';
    if (!form.room_id)   e.room_id  = 'Vui lòng chọn phòng chiếu';
    if (!form.showDate)  e.showDate = 'Vui lòng chọn ngày chiếu';
    if (!form.showTime)  e.showTime = 'Vui lòng chọn giờ chiếu';
    if (!form.base_price || isNaN(form.base_price)) e.base_price = 'Giá vé không hợp lệ';
    return e;
  };

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (conflict)        { setApiError('Xung đột lịch chiếu! Vui lòng chọn khung giờ khác.'); return; }
    if (isOverMidnight)  { setApiError('Thời gian chiếu vượt quá 24:00! Vui lòng chọn giờ sớm hơn hoặc giảm thời lượng.'); return; }

    setSaving(true);
    setApiError('');
    try {
      const payload = {
        movie:        form.movie,
        cinema:       form.cinema,
        room_id:      form.room_id,
        format:       form.format,
        language:     form.language,
        is_active:    form.is_active,
        base_price:   Number(form.base_price),
        duration:     totalDuration || undefined,
        showDateTime: new Date(showDateTime).toISOString(),
      };
      if (isEdit) {
        await api.put(`/shows/${id}`, payload);
      } else {
        await api.post('/shows', payload);
      }
      navigate('/admin/shows');
    } catch (err) {
      setApiError(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Movie / cinema / room options ───────────────────────────────────────
  const movieOpts  = movies.map(m  => ({ value: m._id, label: m.title }));
  const cinemaOpts = cinemas.map(c => ({ value: c._id, label: c.name }));
  const roomOpts   = rooms.map(r   => ({ value: r._id, label: r.name }));


  return (
    <>
      <PageMeta title={`${isEdit ? 'Sửa' : 'Thêm'} Suất Chiếu | CineAdmin`} />
      <PageBreadCrumb
        pageTitle={isEdit ? 'Sửa suất chiếu' : 'Thêm suất chiếu'}
        items={[{ label: 'Lịch Chiếu', path: '/admin/shows' }, { label: isEdit ? 'Sửa' : 'Thêm mới' }]}
      />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">

          {/* ── LEFT: Form panel ──────────────────────────────────────────── */}
          <div className="xl:col-span-2 space-y-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 space-y-5">
              <h2 className="text-base font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                {isEdit ? 'Chỉnh sửa suất chiếu' : 'Thêm suất chiếu mới'}
              </h2>

              {/* Movie */}
              <SelectField
                label="Phim" id="movie" required
                value={form.movie} onChange={set('movie')}
                options={movieOpts} placeholder="-- Chọn phim --"
                error={errors.movie}
              />

              {/* Movie info badge */}
              {selectedMovie && (
                <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3 dark:border-brand-800 dark:bg-brand-900/20">
                  <div className="h-12 w-9 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700">
                    {selectedMovie.poster_path && (
                      <img src={`/src/assets/images/posters/${selectedMovie.poster_path}`} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-brand-700 dark:text-brand-300 truncate">{selectedMovie.title}</p>
                    {selectedMovie.runtime && (
                      <p className="text-xs text-brand-500 dark:text-brand-400 mt-0.5">⏱ {selectedMovie.runtime} phút</p>
                    )}
                  </div>
                </div>
              )}

              {/* Cinema */}
              <SelectField
                label="Rạp chiếu" id="cinema" required
                value={form.cinema} onChange={(e) => { set('cinema')(e); setForm(f => ({ ...f, room_id: '' })); }}
                options={cinemaOpts} placeholder="-- Chọn rạp --"
                error={errors.cinema}
              />

              {/* Room */}
              <SelectField
                label="Phòng chiếu" id="room_id" required
                value={form.room_id} onChange={set('room_id')}
                options={roomOpts} placeholder={form.cinema ? '-- Chọn phòng --' : '-- Chọn rạp trước --'}
                disabled={!form.cinema || roomOpts.length === 0}
                error={errors.room_id}
              />

              {/* Ngày chiếu — custom calendar picker, chặn ngày quá khứ */}
              <DatePickerField
                label="Ngày chiếu"
                id="showDate"
                required
                value={form.showDate}
                onChange={set('showDate')}
                disabled={!form.room_id}
                error={errors.showDate}
              />

              {/* Giờ chiếu — custom time picker grid */}
              <TimePickerField
                label="Giờ chiếu"
                id="showTime"
                required
                value={form.showTime}
                onChange={set('showTime')}
                disabled={!form.showDate}
                error={errors.showTime}
              />

              {/* Thời lượng: 2 cột — trái: thời lượng phim (read-only) | phải: thời gian thêm */}
              <div>
                <p className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Thời lượng chiếu
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {/* Cột trái: thời lượng phim (disabled) */}
                  <div>
                    <div className="relative">
                      <input
                        type="number" readOnly disabled
                        value={movieDuration || ''}
                        placeholder="Chưa chọn phim"
                        className="w-full rounded-lg border px-4 py-2.5 pr-14 text-sm
                          bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed
                          dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium pointer-events-none">
                        phút
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      ⏱ Thời lượng phim
                    </p>
                  </div>

                  {/* Cột phải: thời gian thêm (admin nhập) */}
                  <div>
                    <div className="relative">
                      <input
                        id="extraDuration" type="number"
                        min="0" max="60" step="5"
                        value={form.extraDuration}
                        onChange={set('extraDuration')}
                        placeholder="0"
                        className="w-full rounded-lg border px-4 py-2.5 pr-14 text-sm
                          bg-white border-gray-300 text-gray-800
                          focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10
                          dark:bg-gray-900 dark:border-gray-700 dark:text-white/90"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium pointer-events-none">
                        phút
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      &#43; Quảng cáo / trailer
                    </p>
                  </div>
                </div>

                {/* Tổng thời lượng */}
                {totalDuration > 0 && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2">
                    <svg className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span className="text-xs text-indigo-600 dark:text-indigo-400">
                      Tổng thời gian chiếu:&nbsp;
                      <strong>{totalDuration} phút</strong>
                      {extraDuration > 0 && (
                        <span className="text-indigo-400"> ({movieDuration} + {extraDuration} phút quảng cáo)</span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Computed end time + warnings */}
              {computedEndISO && (
                <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm
                  ${
                    conflict
                      ? 'bg-error-50 border border-error-200 text-error-700 dark:bg-error-900/20 dark:border-error-800 dark:text-error-400'
                      : isOverMidnight
                      ? 'bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400'
                      : 'bg-gray-50 border border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'
                  }`}
                >
                  {conflict ? (
                    <svg className="w-4 h-4 text-error-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  ) : isOverMidnight ? (
                    <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-brand-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  )}
                  <span>
                    Kết thúc:{' '}
                    <strong>{new Date(computedEndISO).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</strong>
                    {conflict && (
                      <span className="ml-2 font-medium">
                        — Trùng với &quot;{conflict.movie?.title || 'suất chiếu khác'}&quot;
                      </span>
                    )}
                    {!conflict && isOverMidnight && (
                      <span className="ml-2 font-medium">
                        — Vượt quá 24:00, không thể tạo lịch!
                      </span>
                    )}
                  </span>
                </div>
              )}

              {/* Format & Language */}
              <div className="grid grid-cols-2 gap-4">
                <SelectField
                  label="Định dạng" id="format"
                  value={form.format} onChange={set('format')}
                  options={FORMATS}
                />
                <SelectField
                  label="Ngôn ngữ" id="language"
                  value={form.language} onChange={set('language')}
                  options={LANGUAGES}
                />
              </div>

              {/* Price */}
              <InputField
                label="Giá vé gốc (VND)" id="base_price" type="number" required
                min="0" placeholder="80000" step="5000"
                value={form.base_price} onChange={set('base_price')}
                error={errors.base_price}
              />
              {form.base_price && !isNaN(form.base_price) && (
                <p className="text-xs text-gray-500 dark:text-gray-400 -mt-3">{fmtPrice(form.base_price)}</p>
              )}

              {/* Active toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={form.is_active} onChange={set('is_active')} />
                  <div className={`w-10 h-6 rounded-full transition-colors ${form.is_active ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {form.is_active ? 'Kích hoạt suất chiếu' : 'Tạm dừng suất chiếu'}
                </span>
              </label>

              {/* API error */}
              {apiError && (
                <div className="flex items-start gap-2 rounded-lg bg-error-50 border border-error-200 px-4 py-3 text-sm text-error-700 dark:bg-error-900/20 dark:border-error-800 dark:text-error-400">
                  <svg className="mt-0.5 w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  </svg>
                  {apiError}
                </div>
              )}

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => navigate('/admin/shows')}>Huỷ</Button>
                <Button
                  type="submit"
                  disabled={saving || Boolean(conflict) || isOverMidnight}
                  className={(conflict || isOverMidnight) ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  {saving ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                      Đang lưu...
                    </>
                  ) : isEdit ? 'Cập nhật suất chiếu' : 'Tạo suất chiếu'}
                </Button>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Timeline panel ─────────────────────────────────────── */}
          <div className="xl:col-span-3 space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                  <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  Timeline phòng chiếu
                </h2>
                {form.showDate && (
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
                    {new Date(form.showDate).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </span>
                )}
              </div>

              {!form.room_id || !form.showDate ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {!form.room_id ? 'Chọn phim → Rạp → Phòng → Ngày' : 'Chọn ngày chiếu để xem lịch'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Timeline sẽ hiển thị các suất chiếu đã có</p>
                </div>
              ) : timelineLoading ? (
                <div className="flex items-center justify-center py-12 gap-3 text-gray-400">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  <span className="text-sm">Đang tải lịch chiếu...</span>
                </div>
              ) : (
                <ShowTimeline
                  shows={timelineShows}
                  editingId={isEdit ? id : null}
                  editingStart={showDateTime ? new Date(showDateTime).toISOString() : null}
                  editingEnd={computedEndISO}
                  editingTitle={selectedMovie?.title || 'Suất chiếu mới'}
                />
              )}
            </div>

            {/* ── Slot stats ─────────────────────────────────────────────── */}
            {timelineShows.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Suất đã lên lịch', value: timelineShows.length, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20' },
                  { label: 'Xung đột phát hiện', value: conflict ? 1 : 0, color: conflict ? 'text-error-600 dark:text-error-400' : 'text-emerald-600 dark:text-emerald-400', bg: conflict ? 'bg-error-50 dark:bg-error-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20' },
                  { label: 'Thời lượng chiếu', value: totalDuration ? `${totalDuration} phút` : '—', color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/20' },
                ].map((stat) => (
                  <div key={stat.label} className={`rounded-xl px-4 py-3 ${stat.bg}`}>
                    <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </form>
    </>
  );
};

export default ShowForm;
