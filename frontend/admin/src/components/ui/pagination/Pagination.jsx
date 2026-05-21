/**
 * Pagination.jsx — Reusable Pagination component for Admin Dashboard
 *
 * Props:
 *   currentPage   {number}   Current page (1-indexed)
 *   totalPages    {number}   Total pages
 *   totalItems    {number}   Total items count
 *   limit         {number}   Items per page
 *   onPageChange  {function} Callback (newPage) => void
 *   onLimitChange {function} Optional: (newLimit) => void
 */

const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  limit = 10,
  onPageChange,
  onLimitChange,
}) => {
  if (totalPages <= 1 && totalItems <= limit) return null;

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
    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Info */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Hiển thị <span className="font-medium text-gray-700 dark:text-gray-200">{startItem}</span>
        {' '}-{' '}
        <span className="font-medium text-gray-700 dark:text-gray-200">{endItem}</span>
        {' '}trong{' '}
        <span className="font-medium text-gray-700 dark:text-gray-200">{totalItems}</span> kết quả
      </p>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Limit selector */}
        {onLimitChange && (
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-600
              dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300
              focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10
              transition-colors"
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>{n}/trang</option>
            ))}
          </select>
        )}

        {/* Previous */}
        <button
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200
            bg-white text-gray-500 transition-colors
            hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200
            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-500
            dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400
            dark:hover:bg-brand-500/10 dark:hover:text-brand-400 dark:hover:border-brand-500/30
            dark:disabled:hover:bg-gray-800 dark:disabled:hover:text-gray-400"
          title="Trang trước"
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <polyline points="15,18 9,12 15,6" />
          </svg>
        </button>

        {/* Page numbers */}
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="px-1 text-gray-400 dark:text-gray-600 text-sm select-none">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`inline-flex h-9 min-w-[36px] items-center justify-center rounded-lg border text-sm font-medium transition-all duration-150 ${
                p === currentPage
                  ? 'border-brand-500 bg-brand-500 text-white shadow-md shadow-brand-500/25 dark:bg-brand-600 dark:border-brand-600'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {p}
            </button>
          ),
        )}

        {/* Next */}
        <button
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200
            bg-white text-gray-500 transition-colors
            hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200
            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-500
            dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400
            dark:hover:bg-brand-500/10 dark:hover:text-brand-400 dark:hover:border-brand-500/30
            dark:disabled:hover:bg-gray-800 dark:disabled:hover:text-gray-400"
          title="Trang sau"
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <polyline points="9,6 15,12 9,18" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Pagination;
