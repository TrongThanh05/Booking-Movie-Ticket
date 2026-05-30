import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ShoppingCart,
  Plus,
  Minus,
  UtensilsCrossed,
  Popcorn,
  Coffee,
  Layers,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { getFoods } from '../lib/api';
import toast from 'react-hot-toast';

// ── Cấu hình tabs ────────────────────────────────────────────────────────────
const TABS = [
  { key: 'all',      label: 'Tất cả',   icon: Layers,          color: 'from-purple-500 to-pink-500' },
  { key: 'combo',    label: 'Combo',    icon: Sparkles,        color: 'from-orange-500 to-red-500'  },
  { key: 'popcorn',  label: 'Bắp',      icon: Popcorn,         color: 'from-yellow-400 to-orange-500' },
  { key: 'drink',    label: 'Nước',     icon: Coffee,          color: 'from-cyan-400 to-blue-500'   },
];

const CATEGORY_LABELS = {
  combo:   { label: 'Combo',  color: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
  popcorn: { label: 'Bắp',   color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
  drink:   { label: 'Nước',  color: 'bg-cyan-500/20   text-cyan-300   border-cyan-500/40'   },
};

// ── Format price helper ───────────────────────────────────────────────────────
const formatPrice = (price) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(price);

// ── FoodCard — 1 món ăn ──────────────────────────────────────────────────────
const FoodCard = ({ food, quantity, onAdd, onRemove }) => {
  const cat = CATEGORY_LABELS[food.category] || CATEGORY_LABELS.combo;

  return (
    <div
      className={`
        relative group flex flex-col bg-black/30 backdrop-blur-sm rounded-2xl border transition-all duration-300 overflow-hidden
        ${quantity > 0
          ? 'border-red-500/60 shadow-lg shadow-red-500/10'
          : 'border-white/10 hover:border-white/25'
        }
      `}
    >
      {/* Ảnh món ăn */}
      <div className="relative overflow-hidden bg-gray-800/50 h-36 shrink-0">
        <img
          src={`/src/assets/images/foods/${food.imageUrl}`}
          alt={food.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = `https://placehold.co/300x200/1f2937/9ca3af?text=${encodeURIComponent(food.name)}`;
          }}
        />
        {/* Category badge */}
        <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cat.color}`}>
          {cat.label}
        </span>
        {/* Quantity badge khi có chọn */}
        {quantity > 0 && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-xs font-bold text-white shadow-lg animate-bounce-once">
            {quantity}
          </div>
        )}
      </div>

      {/* Thông tin */}
      <div className="flex flex-col flex-1 p-3 gap-2">
        <div className="flex-1">
          <h4 className="text-white font-semibold text-sm leading-tight line-clamp-1">{food.name}</h4>
          {food.description && (
            <p className="text-gray-400 text-xs mt-0.5 line-clamp-2 leading-relaxed">{food.description}</p>
          )}
        </div>

        {/* Price + Counter */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
          <span className="text-red-400 font-bold text-sm">{formatPrice(food.price)}</span>

          <div className="flex items-center gap-1.5">
            {quantity > 0 ? (
              <>
                <button
                  onClick={() => onRemove(food._id)}
                  className="w-7 h-7 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
                  aria-label="Giảm"
                >
                  <Minus className="w-3 h-3 text-white" />
                </button>
                <span className="w-5 text-center text-white font-semibold text-sm tabular-nums">
                  {quantity}
                </span>
                <button
                  onClick={() => onAdd(food._id)}
                  className="w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
                  aria-label="Tăng"
                >
                  <Plus className="w-3 h-3 text-white" />
                </button>
              </>
            ) : (
              <button
                onClick={() => onAdd(food._id)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 hover:bg-red-500 border border-red-500/40 hover:border-red-500 text-red-400 hover:text-white text-xs font-semibold transition-all duration-200"
              >
                <Plus className="w-3 h-3" />
                Thêm
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── FoodSelection — Main Component ───────────────────────────────────────────
/**
 * Props:
 *   isOpen        {boolean}                       — hiển thị modal
 *   onClose       {() => void}                    — đóng modal (skip chọn)
 *   onConfirm     {(selectedFoods) => void}       — xác nhận và chuyển sang thanh toán
 *   initialFoods  {{ [foodId]: number }}           — state đã chọn trước đó (để giữ khi quay lại)
 */
const FoodSelection = ({ isOpen, onClose, onConfirm, initialFoods = {}, onFoodDocsLoaded }) => {
  const [foods, setFoods]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState('all');
  // { [foodId]: quantity }
  const [quantities, setQuantities] = useState(initialFoods);

  // ── Fetch foods ─────────────────────────────────────────────────────────────
  const fetchFoods = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getFoods();
      const list = res.data?.data || [];
      setFoods(list);
      // Callback để parent cache thông tin tên/giá
      if (onFoodDocsLoaded) onFoodDocsLoaded(list);
    } catch (err) {
      console.error('FoodSelection fetch error:', err);
      toast.error('Không thể tải menu đồ ăn');
    } finally {
      setLoading(false);
    }
  }, [onFoodDocsLoaded]);

  useEffect(() => {
    if (isOpen) {
      fetchFoods();
      // Khôi phục trạng thái đã chọn trước đó
      setQuantities(initialFoods);
    }
  }, [isOpen, fetchFoods]);

  // Chặn scroll body khi modal mở
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // ── Quantity handlers ────────────────────────────────────────────────────────
  const handleAdd = (foodId) => {
    setQuantities((prev) => {
      const cur = prev[foodId] || 0;
      if (cur >= 10) { toast.error('Tối đa 10 món mỗi loại'); return prev; }
      return { ...prev, [foodId]: cur + 1 };
    });
  };

  const handleRemove = (foodId) => {
    setQuantities((prev) => {
      const cur = prev[foodId] || 0;
      if (cur <= 0) return prev;
      const next = { ...prev, [foodId]: cur - 1 };
      if (next[foodId] === 0) delete next[foodId];
      return next;
    });
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const foodMap     = Object.fromEntries(foods.map((f) => [f._id, f]));
  const totalItems  = Object.values(quantities).reduce((a, b) => a + b, 0);
  const totalFoodPrice = Object.entries(quantities).reduce((sum, [id, qty]) => {
    const food = foodMap[id];
    return sum + (food ? food.price * qty : 0);
  }, 0);

  const filteredFoods = activeTab === 'all'
    ? foods
    : foods.filter((f) => f.category === activeTab);

  // ── Build selectedFoods array để truyền lên parent ──────────────────────────
  const buildSelectedFoods = () =>
    Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([foodId, quantity]) => ({ foodId, quantity }));

  const handleConfirm = () => {
    onConfirm(buildSelectedFoods());
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Panel */}
      <div className="fixed inset-x-0 bottom-0 z-50 md:inset-0 md:flex md:items-center md:justify-center md:p-4 pointer-events-none">
        <div
          className="
            pointer-events-auto relative w-full md:max-w-4xl md:max-h-[90vh]
            bg-gradient-to-b from-gray-900 via-gray-950 to-black
            border border-white/10 rounded-t-3xl md:rounded-2xl
            flex flex-col shadow-2xl overflow-hidden
            animate-slideUp md:animate-fadeIn
          "
          style={{ maxHeight: '92vh' }}
        >
          {/* ─── Gradient top bar ───────────────────────────────────────────── */}
          <div className="h-1 w-full bg-gradient-to-r from-red-500 via-orange-400 to-yellow-400 shrink-0" />

          {/* ─── Header ─────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/8 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                <UtensilsCrossed className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg leading-tight">Chọn bắp nước</h2>
                <p className="text-gray-400 text-xs">Thêm vào để trải nghiệm phim tốt hơn 🍿</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* ─── Tabs ───────────────────────────────────────────────────────── */}
          <div className="flex gap-1.5 px-5 py-3 shrink-0 overflow-x-auto scrollbar-none">
            {TABS.map((tab) => {
              const Icon  = tab.icon;
              const count = tab.key === 'all'
                ? totalItems
                : Object.entries(quantities)
                    .filter(([id]) => foodMap[id]?.category === tab.key)
                    .reduce((a, [, v]) => a + v, 0);

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    relative flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 shrink-0
                    ${activeTab === tab.key
                      ? `bg-gradient-to-r ${tab.color} text-white shadow-md`
                      : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/8'
                    }
                  `}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {count > 0 && (
                    <span className={`
                      w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center
                      ${activeTab === tab.key ? 'bg-white/30 text-white' : 'bg-red-500 text-white'}
                    `}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ─── Foods Grid ─────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-5 pb-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#374151 transparent' }}>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-400 text-sm">Đang tải menu...</p>
              </div>
            ) : filteredFoods.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <UtensilsCrossed className="w-12 h-12 text-gray-600" />
                <p className="text-gray-400">Không có món nào trong danh mục này</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 py-1">
                {filteredFoods.map((food) => (
                  <FoodCard
                    key={food._id}
                    food={food}
                    quantity={quantities[food._id] || 0}
                    onAdd={handleAdd}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ─── Selected summary bar ───────────────────────────────────────── */}
          {totalItems > 0 && (
            <div className="mx-5 mb-3 p-3 rounded-xl bg-white/5 border border-white/10 shrink-0">
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(quantities)
                  .filter(([, qty]) => qty > 0)
                  .map(([id, qty]) => {
                    const food = foodMap[id];
                    if (!food) return null;
                    return (
                      <span
                        key={id}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-xs"
                      >
                        {qty}× {food.name.split(' ').slice(0, 3).join(' ')}
                      </span>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ─── Footer CTAs ────────────────────────────────────────────────── */}
          <div className="flex gap-3 px-5 pb-5 pt-2 border-t border-white/8 shrink-0">
            <button
              onClick={onClose}
              className="flex-none px-4 py-3 rounded-full border border-white/20 hover:border-white/40 text-gray-300 hover:text-white text-sm font-semibold transition-all duration-200"
            >
              Bỏ qua
            </button>

            <button
              onClick={handleConfirm}
              className="flex-1 flex items-center justify-between px-5 py-3 rounded-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold shadow-lg shadow-red-500/30 transition-all duration-200 group"
            >
              <span className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                {totalItems > 0
                  ? `Xác nhận (${totalItems} món)`
                  : 'Tiếp tục không chọn'
                }
              </span>
              <span className="flex items-center gap-1">
                {totalFoodPrice > 0 && (
                  <span className="text-red-200 text-sm font-normal">+{formatPrice(totalFoodPrice)}</span>
                )}
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default FoodSelection;
