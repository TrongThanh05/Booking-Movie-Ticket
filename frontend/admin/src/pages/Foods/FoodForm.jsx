/**
 * FoodForm.jsx — Form thêm mới / chỉnh sửa món F&B
 * Routes:
 *   /admin/foods/create      → Thêm mới
 *   /admin/foods/edit/:id    → Chỉnh sửa
 *
 * API:
 *   POST /api/foods          → Tạo mới
 *   PUT  /api/foods/:id      → Cập nhật
 *   GET  /api/foods/:id      → Load data khi edit
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageMeta from '../../components/common/PageMeta';
import PageBreadCrumb from '../../components/common/PageBreadCrumb';
import Button from '../../components/ui/button/Button';
import { api } from '../../lib/api';

const CATEGORIES = [
  { value: 'combo',   label: '🎁 Combo' },
  { value: 'popcorn', label: '🍿 Bắp rang' },
  { value: 'drink',   label: '🥤 Đồ uống' },
];

const EMPTY_FORM = {
  name:        '',
  description: '',
  price:       '',
  imageUrl:    '',
  category:    'combo',
  sortOrder:   0,
  isActive:    true,
};

const FoodForm = () => {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const isEdit       = Boolean(id);

  const [form, setForm]       = useState(EMPTY_FORM);
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving]   = useState(false);

  // ── Load data khi edit ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    api.get(`/foods/${id}`)
      .then(r => {
        const d = r.data;
        setForm({
          name:        d.name        || '',
          description: d.description || '',
          price:       d.price       ?? '',
          imageUrl:    d.imageUrl    || '',
          category:    d.category    || 'combo',
          sortOrder:   d.sortOrder   ?? 0,
          isActive:    d.isActive    ?? true,
        });
      })
      .catch(() => {
        toast.error('Không tải được dữ liệu món ăn');
        navigate('/admin/foods');
      })
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate]);

  // ── Field helpers ────────────────────────────────────────────────────────────
  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  // ── Validation ───────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.name.trim())           e.name     = 'Tên món là bắt buộc';
    if (!form.price || form.price <= 0) e.price = 'Giá phải lớn hơn 0';
    if (!form.category)              e.category = 'Vui lòng chọn danh mục';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    const payload = {
      ...form,
      price:     Number(form.price),
      sortOrder: Number(form.sortOrder) || 0,
    };

    try {
      if (isEdit) {
        await api.put(`/foods/${id}`, payload);
        toast.success('Cập nhật món thành công! 🎉');
      } else {
        await api.post('/foods', payload);
        toast.success('Thêm món mới thành công! 🍿');
      }
      navigate('/admin/foods');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  };

  // ── Field style helper ───────────────────────────────────────────────────────
  const inputCls = (field) => `
    w-full rounded-xl border px-4 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white
    transition-colors outline-none
    ${errors[field]
      ? 'border-error-400 focus:ring-2 focus:ring-error-500/20 dark:border-error-500'
      : 'border-gray-200 dark:border-gray-700 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 dark:focus:border-brand-500'
    }
  `;

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-gray-200 dark:bg-gray-800" />
      <div className="h-96 rounded-2xl bg-gray-200 dark:bg-gray-800" />
    </div>
  );

  return (
    <>
      <PageMeta
        title={`${isEdit ? 'Sửa món' : 'Thêm món mới'} | CineAdmin`}
        description="Quản lý thực đơn F&B"
      />
      <PageBreadCrumb
        pageTitle={isEdit ? 'Chỉnh sửa món' : 'Thêm món mới'}
        items={[
          { label: 'F&B', path: '/admin/foods' },
          { label: isEdit ? 'Chỉnh sửa' : 'Thêm mới' },
        ]}
      />

      <div className="mx-auto max-w-2xl">
        <form onSubmit={handleSubmit} noValidate>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 space-y-6">

            {/* ── Preview ảnh ─────────────────────────────────────────────── */}
            {form.imageUrl && (
              <div className="flex justify-center">
                <div className="relative h-36 w-48 overflow-hidden rounded-2xl border-2 border-brand-200 dark:border-brand-500/30 shadow-sm">
                  <img
                    src={form.imageUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <span className="absolute bottom-2 left-2 text-[10px] font-medium text-white bg-black/40 rounded px-1.5 py-0.5">
                    Preview
                  </span>
                </div>
              </div>
            )}

            {/* ── Tên món ─────────────────────────────────────────────────── */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tên món <span className="text-error-500">*</span>
              </label>
              <input
                id="food-name"
                type="text"
                placeholder="VD: Combo Đôi Cổ Điển"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className={inputCls('name')}
              />
              {errors.name && <p className="mt-1 text-xs text-error-500">{errors.name}</p>}
            </div>

            {/* ── Mô tả ────────────────────────────────────────────────────── */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Mô tả
              </label>
              <textarea
                id="food-description"
                rows={2}
                placeholder="VD: 2 bắp rang bơ cỡ vừa + 2 nước ngọt lớn"
                value={form.description}
                onChange={e => set('description', e.target.value)}
                className={`${inputCls('description')} resize-none`}
              />
            </div>

            {/* ── Danh mục + Giá ──────────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Danh mục <span className="text-error-500">*</span>
                </label>
                <select
                  id="food-category"
                  value={form.category}
                  onChange={e => set('category', e.target.value)}
                  className={inputCls('category')}
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                {errors.category && <p className="mt-1 text-xs text-error-500">{errors.category}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Giá (VND) <span className="text-error-500">*</span>
                </label>
                <input
                  id="food-price"
                  type="number"
                  min={0}
                  step={1000}
                  placeholder="VD: 150000"
                  value={form.price}
                  onChange={e => set('price', e.target.value)}
                  className={inputCls('price')}
                />
                {form.price > 0 && (
                  <p className="mt-1 text-xs text-gray-400">
                    = {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(form.price)}
                  </p>
                )}
                {errors.price && <p className="mt-1 text-xs text-error-500">{errors.price}</p>}
              </div>
            </div>

            {/* ── URL ảnh + Thứ tự ────────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  URL ảnh
                </label>
                <input
                  id="food-image"
                  type="text"
                  placeholder="https://... hoặc /images/food.jpg"
                  value={form.imageUrl}
                  onChange={e => set('imageUrl', e.target.value)}
                  className={inputCls('imageUrl')}
                />
                <p className="mt-1 text-xs text-gray-400">Dán URL ảnh để preview tự động hiển thị bên trên</p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Thứ tự hiển thị
                </label>
                <input
                  id="food-sort"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form.sortOrder}
                  onChange={e => set('sortOrder', e.target.value)}
                  className={inputCls('sortOrder')}
                />
                <p className="mt-1 text-xs text-gray-400">Số nhỏ hơn → hiện trước</p>
              </div>
            </div>

            {/* ── isActive toggle ──────────────────────────────────────────── */}
            <div className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Hiển thị cho khách hàng</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {form.isActive ? 'Món đang được hiển thị trong thực đơn' : 'Món đang bị ẩn khỏi thực đơn'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => set('isActive', !form.isActive)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                  form.isActive ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  form.isActive ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* ── Footer buttons ───────────────────────────────────────────── */}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700/60">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/admin/foods')}
                disabled={saving}
              >
                Huỷ
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Đang lưu...
                  </span>
                ) : (
                  isEdit ? '💾 Lưu thay đổi' : '➕ Thêm món'
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

export default FoodForm;
