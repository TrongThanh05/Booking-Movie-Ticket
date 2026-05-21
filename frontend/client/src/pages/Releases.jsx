import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Building2,
  Loader2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Film,
  LayoutGrid,
  List,
  X,
} from 'lucide-react';
import BlurCircle from '../components/BlurCircle';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getShows, getTheaters } from '../lib/api';

// ══════════════════════════════════════════════════════════════════════════════
// Constants & Helpers
// ══════════════════════════════════════════════════════════════════════════════

const DATE_TABS_COUNT = 15; // số ngày hiển thị trong thanh ngang

const buildDateTabs = (count = DATE_TABS_COUNT) => {
  const tabs = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    tabs.push(d);
  }
  return tabs;
};

const isSameDay = (dateA, dateB) => {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const formatTime = (dt) =>
  new Date(dt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

const vnd = (n) => n?.toLocaleString('vi-VN') + '₫';

const FORMAT_BADGE = {
  IMAX: { bg: 'bg-blue-600',   text: 'text-blue-100', label: 'IMAX' },
  '4DX': { bg: 'bg-purple-600', text: 'text-purple-100', label: '4DX' },
  '3D':  { bg: 'bg-emerald-600', text: 'text-emerald-100', label: '3D' },
  '2D':  { bg: 'bg-gray-600',   text: 'text-gray-100', label: '2D' },
};

const VI_DAY  = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const VI_MON  = ['Th1','Th2','Th3','Th4','Th5','Th6','Th7','Th8','Th9','Th10','Th11','Th12'];

// ══════════════════════════════════════════════════════════════════════════════
// Sub-components
// ══════════════════════════════════════════════════════════════════════════════

/** Format badge pill */
const FormatBadge = ({ format }) => {
  const cfg = FORMAT_BADGE[format] ?? FORMAT_BADGE['2D'];
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text} tracking-wide`}>
      {cfg.label}
    </span>
  );
};

/** Showtime button — compact */
const ShowtimeBtn = ({ show, onBook }) => (
  <button
    onClick={() => onBook(show)}
    title={`${formatTime(show.showDateTime)} · ${show.format} · ${show.language}`}
    className="group flex flex-col items-center gap-1 px-3 py-2
               bg-white/5 border border-white/10 rounded-xl
               hover:border-red-500/60 hover:bg-red-500/10
               transition-all duration-200 min-w-[68px]"
  >
    <span className="text-white font-semibold text-sm group-hover:text-red-400 transition-colors">
      {formatTime(show.showDateTime)}
    </span>
    <FormatBadge format={show.format} />
  </button>
);

/** Theater row inside a movie card */
const TheaterBlock = ({ theater, shows, onBook, viewMode }) => (
  <div
    className={`
      ${viewMode === 'grid'
        ? 'mt-4 pt-4 border-t border-white/[0.06]'
        : 'flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 py-2'
      }
    `}
  >
    {/* Theater header */}
    <div
      className={`flex items-center gap-2
        ${viewMode === 'grid' ? 'mb-3' : 'sm:shrink-0 sm:w-44'}
      `}
    >
      <div className="w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
        <Building2 className="w-3.5 h-3.5 text-red-400" />
      </div>
      <div className="min-w-0">
        <span className="text-gray-200 text-xs font-semibold block truncate leading-tight">
          {theater.name}
        </span>
        <span className="text-gray-600 text-[10px] leading-tight">{theater.location}</span>
      </div>
    </div>

    {/* Showtime buttons */}
    <div className="flex flex-wrap gap-2">
      {shows.map((s) => (
        <ShowtimeBtn key={s._id} show={s} onBook={onBook} />
      ))}
    </div>
  </div>
);

/** ─── GRID card ─── */
const MovieGridCard = ({ movie, theaterGroups, onBook }) => {
  const genreText = movie.genres?.map((g) => g.name).join(', ') || '';
  const totalShows = Object.values(theaterGroups).reduce((a, { shows }) => a + shows.length, 0);
  const theaterCount = Object.keys(theaterGroups).length;

  return (
    <div
      className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden flex flex-col
                 shadow-lg shadow-black/30 hover:shadow-black/50
                 hover:border-white/[0.14] transition-all duration-300"
    >
      {/* ── Movie header ── */}
      <div className="flex gap-4 p-5">
        <div className="shrink-0">
          <img
            src={`/src/assets/images/posters/${movie.poster_path}`}
            alt={movie.title}
            className="w-[76px] h-[110px] object-cover rounded-xl shadow-md"
            loading="lazy"
            onError={(e) => { e.target.src = 'https://placehold.co/76x110/1a1a2e/555?text=?'; }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold text-sm leading-snug line-clamp-2">{movie.title}</h3>
          {genreText && (
            <p className="text-gray-600 text-xs mt-1 truncate">{genreText}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-yellow-400 text-xs font-semibold">★ {movie.vote_average?.toFixed(1)}</span>
            {movie.runtime && <span className="text-gray-600 text-xs">{movie.runtime} phút</span>}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-gray-500 px-2 py-0.5 bg-white/5 rounded-full border border-white/5">
              {theaterCount} rạp
            </span>
            <span className="text-[10px] text-gray-500 px-2 py-0.5 bg-white/5 rounded-full border border-white/5">
              {totalShows} suất
            </span>
          </div>
        </div>
      </div>

      {/* ── Theaters list ── */}
      <div className="px-5 pb-5 border-t border-white/[0.06] pt-1 flex-1 space-y-0 divide-y divide-white/[0.04]">
        {Object.entries(theaterGroups).map(([tid, { theater, shows }]) => (
          <TheaterBlock key={tid} theater={theater} shows={shows} onBook={onBook} viewMode="grid" />
        ))}
      </div>
    </div>
  );
};

/** ─── LIST row ─── */
const MovieListRow = ({ movie, theaterGroups, onBook }) => {
  const totalShows = Object.values(theaterGroups).reduce((a, { shows }) => a + shows.length, 0);
  const [expanded, setExpanded] = useState(true);
  const theaterCount = Object.keys(theaterGroups).length;

  return (
    <div
      className="bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden
                 shadow-md shadow-black/20 hover:shadow-black/40
                 hover:border-white/[0.14] transition-all duration-200"
    >
      {/* ── Collapsible header ── */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left
                   hover:bg-white/[0.02] transition-colors"
      >
        <img
          src={`/src/assets/images/posters/${movie.poster_path}`}
          alt={movie.title}
          className="w-10 h-[56px] object-cover rounded-lg shrink-0"
          loading="lazy"
          onError={(e) => { e.target.src = 'https://placehold.co/40x56/1a1a2e/555?text=?'; }}
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm leading-snug truncate">{movie.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-yellow-400 text-xs font-semibold">★ {movie.vote_average?.toFixed(1)}</span>
            {movie.runtime && <span className="text-gray-600 text-xs">· {movie.runtime} phút</span>}
            <span className="ml-auto flex items-center gap-2">
              <span className="text-[10px] text-gray-500">{theaterCount} rạp · {totalShows} suất</span>
            </span>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* ── Expanded theaters ── */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-white/[0.06] pt-1
                        divide-y divide-white/[0.04]">
          {Object.entries(theaterGroups).map(([tid, { theater, shows }]) => (
            <TheaterBlock key={tid} theater={theater} shows={shows} onBook={onBook} viewMode="list" />
          ))}
        </div>
      )}
    </div>
  );
};

/** ─── Custom Dropdown ─── */
const Dropdown = ({ value, options, onChange, placeholder, icon: Icon, disabled }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setOpen((p) => !p)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 px-4 py-3
                   bg-white/5 border rounded-xl text-left transition-all duration-200
                   ${disabled ? 'opacity-40 cursor-not-allowed border-white/5'
                             : 'border-white/10 hover:border-white/25 cursor-pointer'}
                   ${open ? 'border-red-500/60 bg-red-500/5' : ''}`}
      >
        <span className="flex items-center gap-2 min-w-0">
          {Icon && <Icon className="w-4 h-4 text-gray-400 shrink-0" />}
          <span className={`text-sm truncate ${value ? 'text-white' : 'text-gray-500'}`}>
            {selected?.label || placeholder}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 z-40 bg-[#111827] border border-white/15
                          rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
            {value && (
              <button onClick={() => { onChange(''); setOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-500
                           hover:bg-white/5 hover:text-gray-300 transition-colors border-b border-white/5">
                <X className="w-3.5 h-3.5" /> {placeholder}
              </button>
            )}
            {options.map((opt) => (
              <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors text-left
                            ${opt.value === value ? 'bg-red-500/20 text-red-400' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}>
                {opt.label}
              </button>
            ))}
            {options.length === 0 && (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">Không có dữ liệu</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

/** ─── Mini Calendar Picker (pure React, no dependency) ─── */
const MiniCalendar = ({ selectedDate, onSelect, onClose }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const WEEK_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-[#111827] border border-white/15
                    rounded-2xl shadow-2xl p-4 shadow-black/60">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-white text-sm font-semibold">
          Tháng {viewMonth + 1} / {viewYear}
        </span>
        <button onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEK_LABELS.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-gray-600 py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />;
          const date = new Date(viewYear, viewMonth, day);
          date.setHours(0, 0, 0, 0);
          const isPast = date < today;
          const isActive = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, today);

          return (
            <button
              key={day}
              disabled={isPast}
              onClick={() => { onSelect(date); onClose(); }}
              className={`text-sm h-8 w-8 mx-auto rounded-lg font-medium transition-all duration-150
                          ${isPast ? 'text-gray-700 cursor-not-allowed' : ''}
                          ${isActive ? 'bg-red-600 text-white shadow-lg shadow-red-500/30' : ''}
                          ${isToday && !isActive ? 'border border-red-500/50 text-red-300' : ''}
                          ${!isPast && !isActive ? 'text-gray-300 hover:bg-white/10 hover:text-white' : ''}`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Close */}
      <button onClick={onClose}
        className="mt-3 w-full py-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors border-t border-white/5 pt-2">
        Đóng
      </button>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════════════════════

const Releases = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dateScrollRef = useRef(null);

  /** Scroll date bar by a fixed px amount */
  const scrollDates = useCallback((direction) => {
    const el = dateScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * 240, behavior: 'smooth' });
  }, []);

  // ── State ──────────────────────────────────────────────────────────────────
  const baseDateTabs = useMemo(() => buildDateTabs(), []);

  const [selectedDate,    setSelectedDate]    = useState(baseDateTabs[0]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedTheater,  setSelectedTheater]  = useState('');
  const [viewMode,         setViewMode]          = useState('grid'); // 'grid' | 'list'
  const [showCalendar,     setShowCalendar]      = useState(false);

  const [theaters,        setTheaters]        = useState([]);
  const [allShows,        setAllShows]        = useState([]);
  const [loadingTheaters, setLoadingTheaters] = useState(true);
  const [loadingShows,    setLoadingShows]    = useState(true);
  const [error,           setError]           = useState(null);

  // ── Fetch theaters ─────────────────────────────────────────────────────────
  useEffect(() => {
    getTheaters()
      .then((r) => setTheaters(r.data?.data || r.data || []))
      .catch(() => {})
      .finally(() => setLoadingTheaters(false));
  }, []);

  // ── Fetch shows ────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoadingShows(true);
    setError(null);
    getShows()
      .then((r) => setAllShows(r.data?.data || r.data || []))
      .catch(() => setError('Không thể tải lịch chiếu. Vui lòng thử lại sau.'))
      .finally(() => setLoadingShows(false));
  }, []);

  // ── Derived: locations & cascaded theaters ─────────────────────────────────
  const locations = useMemo(() => {
    const s = new Set(theaters.map((t) => t.location).filter(Boolean));
    return [...s].sort();
  }, [theaters]);

  const theatersInLocation = useMemo(
    () => (!selectedLocation ? theaters : theaters.filter((t) => t.location === selectedLocation)),
    [theaters, selectedLocation],
  );

  useEffect(() => {
    if (selectedTheater && !theatersInLocation.find((t) => t._id === selectedTheater))
      setSelectedTheater('');
  }, [theatersInLocation]);

  // ── Pre-select theater from URL query param (e.g. from Theaters page) ─────
  useEffect(() => {
    const theaterId = searchParams.get('theater_id');
    if (theaterId && theaters.length > 0) {
      const found = theaters.find((t) => t._id === theaterId);
      if (found) {
        if (found.location) setSelectedLocation(found.location);
        setSelectedTheater(theaterId);
      }
    }
  }, [searchParams, theaters]);

  // ── Theater map ────────────────────────────────────────────────────────────
  const theaterMap = useMemo(() => {
    const m = {};
    theaters.forEach((t) => { m[t._id] = t; });
    return m;
  }, [theaters]);

  // ── Filtered & grouped shows ───────────────────────────────────────────────
  const movieGroups = useMemo(() => {
    let shows = allShows.filter((s) => isSameDay(s.showDateTime, selectedDate));

    if (selectedLocation) {
      shows = shows.filter((s) => {
        const tid = s.cinema?._id || s.cinema;
        return theaterMap[tid]?.location === selectedLocation;
      });
    }
    if (selectedTheater) {
      shows = shows.filter((s) => (s.cinema?._id || s.cinema) === selectedTheater);
    }

    const groups = {};
    shows.forEach((show) => {
      const movie = show.movie;
      if (!movie) return;
      const mid = movie._id || movie;
      const tid = show.cinema?._id || show.cinema;
      const theater = theaterMap[tid] || show.cinema;

      if (!groups[mid]) groups[mid] = { movie, theaterGroups: {} };
      if (!groups[mid].theaterGroups[tid])
        groups[mid].theaterGroups[tid] = { theater, shows: [] };
      groups[mid].theaterGroups[tid].shows.push(show);
    });

    Object.values(groups).forEach(({ theaterGroups }) =>
      Object.values(theaterGroups).forEach((tg) =>
        tg.shows.sort((a, b) => new Date(a.showDateTime) - new Date(b.showDateTime)),
      ),
    );

    return Object.values(groups);
  }, [allShows, selectedDate, selectedLocation, selectedTheater, theaterMap]);

  // ── Book handler ───────────────────────────────────────────────────────────
  const handleBook = useCallback((show) => {
    navigate(`/movies/book/${show.movie?._id || show.movie}/${show._id}`);
  }, [navigate]);

  // ── Select date (extended tab or calendar) ─────────────────────────────────
  const handleSelectDate = useCallback((date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    setSelectedDate(d);
  }, []);

  // Determine if selected date is within base tabs or "custom"
  const isCustomDate = !baseDateTabs.some((t) => isSameDay(t, selectedDate));

  // Dropdown options
  const locationOptions = locations.map((l) => ({ value: l, label: l }));
  const theaterOptions  = theatersInLocation.map((t) => ({ value: t._id, label: t.name }));

  const totalShows = movieGroups.reduce(
    (acc, g) => acc + Object.values(g.theaterGroups).reduce((a, { shows }) => a + shows.length, 0), 0,
  );

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-[#0d0d1a] to-black pt-24 pb-16">
      <BlurCircle top="120px" left="-80px" />
      <BlurCircle bottom="100px" right="-60px" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-11 h-11 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl
                            flex items-center justify-center shadow-lg shadow-red-500/30">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r
                           from-red-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              Lịch Chiếu Phim
            </h1>
          </div>
          <p className="text-gray-500 text-base max-w-xl mx-auto">
            Chọn ngày, khu vực và rạp để xem suất chiếu phù hợp với bạn
          </p>
        </div>

        {/* ── Sticky Filter Bar ───────────────────────────────────────────── */}
        <div className="sticky top-[72px] z-20 mb-8">
          <div className="bg-black/75 backdrop-blur-xl border border-white/8 rounded-2xl p-4 shadow-2xl">

            {/* ── Date Navigation ── */}
            <div className="flex items-center gap-2 mb-4">

              {/* ← Scroll left button */}
              <button
                onClick={() => scrollDates(-1)}
                aria-label="Scroll dates left"
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg
                           bg-white/5 border border-white/10 text-gray-400
                           hover:bg-white/10 hover:text-white hover:border-white/20
                           transition-all duration-150"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Scrollable date list */}
              <div
                ref={dateScrollRef}
                className="flex gap-2 overflow-x-auto flex-1 scrollbar-none scroll-smooth"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {baseDateTabs.map((d, i) => {
                  const active = isSameDay(d, selectedDate);
                  const isToday = i === 0;
                  return (
                    <button
                      key={i}
                      onClick={() => handleSelectDate(d)}
                      className={`
                        flex flex-col items-center rounded-xl shrink-0 transition-all duration-200
                        px-2 py-2 min-w-[60px] sm:px-3 sm:min-w-[80px]
                        ${
                          active
                            ? 'bg-gradient-to-b from-red-500 to-red-700 text-white shadow-md shadow-red-500/40'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
                        }
                      `}
                    >
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider leading-none">
                        {isToday ? 'Hôm nay' : VI_DAY[d.getDay()]}
                      </span>
                      <span className="text-lg sm:text-xl font-extrabold leading-tight mt-0.5">
                        {d.getDate()}
                      </span>
                      <span className="text-[9px] sm:text-[10px] opacity-70 leading-none">
                        {VI_MON[d.getMonth()]}
                      </span>
                    </button>
                  );
                })}

                {/* Custom date chip — shown when user picked via calendar */}
                {isCustomDate && (
                  <button
                    className="
                      flex flex-col items-center rounded-xl shrink-0
                      px-2 py-2 min-w-[60px] sm:px-3 sm:min-w-[80px]
                      bg-gradient-to-b from-red-500 to-red-700 text-white shadow-md shadow-red-500/40
                    "
                  >
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider leading-none">
                      {VI_DAY[selectedDate.getDay()]}
                    </span>
                    <span className="text-lg sm:text-xl font-extrabold leading-tight mt-0.5">
                      {selectedDate.getDate()}
                    </span>
                    <span className="text-[9px] sm:text-[10px] opacity-70 leading-none">
                      {VI_MON[selectedDate.getMonth()]}
                    </span>
                  </button>
                )}
              </div>

              {/* → Scroll right button */}
              <button
                onClick={() => scrollDates(1)}
                aria-label="Scroll dates right"
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg
                           bg-white/5 border border-white/10 text-gray-400
                           hover:bg-white/10 hover:text-white hover:border-white/20
                           transition-all duration-150"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Calendar picker toggle */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setShowCalendar((p) => !p)}
                  title="Chọn ngày khác"
                  className={`
                    flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all duration-200
                    ${showCalendar
                      ? 'bg-red-600 border-red-500 text-white'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/25'}
                  `}
                >
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-medium hidden sm:block">Chọn ngày</span>
                </button>

                {showCalendar && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowCalendar(false)} />
                    <div className="relative z-50">
                      <MiniCalendar
                        selectedDate={selectedDate}
                        onSelect={handleSelectDate}
                        onClose={() => setShowCalendar(false)}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── Location + Theater ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1.5 ml-1">
                  <MapPin className="inline w-3 h-3 mr-1 text-red-400" />
                  Khu vực / Thành phố
                </label>
                <Dropdown
                  value={selectedLocation}
                  options={locationOptions}
                  onChange={(v) => { setSelectedLocation(v); setSelectedTheater(''); }}
                  placeholder="Tất cả khu vực"
                  icon={MapPin}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1.5 ml-1">
                  <Building2 className="inline w-3 h-3 mr-1 text-red-400" />
                  Rạp chiếu phim
                </label>
                <Dropdown
                  value={selectedTheater}
                  options={theaterOptions}
                  onChange={setSelectedTheater}
                  placeholder={selectedLocation ? 'Chọn rạp' : 'Chọn khu vực trước'}
                  icon={Building2}
                  disabled={loadingTheaters}
                />
              </div>
            </div>

            {/* Active filter chips */}
            {(selectedLocation || selectedTheater) && (
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/5">
                {selectedLocation && (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-red-500/15 border border-red-500/30 rounded-full text-xs text-red-300">
                    <MapPin className="w-3 h-3" />
                    {selectedLocation}
                    <button onClick={() => { setSelectedLocation(''); setSelectedTheater(''); }} className="ml-0.5 hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {selectedTheater && (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/15 border border-purple-500/30 rounded-full text-xs text-purple-300">
                    <Building2 className="w-3 h-3" />
                    {theaterMap[selectedTheater]?.name}
                    <button onClick={() => setSelectedTheater('')} className="ml-0.5 hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Toolbar: legend + view toggle ───────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
          {/* Format legend */}
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-gray-600 text-xs">Định dạng:</span>
            {Object.entries(FORMAT_BADGE).map(([k, v]) => (
              <span key={k} className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className={`w-2 h-2 rounded-full ${v.bg}`} />
                {v.label}
              </span>
            ))}
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <Clock className="w-3.5 h-3.5 text-gray-600" />
              <span className="hidden sm:inline">Nhấn giờ để đặt vé</span>
            </span>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/8 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              title="Grid View"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
                          ${viewMode === 'grid'
                            ? 'bg-red-600 text-white shadow-md shadow-red-500/30'
                            : 'text-gray-500 hover:text-gray-300'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="List View"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
                          ${viewMode === 'list'
                            ? 'bg-red-600 text-white shadow-md shadow-red-500/30'
                            : 'text-gray-500 hover:text-gray-300'}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── Content ─────────────────────────────────────────────────────── */}
        {loadingShows ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
            <p className="text-gray-500 text-sm">Đang tải lịch chiếu...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
              <Film className="w-8 h-8 text-red-500/50" />
            </div>
            <p className="text-red-400 font-medium">{error}</p>
            <button onClick={() => window.location.reload()}
              className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm transition-colors">
              Thử lại
            </button>
          </div>
        ) : movieGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
            <div className="w-20 h-20 bg-white/3 rounded-full flex items-center justify-center border border-white/5">
              <Calendar className="w-10 h-10 text-gray-700" />
            </div>
            <h3 className="text-white text-xl font-semibold">Không có lịch chiếu</h3>
            <p className="text-gray-500 text-sm max-w-sm">
              Không tìm thấy suất chiếu nào vào ngày {selectedDate.toLocaleDateString('vi-VN')} với bộ lọc đã chọn.
            </p>
            <button
              onClick={() => { setSelectedLocation(''); setSelectedTheater(''); setSelectedDate(baseDateTabs[0]); }}
              className="px-5 py-2 border border-white/10 text-gray-300 hover:text-white hover:border-white/25 rounded-full text-sm transition-all"
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <>
            {/* Result meta */}
            <p className="text-gray-600 text-xs mb-4">
              <span className="text-gray-400 font-medium">{movieGroups.length}</span> phim ·{' '}
              <span className="text-gray-400 font-medium">{totalShows}</span> suất chiếu ·{' '}
              <span className="text-gray-400">{selectedDate.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </p>

            {/* ── GRID VIEW ── */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {movieGroups.map(({ movie, theaterGroups }) => (
                  <MovieGridCard
                    key={movie._id}
                    movie={movie}
                    theaterGroups={theaterGroups}
                    onBook={handleBook}
                  />
                ))}
              </div>
            )}

            {/* ── LIST VIEW ── */}
            {viewMode === 'list' && (
              <div className="space-y-3">
                {movieGroups.map(({ movie, theaterGroups }) => (
                  <MovieListRow
                    key={movie._id}
                    movie={movie}
                    theaterGroups={theaterGroups}
                    onBook={handleBook}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Releases;
