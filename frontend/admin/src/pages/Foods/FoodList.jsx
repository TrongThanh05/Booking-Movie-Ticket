/**
 * FoodList.jsx — Quản lý đồ ăn & thức uống (F&B)
 * Features:
 *   - Bảng danh sách với filter theo category (tabs)
 *   - Toggle bật/tắt hiển thị món (isActive)
 *   - Xoá mềm (soft delete: isActive = false)
 *   - Điều hướng đến FoodForm để thêm/sửa
 */
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import PageBreadCrumb from '../../components/common/PageBreadCrumb';
import Badge from '../../components/ui/badge/Badge';
import Button from '../../components/ui/button/Button';
import Table from '../../components/ui/table/Table';
import Modal from '../../components/ui/modal/Modal';
import { api } from '../../lib/api';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

const CATEGORY_TABS = [
  { value: 'all',      label: '🍿 Tất cả' },
  { value: 'combo',    label: '🎁 Combo' },
  { value: 'popcorn',  label: '🍿 Bắp rang' },
  { value: 'drink',    label: '🥤 Đồ uống' },
];

const CATEGORY_LABELS = {
  combo:   { label: 'Combo',    color: 'warning' },
  popcorn: { label: 'Bắp rang', color: 'success' },
  drink:   { label: 'Đồ uống',  color: 'primary' },
};

