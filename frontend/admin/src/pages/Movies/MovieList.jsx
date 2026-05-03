import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import { Link } from "react-router";
import Badge from "../../components/ui/badge/Badge";
import { movieApi } from "../../lib/movieApi";

export default function MovieList() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    movieApi
      .getAll()
      .then((data) => setMovies(data))
      .catch((err) => console.error("Failed to load movies:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Bạn có chắc muốn xóa phim này?")) return;
    try {
      await movieApi.delete(id);
      setMovies((prev) => prev.filter((m) => m._id !== id));
    } catch (err) {
      alert("Xóa thất bại: " + err.message);
    }
  };

  return (
    <>
      <PageMeta title="Quản lý Phim | Admin" description="Danh sách phim" />
      <PageBreadCrumb pageTitle="Danh sách Phim" />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between px-6 py-5">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Phim ({movies.length})
          </h3>
          <Link
            to="/movies/create"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            + Thêm Phim
          </Link>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-10">
              <span className="text-gray-400">Đang tải...</span>
            </div>
          ) : movies.length === 0 ? (
            <div className="flex justify-center py-10">
              <span className="text-gray-400">Chưa có phim nào</span>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-t border-gray-200 dark:border-gray-800">
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Poster</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Tên phim</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Thể loại</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Thời lượng</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Trạng thái</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {movies.map((movie) => (
                  <tr
                    key={movie._id}
                    className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                  >
                    <td className="px-6 py-4">
                      <img
                        src={movie.poster_path}
                        alt={movie.title}
                        className="h-16 w-11 rounded object-cover"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                      {movie.title}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {movie.genre?.join(", ")}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {movie.runtime} phút
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant="light"
                        color={movie.status === "now_showing" ? "success" : "warning"}
                      >
                        {movie.status === "now_showing" ? "Đang chiếu" : "Sắp chiếu"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/movies/edit/${movie._id}`}
                          className="text-sm text-brand-500 hover:text-brand-600"
                        >
                          Sửa
                        </Link>
                        <button
                          onClick={() => handleDelete(movie._id)}
                          className="text-sm text-error-500 hover:text-error-600"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
