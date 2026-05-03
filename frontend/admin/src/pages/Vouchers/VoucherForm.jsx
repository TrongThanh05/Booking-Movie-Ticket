import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import { voucherApi } from "../../lib/voucherApi";

export default function VoucherForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    code: "", discount_type: "percent", discount_value: "", min_order: "", expiry_date: "", is_active: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      voucherApi.getById(id).then((v) => setForm({
        code: v.code || "", discount_type: v.discount_type || "percent",
        discount_value: v.discount_value || "", min_order: v.min_order || "",
        expiry_date: v.expiry_date ? v.expiry_date.split("T")[0] : "", is_active: v.is_active ?? true,
      }));
    }
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, discount_value: Number(form.discount_value), min_order: Number(form.min_order) || 0 };
      isEdit ? await voucherApi.update(id, payload) : await voucherApi.create(payload);
      navigate("/vouchers");
    } catch (err) { alert("Lỗi: " + err.message); }
    finally { setLoading(false); }
  };

  return (
    <>
      <PageMeta title={`${isEdit ? "Sửa" : "Tạo"} Voucher | Admin`} description="Form voucher" />
      <PageBreadCrumb pageTitle={isEdit ? "Sửa Voucher" : "Tạo Voucher Mới"} />
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Mã voucher *</label>
            <input name="code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-mono dark:border-gray-800 dark:bg-gray-900 dark:text-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Loại giảm giá</label>
              <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-900 dark:text-white">
                <option value="percent">Phần trăm (%)</option>
                <option value="fixed">Cố định (VNĐ)</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Giá trị giảm *</label>
              <input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} required className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-900 dark:text-white" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Hạn sử dụng</label>
            <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-900 dark:text-white" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-gray-300" />
            <label className="text-sm text-gray-700 dark:text-gray-400">Kích hoạt</label>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">{loading ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo"}</button>
            <button type="button" onClick={() => navigate("/vouchers")} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">Hủy</button>
          </div>
        </form>
      </div>
    </>
  );
}
