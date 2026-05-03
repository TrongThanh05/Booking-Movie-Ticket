import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";

export default function AccessDenied() {
  return (
    <>
      <PageMeta title="Truy cập bị từ chối | Admin" description="Bạn không có quyền truy cập" />
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <span className="flex h-24 w-24 items-center justify-center rounded-full bg-error-100 dark:bg-error-900/20">
              <svg className="h-12 w-12 text-error-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
          </div>
          <h1 className="mb-2 text-3xl font-bold text-gray-800 dark:text-white/90">403</h1>
          <h2 className="mb-3 text-xl font-semibold text-gray-700 dark:text-gray-300">Truy cập bị từ chối</h2>
          <p className="mb-8 text-gray-500 dark:text-gray-400">
            Bạn không có quyền Admin để truy cập trang này.
          </p>
          <Link
            to="/signin"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            Đăng nhập tài khoản Admin
          </Link>
        </div>
      </div>
    </>
  );
}
