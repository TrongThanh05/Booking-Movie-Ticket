import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import api from "../../lib/api";

export default function BookingList() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Note: needs a GET /api/bookings endpoint on backend for admin
    api.get("/bookings")
      .then(setBookings)
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, []);

  const statusColor = {
    confirmed: "success",
    pending: "warning",
    cancelled: "error",
  };

  const statusLabel = {
    confirmed: "Đã xác nhận",
    pending: "Chờ xử lý",
    cancelled: "Đã hủy",
  };

  return (
    <>
      <PageMeta title="Đơn đặt vé | Admin" description="Danh sách đơn đặt vé" />
      <PageBreadCrumb pageTitle="Đơn đặt vé" />
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-6 py-5">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Đơn đặt vé ({bookings.length})</h3>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-10"><span className="text-gray-400">Đang tải...</span></div>
          ) : bookings.length === 0 ? (
            <div className="flex justify-center py-10"><span className="text-gray-400">Chưa có đơn đặt vé nào</span></div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-t border-gray-200 dark:border-gray-800">
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Mã booking</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Khách hàng</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Phim</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Số ghế</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Tổng tiền</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Trạng thái</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Ngày đặt</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b._id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-6 py-4 text-sm font-mono text-gray-800 dark:text-white/90">{b.booking_code || b._id?.slice(-8)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{b.user?.name || "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{b.show?.movie?.title || "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{b.tickets?.length || b.seat_ids?.length || 0}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-white/90">{b.total_amount?.toLocaleString("vi-VN")}đ</td>
                    <td className="px-6 py-4">
                      <Badge variant="light" color={statusColor[b.status] || "light"}>
                        {statusLabel[b.status] || b.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{b.booked_at ? new Date(b.booked_at).toLocaleString("vi-VN") : "—"}</td>
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
