
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import PageBreadCrumb from '../../components/common/PageBreadCrumb';
import Button from '../../components/ui/button/Button';
import InputField from '../../components/ui/input/InputField';
import DatePickerField from '../Shows/DatePickerField';
import { api } from '../../lib/api';


/** Trích YouTube video ID từ nhiều dạng URL khác nhau */
const parseYouTubeId = (url = '') => {
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=)([A-Za-z0-9_-]{11})/,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
};

const isValidYouTubeUrl = (url) => url === '' || Boolean(parseYouTubeId(url));

const LABEL_CLASS = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300';
const INPUT_CLASS =
  'w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white border-gray-300 placeholder:text-gray-400 ' +
  'focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 ' +
  'dark:bg-gray-900 dark:border-gray-700 dark:text-white/90 dark:placeholder:text-gray-500 ' +
  'dark:focus:border-brand-400 dark:focus:ring-brand-400/10';
const ERROR_CLASS = 'mt-1 text-xs text-red-500';

/* Danh sách thể loại phim chuẩn */
const GENRE_OPTIONS = [
  { id: 28,    name: 'Hành động' },
  { id: 12,    name: 'Phiêu lưu' },
  { id: 16,    name: 'Hoạt hình' },
  { id: 35,    name: 'Hài hước' },
  { id: 80,    name: 'Tội phạm' },
  { id: 99,    name: 'Tài liệu' },
  { id: 18,    name: 'Chính kịch' },
  { id: 10751, name: 'Gia đình' },
  { id: 14,    name: 'Giả tưởng' },
  { id: 36,    name: 'Lịch sử' },
  { id: 27,    name: 'Kinh dị' },
  { id: 10402, name: 'Âm nhạc' },
  { id: 9648,  name: 'Bí ẩn' },
  { id: 10749, name: 'Tình cảm' },
  { id: 878,   name: 'Khoa học viễn tưởng' },
  { id: 53,    name: 'Giật gân' },
  { id: 10752, name: 'Chiến tranh' },
  { id: 37,    name: 'Cao bồi miền Tây' },
];

