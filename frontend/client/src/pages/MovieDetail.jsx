import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import YouTube from 'react-youtube';
import { Clock as ClockIcon } from 'lucide-react';
import {
  Star,
  Clock,
  MapPin,
  Ticket,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Loader2,
  Heart,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import BlurCircle from '../components/BlurCircle';
import MovieCard from '../components/MovieCard';
import { useYouTubePlayer } from '../components/data/useYouTubePlayer';
import { getMovieById, getMovies, getShowsByMovie, checkFavorite, addFavorite, removeFavoriteByMovie } from '../lib/api';
import useDarkMode from '../hooks/useDarkMode';

const MovieDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isDark] = useDarkMode();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState(null); // ID của bản ghi Favorite trong DB
  const [relatedMovies, setRelatedMovies] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [shows, setShows] = useState([]);
  const [showsLoading, setShowsLoading] = useState(false);
  const [showTrailerControls, setShowTrailerControls] = useState(true);
  const [trailerLoading, setTrailerLoading] = useState(false);
  const [showComingSoonToast, setShowComingSoonToast] = useState(false);
  const trailerControlsTimeout = useRef(null);
  const comingSoonToastTimeout = useRef(null);

  // Kiểm tra phim sắp chiếu
  const isComingSoon = movie?.status === 'coming_soon';

  // Handler nút Đặt Vé khi phim coming_soon
  const handleComingSoonClick = () => {
    setShowComingSoonToast(true);
    if (comingSoonToastTimeout.current) clearTimeout(comingSoonToastTimeout.current);
    comingSoonToastTimeout.current = setTimeout(() => setShowComingSoonToast(false), 3500);
  };
  const trailerSectionRef = useRef(null);

  const {
    isPlaying: trailerPlaying,
    isMuted: trailerMuted,
    isReady: trailerReady,
    onReady: onTrailerReady,
    onStateChange: onTrailerStateChange,
    onError: onTrailerError,
    togglePlayPause: toggleTrailerPlayPause,
    toggleMute: toggleTrailerMute,
  } = useYouTubePlayer();

  const trailerPlayerOptions = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 1,
      iv_load_policy: 3,
      modestbranding: 1,
      playsinline: 1,
      rel: 0,
      origin: window.location.origin,
    },
  };

  // Auto-hide trailer controls
  useEffect(() => {
    if (showTrailerControls && trailerPlaying) {
      trailerControlsTimeout.current = setTimeout(() => {
        setShowTrailerControls(false);
      }, 3000);
    }
    return () => {
      if (trailerControlsTimeout.current) clearTimeout(trailerControlsTimeout.current);
    };
  }, [showTrailerControls, trailerPlaying]);

  const handleTrailerHover = () => {
    setShowTrailerControls(true);
    if (trailerControlsTimeout.current) clearTimeout(trailerControlsTimeout.current);
  };

  // Fetch movie data based on ID
  useEffect(() => {
    const fetchMovieData = async () => {
      try {
        setLoading(true);
        // Fetch current movie
        const movieResponse = await getMovieById(id);
        setMovie(movieResponse.data);

        // Kiểm tra trạng thái yêu thích từ DB
        const user = JSON.parse(localStorage.getItem('user'));
        if (user?._id) {
          try {
            const favRes = await checkFavorite(user._id, id);
            setIsFavorite(favRes.data.isFavorite);
            setFavoriteId(favRes.data.favoriteId);
          } catch (_) {
            // Không đăng nhập hoặc lỗi → giữ mặc định false
          }
        }

        // Fetch all movies for related content
        const allMoviesResponse = await getMovies();
        const allMoviesData = allMoviesResponse.data?.data || allMoviesResponse.data || [];
        const related = allMoviesData
          .filter((m) => m._id !== id)
          .slice(0, 4);
        setRelatedMovies(related);

        // Generate available dates (7 days from today)
        const dates = [];
        const today = new Date();
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          dates.push(date);
        }
        setAvailableDates(dates);
        setSelectedDate(dates[0]); // Default to today

        setError(null);
      } catch (err) {
        console.error('Error fetching movie:', err);
        setError('Không thể tải thông tin phim. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchMovieData();
  }, [id]);

  // Toggle favorite — gọi API backend
  const toggleFavorite = async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user?._id) {
      alert('Vui lòng đăng nhập để thêm phim vào danh sách yêu thích.');
      return;
    }

    try {
      if (isFavorite) {
        // Bỏ yêu thích
        await removeFavoriteByMovie(user._id, movie._id);
        setIsFavorite(false);
        setFavoriteId(null);
      } else {
        // Thêm yêu thích
        const res = await addFavorite({ userId: user._id, movieId: movie._id });
        setIsFavorite(true);
        setFavoriteId(res.data._id);
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật yêu thích:', err);
    }
  };

  // Format date to Vietnamese
  const formatDateVietnamese = (date) => {
    const days = [
      'Chủ Nhật',
      'Thứ Hai',
      'Thứ Ba',
      'Thứ Tư',
      'Thứ Năm',
      'Thứ Sáu',
      'Thứ Bảy',
    ];
    const months = [
      'Tháng 1',
      'Tháng 2',
      'Tháng 3',
      'Tháng 4',
      'Tháng 5',
      'Tháng 6',
      'Tháng 7',
      'Tháng 8',
      'Tháng 9',
      'Tháng 10',
      'Tháng 11',
      'Tháng 12',
    ];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];

    return {
      dayName: dayName,
      day: day,
      month: month,
      shortDay:
        dayName === 'Chủ Nhật'
          ? 'CN'
          : dayName.split(' ')[1]?.charAt(0) +
            (dayName.split(' ')[1]?.charAt(1) || ''),
      isToday: date.toDateString() === new Date().toDateString(),
      isTomorrow:
        date.toDateString() === new Date(Date.now() + 86400000).toDateString(),
    };
  };

  // Fetch real shows by movieId + selectedDate
  useEffect(() => {
    if (!movie?._id || !selectedDate) return;
    const fetchShows = async () => {
      try {
        setShowsLoading(true);
        // Format to local YYYY-MM-DD (avoid UTC offset shift)
        const y = selectedDate.getFullYear();
        const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const d = String(selectedDate.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        const response = await getShowsByMovie(movie._id, dateStr);
        setShows(response.data);
      } catch (err) {
        console.error('Error fetching shows:', err);
        setShows([]);
      } finally {
        setShowsLoading(false);
      }
    };
    fetchShows();
  }, [movie?._id, selectedDate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 pt-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-red-500 animate-spin mx-auto mb-4" />
              <h2 className="text-white text-xl font-semibold mb-2">
                Đang tải chi tiết phim...
              </h2>
              <p className="text-gray-400">Vui lòng chờ trong giây lát</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 pt-24 px-4">
        <div className="max-w-7xl mx-auto text-center py-20">
          <h2 className="text-white text-2xl font-bold mb-4">
            Không tìm thấy phim
          </h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Chúng tôi không thể tìm thấy thông tin về phim này. Hãy kiểm tra lại
            hoặc quay lại trang chính.
          </p>
          <button
            onClick={() => navigate('/movies')}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors duration-300"
          >
            Quay lại danh sách phim
          </button>
        </div>
      </div>
    );
  }

  // shows are now fetched via useEffect above

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 pt-24 pb-12">
      <BlurCircle top="100px" left="0" />
      <BlurCircle bottom="100px" right="0" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-12">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <img
              src={`/src/assets/images/posters/${movie.poster_path}`}
              alt={`Poster phim ${movie.title}`}
              className="w-full lg:w-1/3 rounded-xl shadow-2xl object-cover h-96"
              loading="lazy"
            />
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 bg-clip-text text-transparent mb-4">
                {movie.title}
              </h1>
              <div className="flex flex-wrap gap-4 text-gray-300 mb-6">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <span>Năm {new Date(movie.release_date).getFullYear()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span>
                    {movie.vote_average?.toFixed(1) || 'Chưa có'} điểm
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-green-500" />
                  <span>{movie.genres.map((g) => g.name).join(', ')}</span>
                </div>
              </div>
              <p className="text-gray-400 text-lg leading-relaxed mb-6">
                {movie.overview || 'Chưa có mô tả chi tiết cho phim này.'}
              </p>
              <div className="flex flex-wrap gap-4">
                {/* ── Nút Đặt Vé: disabled nếu phim coming_soon ── */}
                {isComingSoon ? (
                  <button
                    onClick={handleComingSoonClick}
                    className="px-6 py-3 bg-gray-600 text-gray-300 rounded-full shadow-md flex items-center gap-2 cursor-not-allowed opacity-70 select-none"
                    aria-disabled="true"
                    title="Phim chưa được chiếu"
                  >
                    <ClockIcon className="w-5 h-5" /> Sắp Chiếu
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const firstShow = shows.length > 0 ? shows[0] : null;
                      if (firstShow) {
                        navigate(`/movies/book/${movie._id}/${firstShow._id}`);
                      } else {
                        alert(
                          'Chưa có suất chiếu khả dụng cho ngày này. Vui lòng chọn ngày khác.',
                        );
                      }
                    }}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2"
                  >
                    <Ticket className="w-5 h-5" /> Đặt Vé Ngay
                  </button>
                )}
                <button
                  onClick={() => trailerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                  className={`px-6 py-3 rounded-full shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2 ${
                    isDark
                      ? 'bg-white/10 hover:bg-white/20 text-white'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                  }`}
                >
                  <Play className="w-5 h-5" /> Xem Trailer
                </button>
                <button
                  onClick={toggleFavorite}
                  className={`px-6 py-3 rounded-full shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2 ${
                    isFavorite
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      : isDark
                        ? 'bg-white/10 hover:bg-white/20 text-white'
                        : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                  }`}
                >
                  <Heart
                    className="w-5 h-5"
                    fill={isFavorite ? 'yellow' : 'none'}
                    stroke={isFavorite ? 'white' : isDark ? 'white' : '#1e293b'}
                  />
                  {isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Toast thông báo sắp chiếu ── */}
        <div
          className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${
            showComingSoonToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-3 bg-indigo-600 text-white px-6 py-4 rounded-2xl shadow-2xl border border-indigo-400/30 backdrop-blur-sm">
            <ClockIcon className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Phim chưa được chiếu</p>
              <p className="text-xs text-indigo-200 mt-0.5">Vui lòng quay lại sau khi phim ra mắt chính thức.</p>
            </div>
          </div>
        </div>

        {/* Date Selection and Showtimes Section */}
        <div className="bg-black/20 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-6 h-6 text-red-500" />
            <h2 className={`text-2xl font-bold mb-6 ${ isDark ? 'text-white' : 'text-slate-900' }`}>
              Chọn Ngày &amp; Suất Chiếu
            </h2>
          </div>

          {/* Date Selector */}
          <div className="mb-8">
            <h3 className={`text-lg font-semibold mb-4 ${ isDark ? 'text-white' : 'text-slate-800' }`}>
              Chọn ngày:
            </h3>
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-400 hover:text-white transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1">
                {availableDates.map((date, index) => {
                  const dateInfo = formatDateVietnamese(date);
                  const isSelected =
                    selectedDate &&
                    date.toDateString() === selectedDate.toDateString();

                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedDate(date)}
                      className={`min-w-[100px] p-3 rounded-xl border transition-all duration-300 ${
                        isSelected
                          ? 'bg-red-500 border-red-500 text-white'
                          : 'bg-black/30 border-white/20 text-gray-300 hover:bg-white/10 hover:border-white/30'
                      }`}
                    >
                      <div className="text-sm font-medium">
                        {dateInfo.isToday
                          ? 'Hôm nay'
                          : dateInfo.isTomorrow
                            ? 'Ngày mai'
                            : dateInfo.shortDay}
                      </div>
                      <div className="text-lg font-bold">{dateInfo.day}</div>
                      <div className="text-xs opacity-80">{dateInfo.month}</div>
                    </button>
                  );
                })}
              </div>

              <button className="p-2 text-gray-400 hover:text-white transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Showtimes — real data grouped by cinema hoặc Coming Soon banner */}
          {isComingSoon ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              {/* Animated icon */}
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full bg-indigo-500/10 border-2 border-indigo-500/30 flex items-center justify-center animate-pulse">
                  <ClockIcon className="w-12 h-12 text-indigo-400" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-gray-900 animate-bounce" />
              </div>
              {/* Title */}
              <h3 className="text-2xl font-bold text-white mb-2">Phim Sắp Chiếu</h3>
              <p className="text-gray-400 max-w-sm">
                <strong className="text-indigo-300">{movie.title}</strong> hiện chưa có lịch chiếu.
                Ngày ra mắt dự kiến:{' '}
                <span className="text-white font-medium">
                  {new Date(movie.release_date).toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </p>
              {/* Reminder note */}
              <div className="mt-6 px-5 py-3 bg-indigo-500/10 border border-indigo-500/25 rounded-xl text-sm text-indigo-300">
                🔔 Hãy theo dõi để nhận thông báo khi vé được mở bán!
              </div>
            </div>
          ) : selectedDate && (
            <div>
              <h3 className={`text-lg font-semibold mb-4 ${ isDark ? 'text-white' : 'text-slate-800' }`}>
                Suất chiếu ngày {formatDateVietnamese(selectedDate).day}{' '}
                {formatDateVietnamese(selectedDate).month}:
              </h3>

              {showsLoading ? (
                <div className="flex items-center gap-3 py-8 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang tải suất chiếu...</span>
                </div>
              ) : shows.length === 0 ? (
                <div className="py-10 text-center">
                  <Ticket className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                  <p className="text-gray-400 font-medium">Không có suất chiếu cho ngày này.</p>
                  <p className="text-gray-500 text-sm mt-1">Vui lòng chọn ngày khác.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(
                    shows.reduce((groups, show) => {
                      const key = show.cinema?._id?.toString() || 'unknown';
                      if (!groups[key]) groups[key] = { cinema: show.cinema, items: [] };
                      groups[key].items.push(show);
                      return groups;
                    }, {})
                  ).map(([key, { cinema, items }]) => (
                    <div key={key} className="bg-black/20 rounded-xl border border-white/10 p-4">
                      {/* Cinema header */}
                      <div className="flex items-start gap-2 mb-3">
                        <MapPin className="w-4 h-4 text-red-400 mt-1 flex-shrink-0" />
                        <div>
                          <p className={`font-semibold text-sm ${ isDark ? 'text-white' : 'text-slate-900' }`}>{cinema?.name}</p>
                          <p className="text-gray-400 text-xs">{cinema?.location}{cinema?.address ? ` · ${cinema.address}` : ''}</p>
                        </div>
                      </div>
                      {/* Show buttons */}
                      <div className="flex flex-wrap gap-2">
                        {items.map((show) => (
                          <button
                            key={show._id}
                            onClick={() => navigate(`/movies/book/${movie._id}/${show._id}`)}
                            className="flex flex-col items-center px-3 py-2 rounded-lg border bg-green-500/10 border-green-500/40 text-green-300 hover:bg-green-500/25 hover:border-green-400 transition-all duration-200 min-w-[72px]"
                          >
                            <span className="font-bold text-sm">
                              {new Date(show.showDateTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-[10px] mt-0.5 px-1.5 py-0.5 bg-black/30 rounded-full font-medium">
                              {show.format}
                            </span>
                            <span className="text-[10px] mt-0.5 text-gray-400">
                              {Math.round(show.base_price / 1000)}K
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <p className="text-blue-300 text-sm">
                  💡 <strong>Lưu ý:</strong> Vui lòng có mặt tại rạp ít nhất 15
                  phút trước giờ chiếu. Suất chiếu có thể thay đổi mà không báo trước.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Additional Details */}
        <div className="bg-black/20 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-12">
          <h2 className={`text-2xl font-bold mb-4 ${ isDark ? 'text-white' : 'text-slate-900' }`}>
            Thông Tin Chi Tiết
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-300">
            <div>
              <p className="mb-2">
                <strong>Thời lượng:</strong> {movie.runtime} phút
              </p>
              <p className="mb-2">
                <strong>Ngày khởi chiếu:</strong>{' '}
                {new Date(movie.release_date).toLocaleDateString('vi-VN')}
              </p>
              <p className="mb-2">
                <strong>Slogan:</strong> {movie.tagline || 'Chưa có slogan'}
              </p>
            </div>
            <div>
              <p className="mb-2">
                <strong>Ngôn ngữ gốc:</strong>{' '}
                {movie.original_language.toUpperCase()}
              </p>
              <p className="mb-2">
                <strong>Lượt đánh giá:</strong>{' '}
                {movie.vote_count?.toLocaleString('vi-VN')} lượt
              </p>
              <p className="mb-2">
                <strong>Độ tuổi:</strong> T13 - Phù hợp từ 13 tuổi
              </p>
            </div>
          </div>
        </div>

        {/* Cast Section */}
        <div className="mb-12">
          <h2 className={`text-2xl font-bold mb-6 ${ isDark ? 'text-white' : 'text-slate-900' }`}>Dàn Diễn Viên</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {movie.casts.slice(0, 8).map((cast, index) => (
              <div key={index} className="text-center group">
                <img
                  src={cast.profile_path}
                  alt={cast.name}
                  className="w-24 h-24 object-cover rounded-full mx-auto mb-2 shadow-md group-hover:scale-110 transition-transform duration-300"
                  loading="lazy"
                />
                <p className="text-gray-300 text-sm font-medium">{cast.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* You May Also Like Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-2xl font-bold ${ isDark ? 'text-white' : 'text-slate-900' }`}>
              Phim Bạn Có Thể Thích
            </h2>
            <button
              onClick={() => navigate('/movies')}
              className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 text-sm"
            >
              Xem tất cả
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {relatedMovies.map((relatedMovie) => (
              <MovieCard key={relatedMovie._id} movie={relatedMovie} />
            ))}
          </div>
        </div>
        {/* Trailer Section */}
        {movie.trailer_url && (
          <div className="mb-12" ref={trailerSectionRef}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center">
                <Play className="w-5 h-5 text-white" />
              </div>
              <h2 className={`text-2xl font-bold ${ isDark ? 'text-white' : 'text-slate-900' }`}>Trailer Chính Thức</h2>
            </div>
            <div className="relative group">
              <div
                className="relative bg-black rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 transition-all duration-500 hover:ring-red-500/30 hover:shadow-red-500/20"
                onMouseEnter={handleTrailerHover}
                onMouseLeave={() => setShowTrailerControls(false)}
              >
                <div className="aspect-video relative">
                  {/* YouTube Player */}
                  <YouTube
                    key={movie.trailer_url}
                    videoId={movie.trailer_url}
                    opts={trailerPlayerOptions}
                    onReady={onTrailerReady}
                    onStateChange={onTrailerStateChange}
                    onError={onTrailerError}
                    className="w-full h-full"
                  />

                  {/* Loading Overlay */}
                  {!trailerReady && (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-900/95 to-black/95 flex items-center justify-center backdrop-blur-sm">
                      <div className="text-center">
                        <div className="w-16 h-16 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-white text-lg font-medium">Đang tải trailer...</p>
                      </div>
                    </div>
                  )}

                  {/* Custom Controls Overlay */}
                  {trailerReady && (
                    <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 transition-all duration-300 ${
                      showTrailerControls ? 'opacity-100' : 'opacity-0'
                    }`}>
                      {/* Top Bar */}
                      <div className="absolute top-0 left-0 right-0 p-6">
                        <div className="flex items-center justify-between text-white">
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold">{movie.title}</h3>
                            <span className="px-3 py-1 bg-red-500 rounded-full text-sm font-medium">HD</span>
                          </div>
                        </div>
                      </div>

                      {/* Center Play Button */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <button
                          onClick={toggleTrailerPlayPause}
                          className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white p-8 rounded-full transition-all duration-300 hover:scale-110 border border-white/20"
                        >
                          {trailerPlaying ? (
                            <Pause className="w-12 h-12" />
                          ) : (
                            <Play className="w-12 h-12 ml-1" />
                          )}
                        </button>
                      </div>

                      {/* Bottom Controls */}
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <div className="flex items-center justify-end text-white">
                          <button
                            onClick={toggleTrailerMute}
                            className="p-3 hover:bg-white/10 rounded-full transition-colors"
                          >
                            {trailerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MovieDetail;
