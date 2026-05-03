import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import { theaterApi } from "../../lib/theaterApi";

export default function TheaterForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState({ name: "", address: "", location: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      theaterApi.getById(id).then((t) => setForm({ name: t.name || "", address: t.address || "", location: t.location || "" }));
    }
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      isEdit ? await theaterApi.update(id, form) : await theaterApi.create(form);
      navigate("/theaters");
    } catch (err) { alert("Lỗi: " + err.message); }
    finally { setLoading(false); }
  };

  return (
    <>
      <PageMeta title={`${isEdit ? "Sửa" : "Thêm"} Rạp | Admin`} description="Form quản lý rạp" />
      <PageBreadCrumb pageTitle={isEdit ? "Sửa Rạp" : "Thêm Rạp Mới"} />
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Tên rạp *</label>
            <input name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Địa chỉ</label>
            <input name="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Khu vực</label>
            <input name="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-900 dark:text-white" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">{loading ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo Rạp"}</button>
            <button type="button" onClick={() => navigate("/theaters")} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">Hủy</button>
          </div>
        </form>
      </div>
    </>
  );
}
