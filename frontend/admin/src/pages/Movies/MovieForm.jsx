import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import { movieApi } from "../../lib/movieApi";

export default function MovieForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    title: "",
    genre: "",
    runtime: "",
    release_date: "",
    overview: "",
    poster_path: "",
    backdrop_path: "",
    trailer_url: "",
    status: "coming_soon",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      movieApi.getById(id).then((movie) =>
        setForm({
          title: movie.title || "",
          genre: movie.genre?.join(", ") || "",
          runtime: movie.runtime || "",
          release_date: movie.release_date?.split("T")[0] || "",
          overview: movie.overview || "",
          poster_path: movie.poster_path || "",
          backdrop_path: movie.backdrop_path || "",
          trailer_url: movie.trailer_url || "",
          status: movie.status || "coming_soon",
        })
      );
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...form,
      genre: form.genre.split(",").map((g) => g.trim()),
      runtime: Number(form.runtime),
    };

    try {
      if (isEdit) {
        await movieApi.update(id, payload);
      } else {
        await movieApi.create(payload);
      }
      navigate("/movies");
    } catch (err) {
      alert("Lỗi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta
        title={`${isEdit ? "Sửa" : "Thêm"} Phim | Admin`}
        description="Form quản lý phim"
      />
      <PageBreadCrumb pageTitle={isEdit ? "Sửa Phim" : "Thêm Phim Mới"} />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Tên phim *
              </label>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Thể loại (phân cách bằng dấu phẩy)
              </label>
              <input
                name="genre"
                value={form.genre}
                onChange={handleChange}
                placeholder="Hành động, Phiêu lưu, Khoa học viễn tưởng"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Thời lượng (phút)
              </label>
              <input
                name="runtime"
                type="number"
                value={form.runtime}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Ngày phát hành
              </label>
              <input
                name="release_date"
                type="date"
                value={form.release_date}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Trạng thái
              </label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              >
                <option value="coming_soon">Sắp chiếu</option>
                <option value="now_showing">Đang chiếu</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Trailer URL
              </label>
              <input
                name="trailer_url"
                value={form.trailer_url}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Poster URL
            </label>
            <input
              name="poster_path"
              value={form.poster_path}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Mô tả
            </label>
            <textarea
              name="overview"
              value={form.overview}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {loading ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo Phim"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/movies")}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
