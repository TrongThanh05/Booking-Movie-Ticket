import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import { showApi } from "../../lib/showApi";
import { movieApi } from "../../lib/movieApi";
import { theaterApi } from "../../lib/theaterApi";
import { roomApi } from "../../lib/roomApi";

export default function ShowForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    movie: "", cinema: "", room_id: "", showtime: "", price: "",
  });
  const [movies, setMovies] = useState([]);
  const [theaters, setTheaters] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    movieApi.getAll().then(setMovies);
    theaterApi.getAll().then(setTheaters);
  }, []);

  useEffect(() => {
    if (form.cinema) {
      roomApi.getAll(form.cinema).then(setRooms);
    }
  }, [form.cinema]);

  useEffect(() => {
    if (isEdit) {
      showApi.getById(id).then((s) => setForm({
        movie: s.movie?._id || s.movie || "",
        cinema: s.cinema?._id || s.cinema || "",
        room_id: s.room_id?._id || s.room_id || "",
        showtime: s.showtime ? new Date(s.showtime).toISOString().slice(0, 16) : "",
        price: s.price || "",
      }));
    }
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, price: Number(form.price) };
      isEdit ? await showApi.update(id, payload) : await showApi.create(payload);
      navigate("/shows");
    } catch (err) { alert("Lỗi: " + err.message); }
    finally { setLoading(false); }
  };

  return (
    <>
      <PageMeta title={`${isEdit ? "Sửa" : "Tạo"} Suất chiếu | Admin`} description="Form suất chiếu" />
      <PageBreadCrumb pageTitle={isEdit ? "Sửa Suất chiếu" : "Tạo Suất chiếu"} />
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Phim *</label>
            <select value={form.movie} onChange={(e) => setForm({ ...form, movie: e.target.value })} required className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-900 dark:text-white">
              <option value="">-- Chọn phim --</option>
              {movies.map((m) => <option key={m._id} value={m._id}>{m.title}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Rạp *</label>
            <select value={form.cinema} onChange={(e) => setForm({ ...form, cinema: e.target.value, room_id: "" })} required className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-900 dark:text-white">
              <option value="">-- Chọn rạp --</option>
              {theaters.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Phòng chiếu *</label>
            <select value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })} required className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-900 dark:text-white">
              <option value="">-- Chọn phòng --</option>
              {rooms.map((r) => <option key={r._id} value={r._id}>{r.name} ({r.screen_type})</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Thời gian chiếu *</label>
            <input type="datetime-local" value={form.showtime} onChange={(e) => setForm({ ...form, showtime: e.target.value })} required className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Giá vé (VNĐ) *</label>
            <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-900 dark:text-white" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">{loading ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo"}</button>
            <button type="button" onClick={() => navigate("/shows")} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">Hủy</button>
          </div>
        </form>
      </div>
    </>
  );
}
