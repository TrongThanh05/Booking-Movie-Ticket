import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Check,
  Users,
  Crown,
  Heart as HeartIcon,
  Timer,
  AlertTriangle,
} from 'lucide-react';
import BlurCircle from '../components/BlurCircle';
import TicketQRCode from '../components/TicketQRCode';
import { getSeatMap, lockSeats, unlockSeats, createBooking } from '../lib/api';
import toast from 'react-hot-toast';

const LOCK_DURATION_MS = 10 * 60 * 1000; // 10 phút

const SeatLayout = () => {
  const { movieId, showId } = useParams();
  const navigate = useNavigate();

  // ====== State ======
  const [seatMapData, setSeatMapData] = useState(null); // API response
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookingStep, setBookingStep] = useState('select'); // 'select' | 'confirm' | 'payment' | 'success'
  const [lockError, setLockError] = useState(null);
  const [countdown, setCountdown] = useState(null); // seconds remaining
  const [bookingResult, setBookingResult] = useState(null);

  const countdownRef = useRef(null);
  const lockExpireRef = useRef(null);

  // ====== Lấy user từ localStorage (tạm thời) ======
  const getCurrentUserId = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user._id || 'guest_user';
  };

  // ====== Fetch seat-map từ API ======
  const fetchSeatMap = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getSeatMap(showId);
      setSeatMapData(response.data);
    } catch (err) {
      console.error('Error fetching seat map:', err);
      setError('Không thể tải sơ đồ ghế. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [showId]);

  useEffect(() => {
    fetchSeatMap();
    return () => {
      // Cleanup timer khi unmount
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [fetchSeatMap]);

  // ====== Derived data từ API response ======
  const show = seatMapData?.show;
  const seatMap = seatMapData?.seat_map || [];

  // Tạo lookup map: seat_id -> seat info (type, price, status)
  const seatLookup = {};
  for (const rowData of seatMap) {
    for (const seat of rowData.seats) {
      seatLookup[seat.seat_id] = seat;
    }
  }

  // ====== Seat interaction ======
  const handleSeatClick = (seatId) => {
    const seat = seatLookup[seatId];
    if (!seat || seat.status !== 'available') return;

    if (selectedSeats.includes(seatId)) {
      setSelectedSeats((prev) => prev.filter((s) => s !== seatId));
    } else {
      if (selectedSeats.length >= 8) {
        toast.error('Bạn chỉ có thể chọn tối đa 8 ghế trong một lần đặt');
        return;
      }
      setSelectedSeats((prev) => [...prev, seatId]);
    }
  };

  // ====== Price helpers (từ API data, không hardcode) ======
  const getSeatPrice = (seatId) => {
    return seatLookup[seatId]?.price || 0;
  };

  const getSeatType = (seatId) => {
    return seatLookup[seatId]?.type || 'regular';
  };

  const getSeatTypeLabel = (type) => {
    const labels = { regular: 'Thường', vip: 'VIP', couple: 'Đôi' };
    return labels[type] || 'Thường';
  };

  const calculateTotal = () => {
    return selectedSeats.reduce((total, seatId) => total + getSeatPrice(seatId), 0);
  };

  // ====== Format helpers ======
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCountdown = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ====== Countdown timer (10 phút giữ ghế) ======
  const startCountdown = () => {
    const totalSeconds = Math.floor(LOCK_DURATION_MS / 1000);
    setCountdown(totalSeconds);
    lockExpireRef.current = Date.now() + LOCK_DURATION_MS;

    countdownRef.current = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((lockExpireRef.current - Date.now()) / 1000),
      );
      setCountdown(remaining);

      if (remaining <= 0) {
        clearInterval(countdownRef.current);
        toast.error('Hết thời gian giữ ghế! Vui lòng chọn lại.');
        // Reset về bước chọn ghế
        setBookingStep('select');
        setSelectedSeats([]);
        setCountdown(null);
        fetchSeatMap(); // Reload seat map
      }
    }, 1000);
  };

  // ====== Bước 1→2: Lock ghế ======
  const handleContinue = async () => {
    if (selectedSeats.length === 0) {
      toast.error('Vui lòng chọn ít nhất một ghế');
      return;
    }

    const userId = getCurrentUserId();
    setLockError(null);

    try {
      await lockSeats(showId, selectedSeats, userId);
      toast.success('Ghế đã được giữ trong 10 phút!');
      setBookingStep('confirm');
      startCountdown();
    } catch (err) {
      if (err.response?.status === 409) {
        const conflicts = err.response.data.conflict_seats || [];
        setLockError(`Ghế ${conflicts.join(', ')} đã có người chọn. Vui lòng chọn ghế khác.`);
        toast.error('Một số ghế đã có người chọn!');
        // Refresh seat map
        fetchSeatMap();
        // Deselect conflict seats
        setSelectedSeats((prev) => prev.filter((s) => !conflicts.includes(s)));
      } else {
        toast.error('Lỗi khi giữ ghế. Vui lòng thử lại.');
      }
    }
  };

  // ====== Bước 2→3: Thanh toán ======

  /** Chuẩn hóa seat_type để khớp enum Backend: 'regular' | 'vip' | 'couple' */
  const normalizeSeatType = (raw) => {
    const map = { standard: 'regular', regular: 'regular', vip: 'vip', couple: 'couple' };
    return map[(raw || '').toLowerCase()] || 'regular';
  };

  const handlePayment = async () => {
    setBookingStep('payment');
    const userId = getCurrentUserId();

    try {
      const tickets = selectedSeats.map((seatId) => ({
        seat_id:   seatId,
        seat_type: normalizeSeatType(getSeatType(seatId)), // ← chuẩn hóa
        price:     getSeatPrice(seatId),
      }));

      // POST /api/bookings:
      //   → Kiểm tra concurrency (booked_seats)
      //   → Kiểm tra lock còn hiệu lực (hold_until > now)
      //   → $addToSet booked_seats + $pull reserved_seats  (atomic Transaction)
      //   → Tạo Booking document
      const response = await createBooking({
        user_id:        userId,
        show_id:        showId,
        tickets,
        total_amount:   calculateTotal(),
        payment_method: 'VNPAY',
      });

      // Dừng countdown
      if (countdownRef.current) clearInterval(countdownRef.current);
      setCountdown(null);

      setBookingResult(response.data.booking ?? response.data);
      setBookingStep('success');
      toast.success('Đặt vé thành công!');

    } catch (err) {
      console.error('Payment error:', err);

      if (err.response?.status === 409) {
        const conflicts = err.response.data?.conflict_seats || [];
        toast.error(`Ghế ${conflicts.join(', ')} vừa được người khác đặt. Hãy chọn lại!`);
        setSelectedSeats((prev) => prev.filter((s) => !conflicts.includes(s)));
        fetchSeatMap();
        setBookingStep('select');
      } else if (err.response?.status === 400) {
        toast.error(err.response.data?.message || 'Phiên giữ ghế đã hết hạn. Vui lòng chọn lại.');
        setSelectedSeats([]);
        fetchSeatMap();
        setBookingStep('select');
      } else {
        toast.error(err.response?.data?.message || 'Thanh toán thất bại');
        setBookingStep('confirm');
      }
    }
  };

  // ====== Hủy giữ ghế khi quay lại ======
  const handleBackToSelect = async () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(null);

    const userId = getCurrentUserId();
    try {
      await unlockSeats(showId, selectedSeats, userId);
    } catch (err) {
      console.error('Unlock error:', err);
    }
    setBookingStep('select');
    fetchSeatMap(); // Refresh
  };

  // ====== Seat CSS class (dựa trên type + status từ API) ======
  const getSeatClass = (seat, isSelected) => {
    const base =
      'w-8 h-8 rounded-sm cursor-pointer transition-all duration-200 flex items-center justify-center text-xs font-bold hover:scale-110 ';

    // Đã thanh toán (booked) HOẶC đang bị giữ bởi người khác (locked)
    if (seat.status === 'booked' || seat.status === 'locked') {
      return base + 'bg-red-500 text-white cursor-not-allowed opacity-70';
    }
    if (isSelected) {
      return base + 'bg-blue-500 text-white shadow-lg shadow-blue-500/40';
    }
    switch (seat.type) {
      case 'vip':
        return base + 'bg-yellow-500/20 border border-yellow-500 text-yellow-300 hover:bg-yellow-500/40';
      case 'couple':
        return base + 'bg-pink-500/20 border border-pink-500 text-pink-300 hover:bg-pink-500/40';
      default: // regular
        return base + 'bg-gray-600 text-white hover:bg-gray-500';
    }
  };

  // ====== Tìm thông tin giá theo type (cho Pricing Info cards) ======
  const getPriceByType = (type) => {
    // Tìm bất kỳ seat nào có type này để lấy price từ seatLookup
    const seat = Object.values(seatLookup).find((s) => s.type === type);
    if (seat) return seat.price;
    // fallback: dùng price_multiplier từ rowData nếu có
    const rowData = seatMap.find((r) => r.type === type);
    if (!rowData || !show) return 0;
    return Math.round(show.base_price * (rowData.price_multiplier ?? 1));
  };

  // ====== RENDER ======

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 pt-24 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-adaptive text-lg">Đang tải sơ đồ rạp...</p>
        </div>
      </div>
    );
  }

  if (error || !seatMapData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 pt-24 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-adaptive text-2xl font-bold mb-4">
            {error || 'Không tìm thấy thông tin'}
          </h2>
          <button
            onClick={() => navigate('/movies')}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
          >
            Quay lại danh sách phim
          </button>
        </div>
      </div>
    );
  }

  // ====== SUCCESS SCREEN ======
  if (bookingStep === 'success') {
    const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 pt-24 pb-16 flex items-center justify-center">
        <BlurCircle top="80px" left="0" />
        <BlurCircle bottom="80px" right="0" />

        <div className="relative z-10 w-full max-w-lg mx-auto px-4">
          {/* Success badge */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/40 mb-4">
              <Check className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-adaptive mb-1">Đặt vé thành công!</h2>
            <p className="text-gray-400 text-sm">Cảm ơn bạn đã đặt vé tại TCineBook 🎬</p>
          </div>

          {/* Ticket card */}
          <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            {/* Gradient top bar */}
            <div className="h-1 w-full bg-gradient-to-r from-red-500 via-pink-500 to-red-600" />

            <div className="p-6 space-y-5">
              {/* Movie info */}
              <div className="flex items-start gap-4">
                {show.movie?.poster_path && (
                  <img
                    src={`/src/assets/images/posters/${show.movie.poster_path}`}
                    alt={show.movie.title}
                    className="w-16 h-24 object-cover rounded-lg shadow-md shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-adaptive font-bold text-lg leading-tight mb-1 truncate">{show.movie?.title}</h3>
                  {bookingResult?.booking_code && (
                    <p className="text-yellow-400 font-mono text-sm font-semibold mb-2">#{bookingResult.booking_code}</p>
                  )}
                  <div className="space-y-1 text-sm text-gray-300">
                    <p>🕐 {formatTime(show.showDateTime)} — {formatDate(show.showDateTime)}</p>
                    <p>📍 {show.cinema?.name} · {show.room?.name}</p>
                    <p>🎟️ Ghế: <span className="text-adaptive font-medium">{selectedSeats.join(', ')}</span></p>
                    <p>👤 {user.name || 'Khách'}</p>
                  </div>
                </div>
              </div>

              {/* Divider dạng perforated */}
              <div className="relative flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gray-900 border border-white/10 -ml-9 shrink-0" />
                <div className="flex-1 border-t border-dashed border-white/20" />
                <div className="w-5 h-5 rounded-full bg-gray-900 border border-white/10 -mr-9 shrink-0" />
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center">
                <TicketQRCode
                  booking={bookingResult}
                  show={show}
                  seats={selectedSeats}
                  total={calculateTotal()}
                  size={160}
                />
              </div>

              {/* Divider */}
              <div className="relative flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gray-900 border border-white/10 -ml-9 shrink-0" />
                <div className="flex-1 border-t border-dashed border-white/20" />
                <div className="w-5 h-5 rounded-full bg-gray-900 border border-white/10 -mr-9 shrink-0" />
              </div>

              {/* Total */}
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Tổng thanh toán</span>
                <span className="text-2xl font-bold text-red-400">{formatPrice(calculateTotal())}</span>
              </div>
            </div>
          </div>

          {/* Note */}
          <p className="text-center text-gray-500 text-xs mt-4 leading-relaxed">
            Vé điện tử đã được gửi về email của bạn.<br />
            Vui lòng có mặt tại rạp ít nhất <strong className="text-gray-400">15 phút</strong> trước giờ chiếu.
          </p>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => navigate('/my-booking')}
              className="flex-1 py-3 border border-white/20 hover:border-white/40 text-gray-300 hover:text-white font-semibold rounded-full transition-all duration-200"
            >
              Lịch sử vé
            </button>
            <button
              onClick={() => navigate('/movies')}
              className="flex-1 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-full shadow-lg shadow-red-500/30 transition-all duration-200"
            >
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ====== MAIN LAYOUT ======
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 pt-24 pb-12">
      <BlurCircle top="100px" left="0" />
      <BlurCircle bottom="100px" right="0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(`/movies/${movieId}`)}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-adaptive">
              {show.movie?.title}
            </h1>
            <p className="text-gray-400 flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDate(show.showDateTime)} - {formatTime(show.showDateTime)}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {show.cinema?.name} - {show.room?.name}
              </span>
            </p>
          </div>
        </div>

        {/* Countdown banner */}
        {countdown !== null && (
          <div
            className={`mb-6 p-4 rounded-xl border flex items-center justify-center gap-3 ${
              countdown <= 60
                ? 'bg-red-500/20 border-red-500 text-red-300'
                : 'bg-yellow-500/10 border-yellow-500/50 text-yellow-300'
            }`}
          >
            <Timer className="w-5 h-5" />
            <span className="font-semibold">
              Thời gian giữ ghế còn lại:{' '}
              <span className="font-mono text-lg">
                {formatCountdown(countdown)}
              </span>
            </span>
          </div>
        )}

        {/* Lock error */}
        {lockError && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/50 text-red-300">
            <p>{lockError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Seat Selection Area */}
          <div className="lg:col-span-3">
            <div className="bg-black/20 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
              {bookingStep === 'select' && (
                <>
                  {/* Screen */}
                  <div className="mb-8 text-center">
                    <div className="w-full max-w-4xl mx-auto h-2 bg-gradient-to-r from-transparent via-white to-transparent rounded-full mb-3"></div>
                    <p className="text-gray-400 text-sm font-medium">
                      MÀN HÌNH CHIẾU
                    </p>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap justify-center gap-4 mb-8 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-600 rounded-sm" />
                      <span className="text-gray-300">Trống (Thường)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded-sm opacity-70" />
                      <span className="text-gray-300">Đã đặt / Đang giữ</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-500 rounded-sm" />
                      <span className="text-gray-300">Đang chọn</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-yellow-500 rounded-sm" />
                      <span className="text-gray-300">VIP</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-pink-500 rounded-sm" />
                      <span className="text-gray-300">Ghế đôi</span>
                    </div>
                  </div>

                  {/* Seats - render từ API data */}
                  <div className="space-y-4">
                    {seatMap.map((rowData) => {
                      const columns = show.room?.columns || 14;
                      const halfCols = Math.floor(columns / 2);

                      return (
                        <div
                          key={rowData.row}
                          className="flex justify-center items-center gap-2"
                        >
                          <div className="w-8 text-center text-gray-300 font-semibold text-sm">
                            {rowData.row}
                          </div>
                          <div className="flex gap-1">
                            {/* Left section */}
                            {rowData.seats
                              .filter((s) => s.col <= halfCols)
                              .map((seat) => {
                                const isSelected = selectedSeats.includes(
                                  seat.seat_id,
                                );
                                return (
                                  <div
                                    key={seat.seat_id}
                                    className={getSeatClass(seat, isSelected)}
                                    onClick={() =>
                                      handleSeatClick(seat.seat_id)
                                    }
                                    title={`${seat.seat_id} - ${getSeatTypeLabel(seat.type)} - ${formatPrice(seat.price)}`}
                                  >
                                    {seat.col}
                                  </div>
                                );
                              })}

                            {/* Aisle */}
                            <div className="w-6"></div>

                            {/* Right section */}
                            {rowData.seats
                              .filter((s) => s.col > halfCols)
                              .map((seat) => {
                                const isSelected = selectedSeats.includes(
                                  seat.seat_id,
                                );
                                return (
                                  <div
                                    key={seat.seat_id}
                                    className={getSeatClass(seat, isSelected)}
                                    onClick={() =>
                                      handleSeatClick(seat.seat_id)
                                    }
                                    title={`${seat.seat_id} - ${getSeatTypeLabel(seat.type)} - ${formatPrice(seat.price)}`}
                                  >
                                    {seat.col}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pricing Info - từ API data */}
                  <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {seatMap.some((r) => r.type === 'regular') && (
                      <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                        <Users className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">Ghế thường</p>
                        <p className="text-adaptive font-bold">
                          {formatPrice(getPriceByType('regular'))}
                        </p>
                      </div>
                    )}
                    {seatMap.some((r) => r.type === 'vip') && (
                      <div className="bg-yellow-800/50 rounded-xl p-4 text-center">
                        <Crown className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">Ghế VIP</p>
                        <p className="text-adaptive font-bold">
                          {formatPrice(getPriceByType('vip'))}
                        </p>
                      </div>
                    )}
                    {seatMap.some((r) => r.type === 'couple') && (
                      <div className="bg-pink-800/50 rounded-xl p-4 text-center">
                        <HeartIcon className="w-6 h-6 text-pink-400 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">Ghế đôi</p>
                        <p className="text-adaptive font-bold">
                          {formatPrice(getPriceByType('couple'))}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {bookingStep === 'confirm' && (
                <div className="text-center py-12">
                  <h3 className="text-2xl font-bold text-adaptive mb-8">
                    Xác nhận thông tin đặt vé
                  </h3>
                  <div className="max-w-md mx-auto bg-gray-800/50 rounded-xl p-6 space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Phim:</span>
                      <span className="text-adaptive font-semibold">
                        {show.movie?.title}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Ngày giờ:</span>
                      <span className="text-adaptive">
                        {formatDate(show.showDateTime)} -{' '}
                        {formatTime(show.showDateTime)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Rạp:</span>
                      <span className="text-adaptive">
                        {show.cinema?.name} - {show.room?.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Ghế:</span>
                      <span className="text-adaptive font-semibold">
                        {selectedSeats.join(', ')}
                      </span>
                    </div>
                    <div className="border-t border-gray-600 pt-4">
                      <div className="flex justify-between text-lg">
                        <span className="text-gray-400">Tổng tiền:</span>
                        <span className="text-red-500 font-bold">
                          {formatPrice(calculateTotal())}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {bookingStep === 'payment' && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-500 mx-auto mb-6"></div>
                  <h3 className="text-2xl font-bold text-adaptive mb-4">
                    Đang xử lý thanh toán...
                  </h3>
                  <p className="text-gray-400">
                    Vui lòng không tắt trang web trong quá trình thanh toán
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Booking Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-black/20 backdrop-blur-sm rounded-2xl border border-white/10 p-6 sticky top-24">
              <h3 className="text-xl font-bold text-adaptive mb-6">
                Thông tin đặt vé
              </h3>

              <div className="space-y-4 mb-6">
                <div className="flex gap-3">
                  {show.movie?.poster_path && (
                    <img
                      src={`/src/assets/images/posters/${show.movie.poster_path}`}
                      alt={show.movie.title}
                      className="w-16 h-24 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold text-adaptive text-sm mb-1">
                      {show.movie?.title}
                    </h4>
                    <p className="text-gray-400 text-xs">
                      {show.cinema?.name}
                    </p>
                    <p className="text-gray-400 text-xs">{show.room?.name}</p>
                    <p className="text-gray-400 text-xs mt-1">
                      {show.format} • {show.language}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Ngày:</span>
                    <span className="text-adaptive">
                      {new Date(show.showDateTime).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Giờ:</span>
                    <span className="text-adaptive">
                      {formatTime(show.showDateTime)}
                    </span>
                  </div>
                </div>
              </div>

              {selectedSeats.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-adaptive font-semibold mb-3">
                    Ghế đã chọn:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedSeats.map((seat) => (
                      <span
                        key={seat}
                        className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm"
                      >
                        {seat}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 space-y-2 text-sm">
                    {selectedSeats.map((seatId) => {
                      const type = getSeatType(seatId);
                      const price = getSeatPrice(seatId);
                      return (
                        <div
                          key={seatId}
                          className="flex justify-between text-gray-300"
                        >
                          <span>
                            {seatId} ({getSeatTypeLabel(type)})
                          </span>
                          <span>{formatPrice(price)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-600 pt-4">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-gray-400">Tổng tiền:</span>
                  <span className="text-2xl font-bold text-red-500">
                    {formatPrice(calculateTotal())}
                  </span>
                </div>

                {bookingStep === 'select' && (
                  <button
                    onClick={handleContinue}
                    disabled={selectedSeats.length === 0}
                    className="w-full py-3 bg-red-500 hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-full transition-colors"
                  >
                    {selectedSeats.length === 0
                      ? 'Chọn ghế để tiếp tục'
                      : 'Tiếp tục'}
                  </button>
                )}

                {bookingStep === 'confirm' && (
                  <div className="space-y-3">
                    <button
                      onClick={handlePayment}
                      className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-full transition-colors"
                    >
                      Thanh toán
                    </button>
                    <button
                      onClick={handleBackToSelect}
                      className="w-full py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-full transition-colors"
                    >
                      Quay lại
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeatLayout;