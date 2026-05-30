import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Star, Play, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { getMovies } from '../lib/api';
import timeFormat from '../lib/timeFormat';

const HeroSection = () => {
  const navigate = useNavigate();
  const [movies, setMovies] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const autoPlayRef = useRef(null);

  // ── Fetch phim now_showing từ API ─────────────────────────────────────────
  useEffect(() => {
    const fetchHeroMovies = async () => {
      try {
        const res = await getMovies({ status: 'now_showing' });
        const data = res.data?.data || res.data || [];
        // Lấy tối đa 5 phim now_showing làm hero slides
        setMovies(data.filter((m) => m.status === 'now_showing').slice(0, 5));
      } catch (err) {
        console.error('Lỗi khi tải hero movies:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHeroMovies();
  }, []);

  // ── Auto-play slide ───────────────────────────────────────────────────────
  useEffect(() => {
    if (movies.length <= 1) return;
    autoPlayRef.current = setInterval(() => {
      goToNext();
    }, 6000);
    return () => clearInterval(autoPlayRef.current);
  }, [movies.length, currentIndex]);

  const goToSlide = (index) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 600);
  };

  const goToPrev = () => {
    const prev = (currentIndex - 1 + movies.length) % movies.length;
    goToSlide(prev);
  };

  const goToNext = () => {
    const next = (currentIndex + 1) % movies.length;
    goToSlide(next);
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="relative flex items-center justify-center h-screen bg-gradient-to-b from-gray-900 to-black">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-red-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Đang tải...</p>
        </div>
      </div>
    );
  }

  // ── Không có phim ─────────────────────────────────────────────────────────
  if (movies.length === 0) {
    return (
      <div className="relative flex items-center justify-center h-screen bg-gradient-to-b from-gray-900 to-black">
        <p className="text-gray-400 text-xl">Chưa có phim đang chiếu.</p>
      </div>
    );
  }

  const movie = movies[currentIndex];
  const backdropUrl = `/src/assets/images/backdrops/${movie.backdrop_path}`;
  const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : '—';
  const genreNames = movie.genres?.slice(0, 3).map((g) => g.name).join(' • ') || '';

  return (
    <div className="relative h-screen overflow-hidden">

      {/* ── Background Backdrop ── */}
      {movies.map((m, idx) => (
        <div
          key={m._id}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            idx === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            backgroundImage: `url(/src/assets/images/backdrops/${m.backdrop_path})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      ))}

      {/* ── Gradient Overlays ── */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

      {/* ── Content ── */}
      <div
        className={`relative z-10 flex flex-col items-start justify-center h-full px-6 md:px-16 lg:px-36 pt-20 pb-24 max-w-5xl transition-all duration-500 ${
          isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
        }`}
      >
        {/* Badge trạng thái */}
        <div className="flex items-center gap-3 mb-5">
          <span className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full tracking-wider uppercase shadow-lg shadow-red-600/30">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            Đang Chiếu
          </span>
          <span className="text-orange-400 font-medium text-sm tracking-wider uppercase">
            Phim Chiếu Rạp
          </span>
        </div>

        {/* Tiêu đề */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 leading-tight drop-shadow-2xl">
          {movie.title?.split(' ').slice(0, -2).join(' ')}{' '}
          {movie.title?.split(' ').length > 2 && (
            <span className="text-transparent bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text">
              {movie.title?.split(' ').slice(-2).join(' ')}
            </span>
          )}
        </h1>

        {/* Tagline */}
        {movie.tagline && (
          <p className="text-orange-300 italic text-base md:text-lg mb-3 font-medium">
            "{movie.tagline}"
          </p>
        )}

        {/* Mô tả */}
        <p className="text-white text-base md:text-lg mb-6 max-w-2xl leading-relaxed line-clamp-3">
          {movie.overview || 'Chưa có mô tả cho phim này.'}
        </p>

        {/* Meta badges */}
        <div className="flex flex-wrap items-center gap-3 text-gray-200 text-sm mb-8">
          {/* Thể loại */}
          {genreNames && (
            <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 px-4 py-2 rounded-full backdrop-blur">
              <span>{genreNames}</span>
            </div>
          )}

          {/* Năm phát hành */}
          <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-full backdrop-blur">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span>{releaseYear}</span>
          </div>

          {/* Thời lượng */}
          {movie.runtime && (
            <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-full backdrop-blur">
              <Clock className="w-4 h-4 text-green-400" />
              <span>{timeFormat(movie.runtime)}</span>
            </div>
          )}

          {/* Điểm đánh giá */}
          {movie.vote_average > 0 && (
            <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 px-3 py-2 rounded-full backdrop-blur">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="text-white font-semibold">
                {movie.vote_average?.toFixed(1)}
              </span>
            </div>
          )}

          {/* Phân loại tuổi */}
          {movie.age_rating && (
            <div className="bg-white/10 px-3 py-2 rounded-full backdrop-blur text-white-300">
              {movie.age_rating === 'P'
                ? 'Mọi lứa tuổi'
                : `${movie.age_rating} - Phù hợp từ ${movie.age_rating.replace('T', '')} tuổi`}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap gap-4">
          {/* Xem Trailer */}
          {movie.trailer_url && (
            <button
              onClick={() => navigate(`/movies/${movie._id}`)}
              className="flex items-center gap-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3 rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-red-500/30 hover:scale-105"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Xem Trailer</span>
            </button>
          )}

          {/* Đặt Vé */}
          <button
            onClick={() => navigate(`/movies/${movie._id}`)}
            className="flex items-center gap-3 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white px-6 py-3 rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-orange-500/30 hover:scale-105"
          >
            <Calendar className="w-5 h-5" />
            <span>Đặt Vé Ngay</span>
          </button>

          {/* Chi tiết */}
          <button
            onClick={() => navigate(`/movies/${movie._id}`)}
            className="border-2 border-white/30 hover:border-white/60 text-white px-6 py-3 rounded-full font-medium transition-all duration-300 backdrop-blur hover:bg-white/10"
          >
            Xem Chi Tiết
          </button>
        </div>
      </div>

      {/* ── Slide Controls ── */}
      {movies.length > 1 && (
        <>
          {/* Prev / Next buttons */}
          <button
            onClick={goToPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/40 hover:bg-black/70 text-white rounded-full border border-white/20 transition-all duration-300 hover:scale-110"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/40 hover:bg-black/70 text-white rounded-full border border-white/20 transition-all duration-300 hover:scale-110"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {movies.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goToSlide(idx)}
                className={`transition-all duration-300 rounded-full ${
                  idx === currentIndex
                    ? 'w-8 h-2.5 bg-red-500'
                    : 'w-2.5 h-2.5 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>

          {/* Thumbnail strip (bottom right) */}
          <div className="absolute bottom-6 right-6 z-20 hidden lg:flex gap-2">
            {movies.map((m, idx) => (
              <button
                key={m._id}
                onClick={() => goToSlide(idx)}
                className={`w-16 h-10 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                  idx === currentIndex
                    ? 'border-red-500 scale-110'
                    : 'border-white/20 opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  src={`/src/assets/images/posters/${m.poster_path}`}
                  alt={m.title}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default HeroSection;