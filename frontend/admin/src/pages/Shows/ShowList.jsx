import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import { Link } from "react-router";
import Badge from "../../components/ui/badge/Badge";
import { showApi } from "../../lib/showApi";

export default function ShowList() {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    showApi
      .getAll()
      .then(setShows)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Xóa suất chiếu này?")) return;
    try {
      await showApi.delete(id);
      setShows((prev) => prev.filter((s) => s._id !== id));
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString("vi-VN") : "—";

  return (
    <>
      <PageMeta title="Lịch chiếu | Admin" description="Danh sách suất chiếu" />
      <PageBreadCrumb pageTitle="Danh sách Suất chiếu" />
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between px-6 py-5">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Suất chiếu ({shows.length})</h3>
          <Link to="/shows/create" className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600">+ Tạo Suất chiếu</Link>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-10"><span className="text-gray-400">Đang tải...</span></div>
          ) : shows.length === 0 ? (
            <div className="flex justify-center py-10"><span className="text-gray-400">Chưa có suất chiếu</span></div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-t border-gray-200 dark:border-gray-800">
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Phim</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Rạp</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Phòng</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Thời gian</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Giá vé</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {shows.map((s) => (
                  <tr key={s._id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-white/90">{s.movie?.title || s.movie || "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{s.cinema?.name || s.cinema || "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{s.room_id?.name || "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(s.showtime)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{s.price?.toLocaleString("vi-VN")}đ</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/shows/edit/${s._id}`} className="text-sm text-brand-500 hover:text-brand-600">Sửa</Link>
                        <button onClick={() => handleDelete(s._id)} className="text-sm text-error-500 hover:text-error-600">Xóa</button>
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
