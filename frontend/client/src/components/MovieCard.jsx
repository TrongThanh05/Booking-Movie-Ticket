import { Star, Trash2 } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import timeFormat from '../lib/timeFormat';
import NewReleaseTag from './NewReleaseTag';

const MovieCard = ({ movie, viewMode = 'grid', onRemove }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/movies/${movie._id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Hiển thị tag "Phim Mới" nếu phim phát hành trong vòng 30 ngày gần đây
  const isNewRelease = (() => {
    if (!movie.release_date) return false;
    const diffMs = Date.now() - new Date(movie.release_date).getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 30;
  })();

  const isList = viewMode === 'list';

  /* ─── LIST MODE ─────────────────────────────────────────────────────────── */
  if (isList) {
    return (
      <div className="relative flex flex-row w-full min-h-[12rem] bg-gray-800 rounded-xl overflow-hidden group border border-gray-700/50 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
        <NewReleaseTag show={isNewRelease} />

        {/* Backdrop landscape */}
        <div className="relative w-64 flex-shrink-0 overflow-hidden">
          <img
            onClick={handleCardClick}
            src={`/src/assets/images/backdrops/${movie.backdrop_path}`}
            alt={`${movie.title} backdrop`}
            loading="lazy"
            className="w-full h-full object-cover aspect-video cursor-pointer transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        {/* Nội dung */}
        <div className="flex flex-col flex-1 p-4">
          <div className="space-y-1.5 flex-1">
            <h3
              onClick={handleCardClick}
              className="text-xl font-semibold text-white line-clamp-1 hover:text-red-400 transition-colors cursor-pointer"
              title={movie.title}
            >
              {movie.title}
            </h3>
            <p className="text-sm text-gray-400">
              {new Date(movie.release_date).getFullYear()} •{' '}
              {movie.genres?.slice(0, 2).map(g => g.name).join(' • ')} •{' '}
              {timeFormat(movie.runtime)}
            </p>
          </div>
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={handleCardClick}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 transition-all rounded-full font-medium text-sm text-white shadow-md hover:shadow-lg cursor-pointer transform hover:scale-105"
              aria-label={`Mua vé cho ${movie.title}`}
            >
              Mua Vé
            </button>
            <div className="flex items-center gap-1.5 text-sm text-gray-300">
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              <span className="font-medium" aria-label="Đánh giá">
                {movie.vote_average?.toFixed(1) || 'N/A'}
              </span>
            </div>
            {onRemove && (
              <button
                onClick={() => onRemove(movie._id)}
                className="ml-2 text-red-500 hover:text-red-700 transition-colors"
                aria-label={`Xóa ${movie.title} khỏi danh sách yêu thích`}
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ─── GRID MODE (bản gốc) ────────────────────────────────────────────── */
  return (
    <div className="relative flex flex-col h-full p-4 bg-gray-800 rounded-xl hover:-translate-y-2 transition-all duration-300 w-64 shadow-xl hover:shadow-2xl overflow-hidden group border border-gray-700/50">
      <NewReleaseTag show={isNewRelease} />

      <img
        onClick={handleCardClick}
        src={`/src/assets/images/posters/${movie.poster_path}`}
        alt={`${movie.title} poster`}
        loading="lazy"
        className="rounded-lg h-56 w-full object-cover cursor-pointer transition-transform group-hover:scale-105"
      />

      {/* flex-1 giúp vùng này chiếm hết không gian còn lại, đẩy footer xuống đáy */}
      <div className="mt-3 space-y-2 flex-1">
        <h3
          onClick={handleCardClick}
          className="font-semibold text-white text-lg line-clamp-2 hover:text-red-400 transition-colors cursor-pointer"
          title={movie.title}
        >
          {movie.title}
        </h3>
        <p className="text-sm text-gray-400">
          {new Date(movie.release_date).getFullYear()} •{' '}
          {movie.genres?.slice(0, 2).map(genre => genre.name).join(' • ')} •{' '}
          {timeFormat(movie.runtime)}
        </p>
      </div>

      {/* Footer luôn sát đáy nhờ flex-1 ở content phía trên */}
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={handleCardClick}
          className="px-4 py-1.5 bg-red-600 hover:bg-red-700 transition-all rounded-full font-medium text-sm text-white shadow-md hover:shadow-lg cursor-pointer transform hover:scale-105"
          aria-label={`Mua vé cho ${movie.title}`}
        >
          Mua Vé
        </button>
        <div className="flex items-center gap-1.5 text-sm text-gray-300">
          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
          <span className="font-medium" aria-label="Đánh giá">
            {movie.vote_average?.toFixed(1) || 'N/A'}
          </span>
        </div>
        {onRemove && (
          <button
            onClick={() => onRemove(movie._id)}
            className="ml-2 text-red-500 hover:text-red-700 transition-colors"
            aria-label={`Xóa ${movie.title} khỏi danh sách yêu thích`}
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

export default MovieCard;