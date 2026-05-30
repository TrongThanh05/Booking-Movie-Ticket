import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MovieCard from './MovieCard'; // Adjust path if needed

const MovieList = () => {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const cardWidth = 272; // Approximate width of one card (w-64 + p-4 + margins)
      const scrollAmount = cardWidth * 4; // Scroll by 4 cards at a time
      const newScroll = direction === 'left' 
        ? current.scrollLeft - scrollAmount 
        : current.scrollLeft + scrollAmount;
      
      current.scrollTo({
        left: newScroll,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="py-8 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-white mb-6">Phim Hot</h2>
        <div className="relative">
          {/* Left Button */}
          <button 
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 bg-gray-800/70 text-white p-2 rounded-full hover:bg-gray-800 transition z-10 shadow-md"
            aria-label="Cuộn trái"
          >
            <ChevronLeft size={24} />
          </button>

          {/* Movie Cards Container */}
          <div 
            ref={scrollRef}
            className="flex overflow-x-hidden space-x-4 snap-x snap-mandatory"
            style={{ scrollSnapType: 'x mandatory' }} // For smooth snapping
          >
            {movies.map((movie) => (
              <div key={movie.id} className="flex-shrink-0">
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>

          {/* Right Button */}
          <button 
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 bg-gray-800/70 text-white p-2 rounded-full hover:bg-gray-800 transition z-10 shadow-md"
            aria-label="Cuộn phải"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default MovieList;