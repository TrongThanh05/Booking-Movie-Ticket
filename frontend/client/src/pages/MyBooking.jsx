import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ticket,
  Clock,
  MapPin,
  Star,
  Trash2,
  Calendar,
  Search,
  Filter,
  QrCode,
  ChevronDown,
  ChevronUp,
  X,
  ArrowLeft,
} from 'lucide-react';
import BlurCircle from '../components/BlurCircle';
import TicketQRCode from '../components/TicketQRCode';
import { getUserBookings, cancelBooking, deleteBooking } from '../lib/api';
import toast from 'react-hot-toast';

const MyBooking = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedQR, setExpandedQR] = useState(null); // booking._id đang mở QR
  const [detailBooking, setDetailBooking] = useState(null); // booking đang xem chi tiết
  const bookingsPerPage = 5;

  // Lấy user từ localStorage
  const getCurrentUserId = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user._id || null;
  };

  // Fetch bookings từ API
  useEffect(() => {
    const fetchBookings = async () => {
      const userId = getCurrentUserId();
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await getUserBookings(userId);
        setBookings(response.data);
      } catch (err) {
        console.error('Error fetching bookings:', err);
        toast.error('Không thể tải lịch sử đặt vé');
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  // Filter and sort bookings
  const getFilteredBookings = () => {
    let filtered = bookings;

    if (filterStatus !== 'all') {
      filtered = filtered.filter((b) => b.status === filterStatus);
    }

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.show?.movie?.title?.toLowerCase().includes(lowerQuery) ||
          b.tickets
            ?.map((t) => t.seat_id)
            .join(', ')
            .toLowerCase()
            .includes(lowerQuery),
      );
    }

    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':
          return new Date(a.show?.showDateTime) - new Date(b.show?.showDateTime);
        case 'date_desc':
          return new Date(b.show?.showDateTime) - new Date(a.show?.showDateTime);
        case 'price_asc':
          return a.total_amount - b.total_amount;
        case 'price_desc':
          return b.total_amount - a.total_amount;
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredBookings = getFilteredBookings();
  const totalPages = Math.ceil(filteredBookings.length / bookingsPerPage);
  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * bookingsPerPage,
    currentPage * bookingsPerPage,
  );

  // Handle cancel booking
  const handleCancel = async (bookingId) => {
    if (!window.confirm('Bạn có chắc muốn hủy vé này?')) return;

    try {
      await cancelBooking(bookingId);
      toast.success('Đã hủy vé thành công');
      setBookings((prev) =>
        prev.map((b) =>
          b._id === bookingId
            ? { ...b, status: 'cancelled', cancelled_at: new Date() }
            : b,
        ),
      );
      // Nếu đang xem detail của vé này thì cập nhật luôn
      if (detailBooking?._id === bookingId) {
        setDetailBooking((prev) => ({ ...prev, status: 'cancelled' }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Hủy vé thất bại');
    }
  };  // Handle delete booking (chỉ vé đã hủy)
  const handleDelete = async (bookingId) => {
    if (!window.confirm('Xóa vé này khỏi lịch sử? Hành động này không thể hoàn tác.')) return;
    try {
      const userId = getCurrentUserId();
      await deleteBooking(bookingId, userId);
      toast.success('Đã xóa vé khỏi lịch sử');
      setBookings((prev) => prev.filter((b) => b._id !== bookingId));
      if (detailBooking?._id === bookingId) setDetailBooking(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xóa vé thất bại');
    }
  };


  // Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} — ${d.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
  };

  // Check if booking can be cancelled
  const canCancel = (booking) => {
    return (
      booking.status === 'confirmed' &&
      new Date(booking.show?.showDateTime) > new Date()
    );
  };

  // Check if booking can be rated
  const canRate = (booking) => {
    return (
      booking.status === 'confirmed' &&
      new Date(booking.show?.showDateTime) < new Date()
    );
  };

  // Status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return { class: 'bg-green-500/20 text-green-300', label: 'Đã xác nhận' };
      case 'cancelled':
        return { class: 'bg-red-500/20 text-red-300', label: 'Đã hủy' };
      case 'completed':
        return { class: 'bg-blue-500/20 text-blue-300', label: 'Hoàn thành' };
      default:
        return { class: 'bg-gray-500/20 text-gray-300', label: status };
    }
  };

  // ====== LOADING ======
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 pt-24 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
            <h2 className="text-adaptive text-xl font-semibold">
              Đang tải lịch sử đặt vé...
            </h2>
          </div>
        </div>
      </div>
    );
  }

  // ====== DETAIL PANEL (inline — thay thế navigate('/my-booking/:id')) ======
  if (detailBooking) {
    const b = detailBooking;
    const movie = b.show?.movie;
    const cinema = b.show?.cinema;
    const room = b.show?.room_id;
    const seatList = b.tickets?.map((t) => t.seat_id).join(', ') || '';
    const statusBadge = getStatusBadge(b.status);

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 pt-24 pb-12">
        <BlurCircle top="100px" left="0" />
        <BlurCircle bottom="100px" right="0" />

        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          {/* Back button */}
          <button
            onClick={() => setDetailBooking(null)}
            className="flex items-center gap-2 mb-6 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Quay lại lịch sử đặt vé</span>
          </button>

          <h1 className="text-2xl md:text-3xl font-bold text-adaptive mb-6">Chi Tiết Vé</h1>

          {/* Ticket card */}
          <div className="bg-black/20 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
            {/* Top gradient bar */}
            <div className="h-1 w-full bg-gradient-to-r from-red-500 via-pink-500 to-red-600" />

            <div className="p-6 space-y-6">
              {/* Movie info */}
              <div className="flex items-start gap-4">
                {movie?.poster_path && (
                  <img
                    src={`/src/assets/images/posters/${movie.poster_path}`}
                    alt={movie.title}
                    className="w-20 h-28 object-cover rounded-lg shadow-md shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-adaptive font-bold text-xl leading-tight mb-1 truncate">
                    {movie?.title || 'Phim không xác định'}
                  </h2>
                  {b.booking_code && (
                    <p className="text-yellow-400 font-mono text-sm font-semibold mb-2">
                      #{b.booking_code}
                    </p>
                  )}
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusBadge.class}`}>
                    {statusBadge.label}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="relative flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gray-900 border border-white/10 -ml-9 shrink-0" />
                <div className="flex-1 border-t border-dashed border-white/20" />
                <div className="w-5 h-5 rounded-full bg-gray-900 border border-white/10 -mr-9 shrink-0" />
              </div>

              {/* Show info grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                  <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>{formatDateTime(b.show?.showDateTime)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <MapPin className="w-4 h-4 text-green-400 shrink-0" />
                  <span>{cinema?.name || 'Rạp'} — {room?.name || 'Phòng'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Ticket className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Ghế: <span className="text-adaptive font-semibold">{seatList}</span></span>
                </div>
                {b.show?.format && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Clock className="w-4 h-4 text-orange-400 shrink-0" />
                    <span>{b.show.format} • {b.show.language}</span>
                  </div>
                )}
              </div>

              {/* Ticket breakdown */}
              {b.tickets?.length > 0 && (
                <div className="bg-white/5 rounded-xl p-4 space-y-2">
                  <h3 className="text-adaptive font-semibold text-sm mb-3">Chi tiết ghế</h3>
                  {b.tickets.map((t) => (
                    <div key={t.seat_id} className="flex justify-between text-sm text-gray-300">
                      <span>{t.seat_id} ({t.seat_type})</span>
                      <span>{formatPrice(t.price)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Divider */}
              <div className="relative flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gray-900 border border-white/10 -ml-9 shrink-0" />
                <div className="flex-1 border-t border-dashed border-white/20" />
                <div className="w-5 h-5 rounded-full bg-gray-900 border border-white/10 -mr-9 shrink-0" />
              </div>

              {/* QR Code */}
              {(b.status === 'confirmed' || b.status === 'completed') && (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs text-gray-400">Xuất trình mã này tại quầy vé</p>
                  <TicketQRCode booking={b} size={180} />
                </div>
              )}

              {/* F&B Section */}
              {b.foods?.length > 0 && (
                <div className="bg-white/5 rounded-xl p-4 space-y-2">
                  <h3 className="text-adaptive font-semibold text-sm mb-3 flex items-center gap-2">
                    🍿 Vật phẩm mua kèm
                  </h3>
                  {b.foods.map((f, idx) => {
                    const name  = f.foodId?.name ?? f.name ?? 'Món ăn';
                    const price = f.priceAtPurchase ?? 0;
                    return (
                      <div key={idx} className="flex justify-between items-center text-sm text-gray-300">
                        <div className="flex items-center gap-2">
                          {f.foodId?.image_url && (
                            <img src={f.foodId.image_url} alt={name}
                              className="w-8 h-8 object-cover rounded-md" />
                          )}
                          <span>{name} <span className="text-gray-500">×{f.quantity}</span></span>
                        </div>
                        <span>{formatPrice(price * f.quantity)}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Total */}
              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-400">Tổng thanh toán</span>
                <span className="text-2xl font-bold text-red-400">{formatPrice(b.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-4">
            {canCancel(b) && (
              <button
                onClick={() => handleCancel(b._id)}
                className="flex-1 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-semibold rounded-full transition-all duration-200"
              >
                Hủy vé
              </button>
            )}
            {b.status === 'cancelled' && (
              <button
                onClick={() => handleDelete(b._id)}
                className="flex-1 py-3 bg-gray-700/40 hover:bg-red-500/20 border border-gray-600/40 hover:border-red-500/40 text-gray-400 hover:text-red-300 font-semibold rounded-full transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Xóa khỏi lịch sử
              </button>
            )}
            <button
              onClick={() => setDetailBooking(null)}
              className="flex-1 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-full transition-all duration-200"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ====== MAIN LIST ======
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 pt-24 pb-12">
      <BlurCircle top="100px" left="0" />
      <BlurCircle bottom="100px" right="0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-adaptive">Lịch Sử Đặt Vé</h1>
          <div className="flex flex-wrap gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm phim hoặc ghế..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-full text-adaptive placeholder-gray-400 focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-full px-4 py-2 text-adaptive focus:outline-none focus:border-red-500 transition-colors"
              >
                <option value="all">Tất cả</option>
                <option value="confirmed">Đã xác nhận</option>
                <option value="cancelled">Đã hủy</option>
                <option value="completed">Hoàn thành</option>
              </select>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-full px-4 py-2 text-adaptive focus:outline-none focus:border-red-500 transition-colors"
            >
              <option value="date_desc">Mới nhất</option>
              <option value="date_asc">Cũ nhất</option>
              <option value="price_desc">Giá cao nhất</option>
              <option value="price_asc">Giá thấp nhất</option>
            </select>
          </div>
        </div>

        {/* Empty state */}
        {paginatedBookings.length === 0 ? (
          <div className="bg-black/20 rounded-2xl border border-white/10 p-12 text-center">
            <Ticket className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-adaptive mb-2">
              Chưa có đặt vé nào
            </h2>
            <p className="text-gray-400 mb-6">
              Hãy bắt đầu đặt vé cho bộ phim yêu thích của bạn!
            </p>
            <button
              onClick={() => navigate('/movies')}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
            >
              Khám phá phim
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {paginatedBookings.map((booking) => {
              const statusBadge = getStatusBadge(booking.status);
              const movie = booking.show?.movie;
              const cinema = booking.show?.cinema;
              const room = booking.show?.room_id;
              const seatList =
                booking.tickets?.map((t) => t.seat_id).join(', ') || '';

              return (
                <div
                  key={booking._id}
                  className="bg-black/20 backdrop-blur-sm rounded-2xl border border-white/10 p-6"
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    {movie?.poster_path && (
                      <img
                        src={`/src/assets/images/posters/${movie.poster_path}`}
                        alt={movie.title}
                        className="w-full md:w-32 h-48 object-cover rounded-lg shadow-md"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-adaptive">
                            {movie?.title || 'Phim không xác định'}
                          </h3>
                          {booking.booking_code && (
                            <p className="text-gray-500 text-sm font-mono mt-1">
                              #{booking.booking_code}
                            </p>
                          )}
                        </div>
                        <div
                          className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadge.class}`}
                        >
                          {statusBadge.label}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-300 mb-6">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-blue-500" />
                          <span>
                            {booking.show?.showDateTime
                              ? new Date(booking.show.showDateTime).toLocaleDateString('vi-VN')
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-5 h-5 text-blue-500" />
                          <span>
                            {booking.show?.showDateTime
                              ? new Date(booking.show.showDateTime).toLocaleTimeString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-green-500" />
                          <span>
                            {cinema?.name || 'Rạp'} -{' '}
                            {room?.name || 'Phòng'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Ticket className="w-5 h-5 text-purple-500" />
                          <span>Ghế: {seatList}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="text-lg font-bold text-red-500">
                          Tổng: {formatPrice(booking.total_amount)}
                        </div>
                        <div className="flex gap-3">
                          {/* QR toggle */}
                          {(booking.status === 'confirmed' || booking.status === 'completed') && (
                            <button
                              onClick={() =>
                                setExpandedQR((prev) =>
                                  prev === booking._id ? null : booking._id
                                )
                              }
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                                expandedQR === booking._id
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                                  : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10'
                              }`}
                              title="Xem mã QR"
                            >
                              <QrCode className="w-4 h-4" />
                              <span className="hidden sm:inline">Mã QR</span>
                              {expandedQR === booking._id
                                ? <ChevronUp className="w-3 h-3" />
                                : <ChevronDown className="w-3 h-3" />}
                            </button>
                          )}

                          {/* ✅ FIX: Dùng setDetailBooking thay vì navigate('/my-booking/:id')
                              Route /my-booking/:id không tồn tại trong App.jsx → 404
                              Giải pháp: hiển thị detail panel ngay trong trang này */}
                          <button
                            onClick={() => setDetailBooking(booking)}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-adaptive transition-colors"
                            title="Xem chi tiết"
                          >
                            <Ticket className="w-5 h-5" />
                          </button>

                          {canCancel(booking) && (
                            <button
                              onClick={() => handleCancel(booking._id)}
                              className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-full text-red-300 transition-colors"
                              title="Hủy vé"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                          {booking.status === 'cancelled' && (
                            <button
                              onClick={() => handleDelete(booking._id)}
                              className="p-2 bg-gray-700/40 hover:bg-red-500/20 rounded-full text-gray-500 hover:text-red-300 transition-colors"
                              title="Xóa khỏi lịch sử"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          )}
                          {canRate(booking) && (
                            <button
                              onClick={() =>
                                toast('Chức năng đánh giá sắp ra mắt!')
                              }
                              className="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 rounded-full text-yellow-300 transition-colors"
                              title="Đánh giá"
                            >
                              <Star className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* QR Code panel */}
                      {expandedQR === booking._id && (
                        <div className="mt-5 pt-5 border-t border-white/10 flex flex-col items-center gap-2 animate-[fadeIn_0.2s_ease-out]">
                          <p className="text-xs text-gray-400 mb-1">Xuất trình mã này tại quầy vé</p>
                          <TicketQRCode booking={booking} size={160} />
                          <style>{`
                            @keyframes fadeIn {
                              from { opacity: 0; transform: translateY(-8px); }
                              to   { opacity: 1; transform: translateY(0); }
                            }
                          `}</style>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-4 py-2 rounded-full transition-colors ${
                  currentPage === i + 1
                    ? 'bg-red-500 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBooking;