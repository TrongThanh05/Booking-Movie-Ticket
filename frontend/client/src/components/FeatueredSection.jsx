import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BlurCircle from './BlurCircle';
import MovieCard from './MovieCard';
import { getMovies } from '../lib/api';

// Số card hiển thị theo breakpoint (dùng cho tính toán index)
const CARDS_PER_VIEW = 4;
const CARD_WIDTH_PX = 280; // w-64 (256) + gap 16 + padding ≈ 280

const FeatueredSection = () => {
  const navigate = useNavigate();
  const trackRef = useRef(null);

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0); // index card đầu tiên hiển thị
  const [isAnimating, setIsAnimating] = useState(false);

  // ── Fetch: chỉ lấy now_showing, sort theo release_date tăng dần ─────────
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true);
        const response = await getMovies({ status: 'now_showing' });
        const data = response.data?.data || response.data || [];
        // Lọc chỉ now_showing rồi sort release_date tăng dần (chiếu sớm → trái)
        const sorted = data
          .filter((m) => m.status === 'now_showing')
          .sort(
            (a, b) =>
              new Date(a.release_date).getTime() -
              new Date(b.release_date).getTime(),
          );
        setMovies(sorted);
      } catch (error) {
        console.error('Error fetching movies:', error);
        setMovies([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, []);

  // ── Tổng số "bước" có thể trượt ─────────────────────────────────────────
  const maxIndex = Math.max(0, movies.length - CARDS_PER_VIEW);
  const atStart = currentIndex === 0;
  const atEnd = currentIndex >= maxIndex;

  // ── Hàm trượt với animation guard ────────────────────────────────────────
  const goTo = useCallback(
    (index) => {
      if (isAnimating) return;
      setIsAnimating(true);
      setCurrentIndex(index);
      setTimeout(() => setIsAnimating(false), 400); // khớp với duration-400
    },
    [isAnimating],
  );

  const handlePrev = () => {
    if (atStart) return; // disabled
    goTo(Math.max(0, currentIndex - CARDS_PER_VIEW));
  };

  const handleNext = () => {
    if (atEnd) {
      // Khi đã ở cận phải → quay về đầu
      goTo(0);
    } else {
      goTo(Math.min(maxIndex, currentIndex + CARDS_PER_VIEW));
    }
  };

  // ── translateX tính theo pixel ────────────────────────────────────────────
  const translateX = currentIndex * CARD_WIDTH_PX;

  return (
    <div className="px-6 md:px-16 lg:px-24 xl:px-44 overflow-hidden">
      {/* ── Header ── */}
      <div className="relative flex items-center justify-between pt-20 pb-10">
        <BlurCircle top="0" right="-80px" />
        <p className="text-gray-300 font-medium text-lg">
          Danh sách phim đang chiếu
        </p>
        <button
          onClick={() => navigate('/movies')}
          className="group flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors cursor-pointer"
        >
          Xem tất cả
          <ArrowRight className="group-hover:translate-x-1 transition-transform w-4 h-4" />
        </button>
      </div>

      {/* ── Carousel ── */}
      <div className="relative mt-8">
        {/* ── Nút Trái ── */}
        <button
          onClick={handlePrev}
          disabled={atStart}
          aria-label="Cuộn trái"
          className={`
            absolute left-0 top-1/2 -translate-y-1/2 z-20
            p-2 rounded-full border border-white/20 shadow-lg
            transition-all duration-300
            ${
              atStart
                ? 'bg-gray-800/30 text-gray-600 cursor-not-allowed opacity-40'
                : 'bg-gray-800/80 text-white hover:bg-red-600 hover:border-red-500 hover:scale-110 cursor-pointer'
            }
          `}
        >
          <ChevronLeft size={24} />
        </button>

        {/* ── Track wrapper (mask overflow) ── */}
        <div className="overflow-hidden mx-10">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
            </div>
          ) : movies.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400">Không có phim đang chiếu</p>
            </div>
          ) : (
            /* ── Sliding track ── */
            <div
              ref={trackRef}
              className="flex gap-4 transition-transform duration-400 ease-in-out"
              style={{
                transform: `translateX(-${translateX}px)`,
                transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              }}
            >
              {movies.map((movie) => (
                <div key={movie._id} className="flex-shrink-0">
                  <MovieCard movie={movie} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Nút Phải ── */}
        <button
          onClick={handleNext}
          aria-label={atEnd ? 'Quay về đầu' : 'Cuộn phải'}
          className={`
            absolute right-0 top-1/2 -translate-y-1/2 z-20
            p-2 rounded-full border shadow-lg
            transition-all duration-300 cursor-pointer
            ${
              atEnd
                ? 'bg-red-600/80 border-red-500 text-white hover:bg-red-700 hover:scale-110 animate-pulse'
                : 'bg-gray-800/80 border-white/20 text-white hover:bg-red-600 hover:border-red-500 hover:scale-110'
            }
          `}
          title={atEnd ? 'Quay về đầu danh sách' : 'Xem thêm'}
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* ── Dot indicators ── */}
      {!loading && movies.length > CARDS_PER_VIEW && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: Math.ceil(movies.length / CARDS_PER_VIEW) }).map(
            (_, pageIdx) => {
              const pageStart = pageIdx * CARDS_PER_VIEW;
              const isActive =
                currentIndex >= pageStart &&
                currentIndex < pageStart + CARDS_PER_VIEW;
              return (
                <button
                  key={pageIdx}
                  onClick={() => goTo(Math.min(pageStart, maxIndex))}
                  className={`transition-all duration-300 rounded-full ${
                    isActive
                      ? 'w-6 h-2 bg-red-500'
                      : 'w-2 h-2 bg-gray-600 hover:bg-gray-400'
                  }`}
                  aria-label={`Trang ${pageIdx + 1}`}
                />
              );
            },
          )}
        </div>
      )}

      {/* ── Xem thêm button ── */}
      <div className="flex justify-center my-8">
        <button
          onClick={() => {
            navigate('/movies');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="px-8 py-2 text-sm bg-red-600 hover:bg-red-700 transition-colors rounded-md font-medium text-white shadow-md hover:shadow-lg cursor-pointer"
        >
          Xem thêm
        </button>
      </div>
    </div>
  );
};

export default FeatueredSection;
