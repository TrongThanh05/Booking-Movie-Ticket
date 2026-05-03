import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import { Link } from "react-router";
import { theaterApi } from "../../lib/theaterApi";

export default function TheaterList() {
  const [theaters, setTheaters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    theaterApi
      .getAll()
      .then(setTheaters)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Xóa rạp này?")) return;
    try {
      await theaterApi.delete(id);
      setTheaters((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  };

  return (
    <>
      <PageMeta title="Quản lý Rạp | Admin" description="Danh sách rạp chiếu phim" />
      <PageBreadCrumb pageTitle="Danh sách Rạp" />
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between px-6 py-5">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Rạp ({theaters.length})</h3>
          <Link to="/theaters/create" className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600">+ Thêm Rạp</Link>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-10"><span className="text-gray-400">Đang tải...</span></div>
          ) : theaters.length === 0 ? (
            <div className="flex justify-center py-10"><span className="text-gray-400">Chưa có rạp nào</span></div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-t border-gray-200 dark:border-gray-800">
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Tên rạp</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Địa chỉ</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Khu vực</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {theaters.map((t) => (
                  <tr key={t._id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-white/90">{t.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{t.address}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{t.location}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/theaters/${t._id}/rooms`} className="text-sm text-gray-500 hover:text-gray-700">Phòng chiếu</Link>
                        <Link to={`/theaters/edit/${t._id}`} className="text-sm text-brand-500 hover:text-brand-600">Sửa</Link>
                        <button onClick={() => handleDelete(t._id)} className="text-sm text-error-500 hover:text-error-600">Xóa</button>
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