const FoodList = () => {
  const [foods, setFoods]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState('all');
  const [deleteModal, setDeleteModal] = useState({ open: false, food: null });
  const [toggling, setToggling]       = useState(null); // id đang toggle

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const fetchFoods = useCallback(async () => {
    setLoading(true);
    try {
      // Lấy tất cả (kể cả isActive=false) — dùng endpoint admin có auth
      const params = activeTab !== 'all' ? { category: activeTab } : {};
      // Backend GET /api/foods chỉ trả isActive=true. Để admin xem cả inactive,
      // ta fetch không có filter category rồi lọc ở client-side.
      const r = await api.get('/foods/admin/all', { params }).catch(
        // Fallback: nếu chưa có /admin/all endpoint thì dùng endpoint công khai
        () => api.get('/foods', { params: activeTab !== 'all' ? { category: activeTab } : {} })
      );
      const data = r.data?.data || r.data || [];
      setFoods(Array.isArray(data) ? data : []);
    } catch {
      setFoods([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchFoods(); }, [fetchFoods]);

  // ── Toggle isActive ──────────────────────────────────────────────────────────
  const handleToggleActive = async (food) => {
    setToggling(food._id);
    try {
      await api.put(`/foods/${food._id}`, { isActive: !food.isActive });
      setFoods(prev => prev.map(f => f._id === food._id ? { ...f, isActive: !f.isActive } : f));
    } catch (e) {
      console.error(e);
    } finally {
      setToggling(null);
    }
  };

  // ── Soft Delete ──────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteModal.food) return;
    try {
      await api.delete(`/foods/${deleteModal.food._id}`);
      // Backend soft-delete: set isActive=false. Refresh list.
      fetchFoods();
    } catch (e) {
      console.error(e);
    }
    setDeleteModal({ open: false, food: null });
  };

  // ── Filter client-side theo tab nếu backend không hỗ trợ ────────────────────
  const displayedFoods = activeTab === 'all'
    ? foods
    : foods.filter(f => f.category === activeTab);

  return (
    <>
      <PageMeta title="Quản lý đồ ăn & uống | CineAdmin" description="Quản lý đồ ăn thức uống bán tại rạp" />
      <PageBreadCrumb pageTitle="Quản lý đồ ăn & uống" items={[{ label: 'Đồ ăn & uống' }]} />

      {/* ── Header Actions ─────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {displayedFoods.length} món — {displayedFoods.filter(f => f.isActive).length} đang hiển thị
          </p>
        </div>
        <Link to="/admin/foods/create">
          <Button>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Thêm món mới
          </Button>
        </Link>
      </div>

      {/* ── Category Tabs ───────────────────────────────────────────────────── */}
      <div className="mb-5 flex gap-2 flex-wrap">
        {CATEGORY_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === tab.value
                ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
                : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-brand-300 hover:text-brand-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
          <Table>
            <Table.Head>
              <tr>
                <Table.Header>Món</Table.Header>
                <Table.Header>Danh mục</Table.Header>
                <Table.Header>Giá</Table.Header>
                <Table.Header>Thứ tự</Table.Header>
                <Table.Header>Trạng thái</Table.Header>
                <Table.Header className="text-right">Thao tác</Table.Header>
              </tr>
            </Table.Head>
            <Table.Body>
              {displayedFoods.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">🍿</span>
                      <p className="text-gray-400 dark:text-gray-500 text-sm">Chưa có món nào trong danh mục này</p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedFoods.map(food => (
                  <Table.Row key={food._id} className={!food.isActive ? 'opacity-50' : ''}>
                    {/* Ảnh + Tên + Mô tả */}
                    <Table.Cell>
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                          {food.imageUrl ? (
                            <img
                              src={`/src/assets/images/foods/${food.imageUrl}`}
                              alt={food.name}
                              className="h-full w-full object-cover"
                              onError={e => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-2xl">🍿</div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-white/90 max-w-[200px] truncate">
                            {food.name}
                          </p>
                          {food.description && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 max-w-[200px] truncate mt-0.5">
                              {food.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </Table.Cell>

                    {/* Category */}
                    <Table.Cell>
                      <Badge
                        variant="light"
                        color={CATEGORY_LABELS[food.category]?.color || 'light'}
                        size="sm"
                      >
                        {CATEGORY_LABELS[food.category]?.label || food.category}
                      </Badge>
                    </Table.Cell>

                    {/* Giá */}
                    <Table.Cell>
                      <span className="font-semibold text-gray-800 dark:text-white/90 whitespace-nowrap">
                        {fmt(food.price)}
                      </span>
                    </Table.Cell>

                    {/* Sort Order */}
                    <Table.Cell>
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-300">
                        {food.sortOrder ?? 0}
                      </span>
                    </Table.Cell>

                    {/* Trạng thái — toggle switch */}
                    <Table.Cell>
                      <button
                        onClick={() => handleToggleActive(food)}
                        disabled={toggling === food._id}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          food.isActive ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'
                        } ${toggling === food._id ? 'opacity-50' : ''}`}
                        title={food.isActive ? 'Đang hiển thị — click để ẩn' : 'Đang ẩn — click để hiện'}
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                          food.isActive ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                      <span className={`ml-2 text-xs font-medium ${food.isActive ? 'text-success-600 dark:text-success-400' : 'text-gray-400'}`}>
                        {food.isActive ? 'Hiển thị' : 'Đã ẩn'}
                      </span>
                    </Table.Cell>

                    {/* Thao tác */}
                    <Table.Cell>
                      <div className="flex items-center justify-end gap-1">
                        {/* Sửa */}
                        <Link to={`/admin/foods/edit/${food._id}`}>
                          <button
                            className="rounded-lg p-2 text-gray-500 hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10 transition-colors"
                            title="Chỉnh sửa"
                          >
                            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        </Link>
                        {/* Xoá */}
                        <button
                          onClick={() => setDeleteModal({ open: true, food })}
                          className="rounded-lg p-2 text-gray-500 hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10 transition-colors"
                          title="Ẩn món này"
                        >
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <polyline points="3,6 5,6 21,6" />
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table>
        </div>
      )}

      {/* ── Delete Confirmation Modal ────────────────────────────────────────── */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, food: null })}
        title="Xác nhận ẩn món"
        size="sm"
        showFooter
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModal({ open: false, food: null })}>Huỷ</Button>
            <Button variant="danger" onClick={handleDelete}>Ẩn món</Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/10">
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2}>
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Bạn có chắc muốn <strong>ẩn</strong> món{' '}
              <strong className="text-gray-800 dark:text-white">"{deleteModal.food?.name}"</strong>?
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Món sẽ không hiển thị với khách hàng nhưng dữ liệu vẫn được lưu. Bạn có thể bật lại bất cứ lúc nào.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default FoodList;
