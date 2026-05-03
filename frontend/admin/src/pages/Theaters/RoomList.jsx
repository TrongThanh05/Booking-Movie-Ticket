import { useState, useEffect } from "react";
import { useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import { roomApi } from "../../lib/roomApi";
import Badge from "../../components/ui/badge/Badge";

export default function RoomList() {
  const { theaterId } = useParams();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    roomApi
      .getAll(theaterId)
      .then(setRooms)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [theaterId]);

  return (
    <>
      <PageMeta title="Phòng chiếu | Admin" description="Danh sách phòng chiếu" />
      <PageBreadCrumb pageTitle="Phòng chiếu" />
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-6 py-5">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Phòng chiếu ({rooms.length})</h3>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-10"><span className="text-gray-400">Đang tải...</span></div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-t border-gray-200 dark:border-gray-800">
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Tên phòng</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Loại màn hình</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Sức chứa</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Rạp</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((r) => (
                  <tr key={r._id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-white/90">{r.name}</td>
                    <td className="px-6 py-4"><Badge variant="light" color="info">{r.screen_type}</Badge></td>
                    <td className="px-6 py-4 text-sm text-gray-500">{r.capacity} ghế</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{r.theater_id?.name || "—"}</td>
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
