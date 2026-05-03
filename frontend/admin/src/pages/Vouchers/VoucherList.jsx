import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import { Link } from "react-router";
import Badge from "../../components/ui/badge/Badge";
import { voucherApi } from "../../lib/voucherApi";

export default function VoucherList() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    voucherApi.getAll().then(setVouchers).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Xóa voucher này?")) return;
    try {
      await voucherApi.delete(id);
      setVouchers((prev) => prev.filter((v) => v._id !== id));
    } catch (err) { alert("Lỗi: " + err.message); }
  };

  return (
    <>
      <PageMeta title="Vouchers | Admin" description="Danh sách voucher" />
      <PageBreadCrumb pageTitle="Danh sách Voucher" />
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between px-6 py-5">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Voucher ({vouchers.length})</h3>
          <Link to="/vouchers/create" className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600">+ Tạo Voucher</Link>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-10"><span className="text-gray-400">Đang tải...</span></div>
          ) : vouchers.length === 0 ? (
            <div className="flex justify-center py-10"><span className="text-gray-400">Chưa có voucher nào</span></div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-t border-gray-200 dark:border-gray-800">
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Mã</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Loại giảm</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Giá trị</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Hạn sử dụng</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Trạng thái</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((v) => (
                  <tr key={v._id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className="px-6 py-4 text-sm font-mono font-medium text-gray-800 dark:text-white/90">{v.code}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{v.discount_type === "percent" ? "Phần trăm" : "Cố định"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{v.discount_type === "percent" ? `${v.discount_value}%` : `${v.discount_value?.toLocaleString("vi-VN")}đ`}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{v.expiry_date ? new Date(v.expiry_date).toLocaleDateString("vi-VN") : "—"}</td>
                    <td className="px-6 py-4">
                      <Badge variant="light" color={v.is_active ? "success" : "light"}>{v.is_active ? "Đang hoạt động" : "Hết hạn"}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/vouchers/edit/${v._id}`} className="text-sm text-brand-500 hover:text-brand-600">Sửa</Link>
                        <button onClick={() => handleDelete(v._id)} className="text-sm text-error-500 hover:text-error-600">Xóa</button>
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
