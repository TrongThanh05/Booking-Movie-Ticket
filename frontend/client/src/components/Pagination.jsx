/**
 * Pagination.jsx — Reusable Pagination component for Client (dark cinema theme)
 *
 * Props:
 *   currentPage   {number}
 *   totalPages    {number}
 *   totalItems    {number}
 *   limit         {number}
 *   onPageChange  {function} (newPage) => void
 */
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  limit = 12,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const start = Math.max(2, currentPage - 1);
      const end   = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);

      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();
  const startItem = (currentPage - 1) * limit + 1;
  const endItem   = Math.min(currentPage * limit, totalItems);

  return (
    <div className="flex flex-col items-center gap-4 mt-10">
      {/* Page buttons */}
      <div className="flex items-center gap-2">
        {/* Previous */}
        <button
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5
            text-gray-300 text-sm font-medium backdrop-blur-sm
            hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400
            disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/5 disabled:hover:border-white/10 disabled:hover:text-gray-300
            transition-all duration-300"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Trước</span>
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {pages.map((p, i) =>
            p === '...' ? (
              <span key={`dots-${i}`} className="px-2 text-gray-500 select-none">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`min-w-[40px] h-10 flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-300 ${
                  p === currentPage
                    ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/30 scale-105'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white hover:border-white/20'
                }`}
              >
                {p}
              </button>
            ),
          )}
        </div>

        {/* Next */}
        <button
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5
            text-gray-300 text-sm font-medium backdrop-blur-sm
            hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400
            disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/5 disabled:hover:border-white/10 disabled:hover:text-gray-300
            transition-all duration-300"
        >
          <span className="hidden sm:inline">Sau</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Info text */}
      <p className="text-gray-500 text-sm">
        Hiển thị{' '}
        <span className="text-gray-300 font-medium">{startItem} - {endItem}</span>
        {' '}trong{' '}
        <span className="text-gray-300 font-medium">{totalItems}</span> kết quả
      </p>
    </div>
  );
};

export default Pagination;
