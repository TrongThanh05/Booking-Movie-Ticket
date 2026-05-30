import { Link } from 'react-router-dom';

const AccessDenied = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
    <div className="text-center">
      <div className="mb-6 text-7xl">🔒</div>
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">403</h1>
      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
        Truy cập bị từ chối
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
        Bạn không có quyền truy cập vào trang quản trị. Vui lòng liên hệ quản trị viên nếu bạn cho rằng đây là lỗi.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
        </svg>
        Về trang chủ
      </Link>
    </div>
  </div>
);

export default AccessDenied;
