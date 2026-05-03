import React, { useRef, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BlurCircle from './BlurCircle';
import MovieCard from './MovieCard';
import { getMovies } from '../lib/api';

const FeatueredSection = () => {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch movies from API
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true);
        const response = await getMovies();
        setMovies(response.data);
      } catch (error) {
        console.error('Error fetching movies:', error);
        setMovies([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const cardWidth = 272; // Matches MovieCard width (w-64 + p-4 + margins)
      const scrollAmount = cardWidth * 4; // Scroll by 4 cards
      const newScroll =
        direction === 'left'
          ? current.scrollLeft - scrollAmount
          : current.scrollLeft + scrollAmount;

      current.scrollTo({
        left: newScroll,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="px-6 md:px-16 lg:px-24 xl:px-44 overflow-hidden">
      <div className="relative flex items-center justify-between pt-20 pb-10">
        <BlurCircle top="0" right="-80px" />
        <p className="text-gray-300 font-medium text-lg">Now Showing</p>
        <button
          onClick={() => navigate('/movies')}
          className="group flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors cursor-pointer"
        >
          View All
          <ArrowRight className="group-hover:translate-x-1 transition-transform w-4 h-4" />
        </button>
      </div>

      <div className="relative mt-8">
        {/* Left Button */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 bg-gray-800/70 text-white p-2 rounded-full hover:bg-gray-800 transition z-10 shadow-md disabled:opacity-50"
          aria-label="Cuộn trái"
          disabled={scrollRef.current?.scrollLeft <= 0}
        >
          <ChevronLeft size={24} />
        </button>

        {/* Movie Cards Container */}
        <div
          ref={scrollRef}
          className="flex overflow-x-hidden space-x-4 snap-x snap-mandatory"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {loading ? (
            <div className="w-full flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
            </div>
          ) : movies.length > 0 ? (
            movies.map((movie) => (
              <div key={movie._id} className="flex-shrink-0">
                <MovieCard movie={movie} />
              </div>
            ))
          ) : (
            <div className="w-full text-center py-20">
              <p className="text-gray-400">Không có phim nào</p>
            </div>
          )}
        </div>

        {/* Right Button */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-gray-800/70 text-white p-2 rounded-full hover:bg-gray-800 transition z-10 shadow-md disabled:opacity-50"
          aria-label="Cuộn phải"
          disabled={scrollRef.current?.scrollLeft >= (movies.length - 4) * 272}
        >
          <ChevronRight size={24} />
        </button>
      </div>

      <div className="flex justify-center mt-12">
        <button
          onClick={() => {
            navigate('/movies');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="px-8 py-2 text-sm bg-red-600 hover:bg-red-700 transition-colors rounded-md font-medium text-white shadow-md hover:shadow-lg"
        >
          Show more
        </button>
      </div>
    </div>
  );
};

export default FeatueredSection;