/* ─── CastAvatarUploader: upload ảnh diễn viên + circular preview ─────────── */
const CastAvatarUploader = ({ actorName, currentPath, onUploaded }) => {
  const inputRef   = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [blobUrl,   setBlobUrl]   = useState(null);
  const [filename,  setFilename]  = useState(currentPath || '');

  // Reset khi draft bị xóa (currentPath -> '')
  useEffect(() => {
    setFilename(currentPath || '');
    if (!currentPath) setBlobUrl(null);
  }, [currentPath]);

  useEffect(() => {
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [blobUrl]);

  const handleFile = async (file) => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setBlobUrl(objectUrl);          // hiển thị preview ngay
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      fd.append('actorName', actorName.trim() || file.name); // tên file = tên diễn viên
      const token = localStorage.getItem('authToken');
      const res   = await fetch('/api/movies/upload-cast-image', {
        method:  'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body:    fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload thất bại');
      setFilename(data.profile_path);
      onUploaded(data.profile_path);
    } catch (err) {
      alert(`Upload ảnh diễn viên lỗi: ${err.message}`);
      setBlobUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const serverUrl = filename ? `/images/cast/${filename}` : null;
  const imgSrc   = blobUrl || serverUrl;

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Ảnh tròn preview */}
      <div
        onClick={() => inputRef.current?.click()}
        title="Nhấn để chọn ảnh"
        className="relative h-16 w-16 cursor-pointer shrink-0 rounded-full overflow-hidden"
      >
        {imgSrc ? (
          <img src={imgSrc} alt="avatar" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800 rounded-full transition-colors hover:border-brand-400">
            <span className="text-lg text-gray-400">👤</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        )}
        {imgSrc && !uploading && (
          <div className="absolute inset-0 flex items-end justify-center pb-0.5 opacity-0 hover:opacity-100 transition-opacity">
            <span className="rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] text-white">Thay</span>
          </div>
        )}
      </div>
      <span className="max-w-[64px] truncate text-[10px] text-center text-gray-400 dark:text-gray-500">
        {filename ? filename : 'Chọn ảnh'}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
};

/* ─── Komponen Upload ảnh (poster / backdrop) ──────────────────────────────── */
const ImageUploader = ({ label, fieldName, currentFilename, onUploaded, hint }) => {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  // blobUrl: URL.createObjectURL sau khi chọn file — luôn hiển thị được ngay
  const [blobUrl, setBlobUrl] = useState(null);
  const [filename, setFilename] = useState(currentFilename || '');

  // Khi form load lại (edit): cập nhật filename từ props
  useEffect(() => {
    setFilename(currentFilename || '');
    setBlobUrl(null); // xóa blob cũ khi props thay đổi từ bên ngoài
  }, [currentFilename]);

  // Cleanup blob URL khi unmount hoặc khi tạo blob mới
  useEffect(() => {
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [blobUrl]);

  const handleFile = async (file) => {
    if (!file) return;
    // Hiển thị preview ngay lập tức bằng blob URL
    const objectUrl = URL.createObjectURL(file);
    setBlobUrl(objectUrl);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append(fieldName, file);
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/movies/upload-image', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload thất bại');
      const uploaded = fieldName === 'poster' ? data.poster_path : data.backdrop_path;
      setFilename(uploaded);
      onUploaded(uploaded);
      // Giữ blobUrl để preview tiếp tục hiển thị đúng
    } catch (err) {
      alert(`Upload lỗi: ${err.message}`);
      setBlobUrl(null);
    } finally {
      setUploading(false);
    }
  };

  // Ưu tiên blob URL (vừa chọn/upload), sau đó dùng URL server qua proxy /images/...
  const folder = fieldName === 'poster' ? 'posters' : 'backdrops';
  const serverUrl = filename ? `/images/${folder}/${filename}` : null;
  const imgSrc = blobUrl || serverUrl;

  return (
    <div>
      <label className={LABEL_CLASS}>{label}</label>
      {hint && <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
      <div
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer
          transition-colors hover:border-brand-500
          ${fieldName === 'poster' ? 'aspect-[2/3] max-w-[160px]' : 'aspect-[16/9]'}
          bg-gray-50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600`}
        onClick={() => inputRef.current?.click()}
      >
        {imgSrc ? (
          <img src={imgSrc} alt={label} className="h-full w-full rounded-xl object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 p-4 text-center">
            <span className="text-2xl">{fieldName === 'poster' ? '🎬' : '🖼️'}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Nhấn để chọn ảnh</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50">
            <span className="text-sm text-white">Đang upload…</span>
          </div>
        )}
        {imgSrc && !uploading && (
          <div className="absolute bottom-2 right-2 rounded-full bg-brand-500 px-2 py-0.5 text-xs text-white opacity-80">
            Thay đổi
          </div>
        )}
      </div>
      {filename && (
        <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">📁 {filename}</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
};

/* ─── Main component ──────────────────────────────────────────────────────── */
const MovieForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  /* Form state */
  const [form, setForm] = useState({
    title: '', tagline: '', overview: '',
    original_language: 'vi',
    release_date: '', runtime: '',
    vote_average: 7.5, vote_count: 0,
    trailer_url: '',
    poster_path: '', backdrop_path: '',
    age_rating: 'P', status: 'coming_soon',
  });

  /* Genres state — mảng { id, name } */
  const [genres, setGenres] = useState([]);

  /* Casts state — mảng { name, character, profile_path } */
  const [casts, setCasts] = useState([]);
  const [castDraft, setCastDraft] = useState({ name: '', character: '', profile_path: '' });

  /* Load data khi sửa */
  useEffect(() => {
    if (!isEdit) return;
    api.get(`/movies/${id}`).then(({ data: m }) => {
      setForm({
        title: m.title || '', tagline: m.tagline || '', overview: m.overview || '',
        original_language: m.original_language || 'vi',
        release_date: m.release_date?.split('T')[0] || '',
        runtime: m.runtime ?? '', vote_average: m.vote_average ?? 7.5,
        vote_count: m.vote_count ?? 0, trailer_url: m.trailer_url || '',
        poster_path: m.poster_path || '', backdrop_path: m.backdrop_path || '',
        age_rating: m.age_rating || 'P', status: m.status || 'coming_soon',
      });
      setGenres(m.genres || []);
      setCasts(m.casts || []);
    }).catch(console.error);
  }, [id, isEdit]);

  /* Generic field change */
  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  /* Validate */
  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Tên phim là bắt buộc';
    if (form.trailer_url && !isValidYouTubeUrl(form.trailer_url))
      errs.trailer_url = 'URL không hợp lệ — phải là link YouTube (youtube.com hoặc youtu.be)';
    if (form.runtime && (isNaN(form.runtime) || Number(form.runtime) <= 0))
      errs.runtime = 'Thời lượng phải là số dương';
    return errs;
  };

  /* Genres — toggle chọn/bỏ từ GENRE_OPTIONS */
  const toggleGenre = (option) => {
    setGenres(prev => {
      const exists = prev.some(g => g.id === option.id);
      return exists
        ? prev.filter(g => g.id !== option.id)
        : [...prev, { id: option.id, name: option.name }];
    });
  };
  const isGenreSelected = (option) => genres.some(g => g.id === option.id);

  /* Thể loại tùy chỉnh */
  const [customGenreInput, setCustomGenreInput] = useState('');
  const addCustomGenre = () => {
    const name = customGenreInput.trim();
    if (!name) return;
    if (genres.some(g => g.name.toLowerCase() === name.toLowerCase())) {
      setCustomGenreInput('');
      return;
    }
    // Dùng id âm để phân biệt với GENRE_OPTIONS có id dương
    setGenres(prev => [...prev, { id: -Date.now(), name }]);
    setCustomGenreInput('');
  };

  /* Casts */
  const addCast = () => {
    if (!castDraft.name.trim()) return;
    setCasts(prev => [...prev, { ...castDraft }]);
    setCastDraft({ name: '', character: '', profile_path: '' });
  };
  const removeCast = (idx) => setCasts(prev => prev.filter((_, i) => i !== idx));

  /* Submit */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const payload = {
        ...form,
        runtime: form.runtime ? Number(form.runtime) : undefined,
        vote_average: Number(form.vote_average),
        vote_count: Number(form.vote_count),
        genres,
        casts,
      };
      if (isEdit) await api.put(`/movies/${id}`, payload);
      else await api.post('/movies', payload);
      navigate('/admin/movies');
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi lưu phim');
    } finally {
      setLoading(false);
    }
  };

  /* YouTube preview */
  const ytId = parseYouTubeId(form.trailer_url);

  return (
    <>
      <PageMeta title={`${isEdit ? 'Sửa' : 'Thêm'} Phim | CineAdmin`} />
      <PageBreadCrumb
        pageTitle={isEdit ? 'Sửa phim' : 'Thêm phim mới'}
        items={[{ label: 'Phim', path: '/admin/movies' }, { label: isEdit ? 'Sửa' : 'Thêm mới' }]}
      />

      <div className="mx-auto max-w-4xl pb-10">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── THÔNG TIN CƠ BẢN ── */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">📋 Thông tin cơ bản</h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <InputField
                label="Tên phim" id="title" value={form.title}
                onChange={handleChange('title')} required error={errors.title}
                className="md:col-span-2"
              />
              <InputField
                label="Tagline (khẩu hiệu)" id="tagline"
                placeholder="VD: Cuộc chiến vì tương lai..." value={form.tagline}
                onChange={handleChange('tagline')} className="md:col-span-2"
              />
              <div className="md:col-span-2">
                <label className={LABEL_CLASS}>Mô tả phim</label>
                <textarea
                  rows={5} value={form.overview} onChange={handleChange('overview')}
                  placeholder="Nội dung tóm tắt câu chuyện..."
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </section>

          {/* ── CHI TIẾT PHIM ── */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">🎞️ Chi tiết phim</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label htmlFor="original_language" className={LABEL_CLASS}>Ngôn ngữ gốc</label>
                <select id="original_language" value={form.original_language}
                  onChange={handleChange('original_language')} className={INPUT_CLASS}>
                  <option value="vi">Tiếng Việt (vi)</option>
                  <option value="en">Tiếng Anh (en)</option>
                  <option value="ko">Tiếng Hàn (ko)</option>
                  <option value="ja">Tiếng Nhật (ja)</option>
                  <option value="zh">Tiếng Trung (zh)</option>
                  <option value="fr">Tiếng Pháp (fr)</option>
                  <option value="th">Tiếng Thái (th)</option>
                  <option value="hi">Tiếng Hindi (hi)</option>
                  <option value="other">Khác</option>
                </select>
              </div>
              <InputField
                label="Thời lượng (phút)" id="runtime" type="number" min="1"
                value={form.runtime} onChange={handleChange('runtime')} error={errors.runtime}
                placeholder="120"
              />
              <DatePickerField
                label="Ngày phát hành"
                id="release_date"
                value={form.release_date}
                onChange={handleChange('release_date')}
              />
              {/* vote_average & vote_count ẩn — mặc định 7.5 / 0 */}
              <input type="hidden" value={form.vote_average} readOnly />
              <input type="hidden" value={form.vote_count} readOnly />

              {/* Giới hạn độ tuổi */}
              <div>
                <label htmlFor="age_rating" className={LABEL_CLASS}>Giới hạn độ tuổi</label>
                <select id="age_rating" value={form.age_rating}
                  onChange={handleChange('age_rating')} className={INPUT_CLASS}>
                  <option value="P">P — Mọi lứa tuổi</option>
                  <option value="K">K — Dưới 13 tuổi có bảo hộ</option>
                  <option value="T13">T13 — Từ 13 tuổi trở lên</option>
                  <option value="T16">T16 — Từ 16 tuổi trở lên</option>
                  <option value="T18">T18 — Từ 18 tuổi trở lên</option>
                </select>
              </div>

              {/* Trạng thái */}
              <div>
                <label htmlFor="status" className={LABEL_CLASS}>Trạng thái chiếu</label>
                <select id="status" value={form.status}
                  onChange={handleChange('status')} className={INPUT_CLASS}>
                  <option value="coming_soon">Sắp chiếu</option>
                  <option value="now_showing">Đang chiếu</option>
                  <option value="ended">Đã kết thúc</option>
                </select>
              </div>
            </div>
          </section>

          {/* ── THỂ LOẠI ── */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800 dark:text-white">🏷️ Thể loại</h2>
              {genres.length > 0 && (
                <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                  Đã chọn: {genres.length}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {GENRE_OPTIONS.map(option => {
                const selected = isGenreSelected(option);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleGenre(option)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                      selected
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-900/30 dark:text-brand-300'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-brand-300 hover:bg-brand-50/50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-brand-600'
                    }`}
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      selected
                        ? 'border-brand-500 bg-brand-500 dark:border-brand-400 dark:bg-brand-400'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {selected && (
                        <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                    {option.name}
                  </button>
                );
              })}
            </div>
            {genres.length === 0 && (
              <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">Chưa chọn thể loại nào — nhấn vào để chọn nhiều thể loại</p>
            )}

            {/* Ô nhập thể loại tự do */}
            <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-700">
              <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Hoặc nhập thể loại tùy chỉnh 
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customGenreInput}
                  onChange={e => setCustomGenreInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomGenre(); } }}
                  placeholder="VD: Anime, Võ thuật, Thần thoại..."
                  className={INPUT_CLASS + ' flex-1'}
                />
                <button
                  type="button"
                  onClick={addCustomGenre}
                  className="shrink-0 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-brand-400 hover:text-brand-600 transition-colors dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-brand-500 dark:hover:text-brand-400"
                >
                  + Thêm
                </button>
              </div>
            </div>
          </section>

          {/* ── TRAILER ── */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">▶️ Trailer YouTube</h2>
            <div>
              <label htmlFor="trailer_url" className={LABEL_CLASS}>
                URL Trailer
                <span className="ml-2 text-xs font-normal text-gray-400">(youtube.com hoặc youtu.be)</span>
              </label>
              <input
                id="trailer_url" type="url" value={form.trailer_url}
                onChange={handleChange('trailer_url')}
                placeholder="https://www.youtube.com/watch?v=..."
                className={INPUT_CLASS + (errors.trailer_url ? ' border-red-500' : '')}
              />
              {errors.trailer_url && <p className={ERROR_CLASS}>{errors.trailer_url}</p>}
              {form.trailer_url && !errors.trailer_url && (
                isValidYouTubeUrl(form.trailer_url) ? (
                  <p className="mt-1 text-xs text-green-500">✓ URL YouTube hợp lệ</p>
                ) : (
                  <p className={ERROR_CLASS}>✗ Không phải URL YouTube hợp lệ</p>
                )
              )}
            </div>

            {/* YouTube Preview */}
            {ytId && (
              <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="relative aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${ytId}`}
                    title="Trailer preview"
                    className="absolute inset-0 h-full w-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <p className="bg-gray-50 px-3 py-1.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  Preview: {form.trailer_url}
                </p>
              </div>
            )}
          </section>

          {/* ── ẢNH PHIM ── */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-1 text-base font-semibold text-gray-800 dark:text-white">🖼️ Ảnh phim</h2>
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <ImageUploader
                label="Poster (ảnh dọc)"
                fieldName="poster"
                currentFilename={form.poster_path}
                hint="Tỷ lệ 2:3 · JPEG/PNG · Tối đa 10 MB"
                onUploaded={(filename) => setForm(prev => ({ ...prev, poster_path: filename }))}
              />
              <ImageUploader
                label="Backdrop (ảnh ngang)"
                fieldName="backdrop"
                currentFilename={form.backdrop_path}
                hint="Tỷ lệ 16:9 · JPEG/PNG · Tối đa 10 MB"
                onUploaded={(filename) => setForm(prev => ({ ...prev, backdrop_path: filename }))}
              />
            </div>
          </section>

          {/* ── DIỄN VIÊN ── */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">🎭 Diễn viên</h2>
            {/* Hàng nhập thông tin diễn viên + avatar uploader */}
            <div className="flex items-start gap-3">
              {/* Avatar uploader dạng tròn */}
              <CastAvatarUploader
                actorName={castDraft.name}
                currentPath={castDraft.profile_path}
                onUploaded={(path) => setCastDraft(p => ({ ...p, profile_path: path }))}
              />
              {/* Các trường text + nút thêm */}
              <div className="flex-1 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text" value={castDraft.name}
                  onChange={e => setCastDraft(p => ({ ...p, name: e.target.value }))}
                  placeholder="Tên diễn viên *" className={INPUT_CLASS}
                />
                <input
                  type="text" value={castDraft.character}
                  onChange={e => setCastDraft(p => ({ ...p, character: e.target.value }))}
                  placeholder="Vai diễn" className={INPUT_CLASS}
                />
              </div>
              <button type="button" onClick={addCast}
                className="shrink-0 self-start rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors">
                +
              </button>
            </div>

            {casts.length > 0 && (
              <div className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
                {casts.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    {c.profile_path && (
                      <img
                        src={c.profile_path.startsWith('http') ? c.profile_path : `/images/cast/${c.profile_path}`}
                        alt={c.name} className="h-9 w-9 rounded-full object-cover"
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-gray-800 dark:text-white">Tên diễn viên: {c.name}</p>
                      {c.character && <p className="truncate text-xs text-gray-500">Vai diễn:{c.character}</p>}
                    </div>
                    <button type="button" onClick={() => removeCast(i)}
                      className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none">&times;</button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── BUTTONS ── */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => navigate('/admin/movies')}>
              Huỷ
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Đang lưu...' : isEdit ? 'Cập nhật phim' : 'Thêm phim mới'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};

export default MovieForm;
