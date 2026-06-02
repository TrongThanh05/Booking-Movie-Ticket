/**
 * pages/VnpayReturn.jsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Trang xử lý Return URL từ VNPAY.
 *
 * VNPAY redirect về: /vnpay/return?vnp_ResponseCode=00&vnp_TxnRef=BK-XXXX&...
 *
 * Luồng:
 *   1. Đọc tham số query từ URL
 *   2. Kiểm tra thời gian giữ ghế còn hiệu lực không (phòng vệ frontend)
 *   3. Polling GET /api/vnpay/booking-status/:bookingCode để lấy trạng thái
 *      (vì IPN server-to-server có thể đến trước hoặc sau Return URL)
 *   4. Nếu paid      → hiển thị màn hình thành công
 *   5. Nếu failed    → toast lỗi → navigate về trang SeatLayout (bước confirm)
 *   6. Nếu timeout   → toast lỗi hết giờ → navigate về SeatLayout (bước select)
 */

import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate }        from 'react-router-dom';
import { Check, AlertTriangle, Loader2, Tag }  from 'lucide-react';
import { getVnpayBookingStatus, releaseVnpaySeats, confirmVnpayReturn } from '../lib/api';
import BlurCircle                              from '../components/BlurCircle';
import TicketQRCode                            from '../components/TicketQRCode';
import toast                                   from 'react-hot-toast';

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatPrice = (price) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(price);

const formatDate = (date) =>
  new Date(date).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const formatTime = (dateStr) =>
  new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

// Polling tối đa 15 lần, mỗi 2s (chờ IPN xử lý xong — tổng 30s)
const MAX_POLL  = 15;
const POLL_DELAY = 2000;

// ── Component ─────────────────────────────────────────────────────────────────
const VnpayReturn = () => {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();

  const [stage, setStage]           = useState('checking'); // 'checking' | 'success' | 'failed' | 'timeout'
  const [bookingData, setBookingData] = useState(null);
  const pollCountRef = useRef(0);

  // ── Lấy context từ sessionStorage (lưu bởi SeatLayout trước khi redirect) ──
  const vnpayContext = (() => {
    try { return JSON.parse(sessionStorage.getItem('vnpay_context') || 'null'); }
    catch { return null; }
  })();

  const vnp_ResponseCode = searchParams.get('vnp_ResponseCode');
  // vnp_TxnRef = booking_code — fallback sang sessionStorage nếu URL thiếu tham số
  const vnp_TxnRef = searchParams.get('vnp_TxnRef') || vnpayContext?.booking_code || null;

  // ── Hàm nhả ghế và navigate về trang chọn ghế sạch ─────────────────────
  const releaseAndGoBack = async (bookingCode, ctx, reason = 'Thanh toán không thành công') => {
    // 1. Gọi backend nhả ghế ngay lập tức (không chờ IPN)
    if (bookingCode) {
      try { await releaseVnpaySeats(bookingCode); }
      catch (e) { console.warn('[VnpayReturn] release-seats error:', e.message); }
    }
    // 2. Dọn sessionStorage
    sessionStorage.removeItem('vnpay_context');
    // 3. Thông báo
    toast.error(reason, { duration: 4000 });
    // 4. Chuyển về trang chọn ghế (step 'select') — reload sạch seat map
    if (ctx?.movieId && ctx?.showId) {
      navigate(`/movies/book/${ctx.movieId}/${ctx.showId}`, { replace: true });
    } else {
      navigate('/movies', { replace: true });
    }
  };

  // ── Main effect ───────────────────────────────────────────────────────────
  useEffect(() => {
    const run = async () => {
      // ── Bước 1: Nếu VNPAY trả responseCode !== '00' → hủy, nhả ghế ngay ──
      if (vnp_ResponseCode && vnp_ResponseCode !== '00') {
        const reason = vnp_ResponseCode === '24'
          ? 'Bạn đã hủy thanh toán. Ghế đã được giải phóng.'
          : 'Thanh toán không thành công. Ghế đã được giải phóng.';
        await releaseAndGoBack(vnp_TxnRef, vnpayContext, reason);
        return;
      }

      if (!vnp_TxnRef) {
        await releaseAndGoBack(null, vnpayContext, 'Không tìm thấy thông tin đơn hàng.');
        return;
      }

      // ── Bước 2: vnp_ResponseCode === '00' → gọi confirm-return backend ────
      // Gửi toàn bộ params vnp_* từ URL lên backend để backend xác thực chữ ký
      // và xác nhận booking. Cách này không cần chờ IPN (hoạt động trên localhost).
      if (vnp_ResponseCode === '00') {
        try {
          // Thu thập tất cả query params vnp_* từ URL hiện tại
          const vnpParams = {};
          searchParams.forEach((value, key) => {
            if (key.startsWith('vnp_')) vnpParams[key] = value;
          });

          const res = await confirmVnpayReturn(vnpParams);
          if (res.data?.success && res.data?.booking) {
            sessionStorage.removeItem('vnpay_context');
            setBookingData(res.data.booking);
            setStage('success');
            toast.success('Thanh toán thành công! 🎉');
            return;
          }
        } catch (confirmErr) {
          // confirm-return thất bại → fallback sang polling IPN
          console.warn('[VnpayReturn] confirm-return failed, fallback to polling:', confirmErr.message);
        }
      }

      // ── Bước 3: Fallback — polling booking-status (chờ IPN) ───────────────
      const poll = async () => {
        try {
          const res  = await getVnpayBookingStatus(vnp_TxnRef);
          const data = res.data;

          if (data.payment_status === 'paid') {
            sessionStorage.removeItem('vnpay_context');
            setBookingData(data.booking);
            setStage('success');
            toast.success('Thanh toán thành công! 🎉');

          } else if (['failed', 'refunded', 'cancelled'].includes(data.payment_status) ||
                     data.status === 'cancelled') {
            sessionStorage.removeItem('vnpay_context');
            const reason = data.payment_status === 'refunded'
              ? 'Ghế đã hết thời gian giữ trong lúc thanh toán. Tiền sẽ được hoàn lại.'
              : 'Thanh toán không thành công. Ghế đã được giải phóng.';
            toast.error(reason, { duration: 5000 });
            if (vnpayContext?.movieId && vnpayContext?.showId) {
              navigate(`/movies/book/${vnpayContext.movieId}/${vnpayContext.showId}`, { replace: true });
            } else {
              navigate('/movies', { replace: true });
            }

          } else {
            pollCountRef.current += 1;
            if (pollCountRef.current < MAX_POLL) {
              setTimeout(poll, POLL_DELAY);
            } else {
              await releaseAndGoBack(
                vnp_TxnRef,
                vnpayContext,
                'Không thể xác nhận thanh toán. Vui lòng kiểm tra lịch sử đặt vé.'
              );
            }
          }
        } catch (err) {
          console.error('[VnpayReturn] poll error:', err);
          pollCountRef.current += 1;
          if (pollCountRef.current < MAX_POLL) {
            setTimeout(poll, POLL_DELAY);
          } else {
            await releaseAndGoBack(vnp_TxnRef, vnpayContext, 'Lỗi xác nhận thanh toán. Ghế đã được giải phóng.');
          }
        }
      };

      poll();
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── User (dùng cho màn hình success) ─────────────────────────────────────
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  })();

  // ─── RENDER: Checking / Loading ─────────────────────────────────────────────
  if (stage === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-14 h-14 text-red-500 mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold text-white mb-2">Đang xác nhận thanh toán...</h2>
          <p className="text-gray-400 text-sm">Vui lòng không tắt trang này</p>
        </div>
      </div>
    );
  }

  // ─── RENDER: SUCCESS — hiển thị thông tin vé ────────────────────────────────
  const show     = bookingData?.show;
  const seats    = bookingData?.seat_ids || [];
  const discount = bookingData?.discount_amount || 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 pt-24 pb-16 flex items-center justify-center">
      <BlurCircle top="80px" left="0" />
      <BlurCircle bottom="80px" right="0" />

      <div className="relative z-10 w-full max-w-lg mx-auto px-4">
        {/* Badge thành công */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/40 mb-4">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-1">Đặt vé thành công!</h2>
          <p className="text-gray-400 text-sm">Cảm ơn bạn đã đặt vé tại TCineBook 🎬</p>
        </div>

        {/* Ticket card */}
        <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="h-1 w-full bg-gradient-to-r from-red-500 via-pink-500 to-red-600" />

          <div className="p-6 space-y-5">
            {/* Movie info */}
            <div className="flex items-start gap-4">
              {show?.movie?.poster_path && (
                <img
                  src={`/src/assets/images/posters/${show.movie.poster_path}`}
                  alt={show.movie?.title}
                  className="w-16 h-24 object-cover rounded-lg shadow-md shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-lg leading-tight mb-1 truncate">{show?.movie?.title}</h3>
                {bookingData?.booking_code && (
                  <p className="text-yellow-400 font-mono text-sm font-semibold mb-2">#{bookingData.booking_code}</p>
                )}
                <div className="space-y-1 text-sm text-gray-300">
                  <p>🕐 {show?.showDateTime ? `${formatTime(show.showDateTime)} — ${formatDate(show.showDateTime)}` : '—'}</p>
                  <p>📍 {show?.cinema?.name} · {show?.room?.name}</p>
                  <p>🎟️ Ghế: <span className="text-white font-medium">{seats.join(', ')}</span></p>
                  <p>👤 {user.name || 'Khách'}</p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="relative flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-gray-900 border border-white/10 -ml-9 shrink-0" />
              <div className="flex-1 border-t border-dashed border-white/20" />
              <div className="w-5 h-5 rounded-full bg-gray-900 border border-white/10 -mr-9 shrink-0" />
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center">
              <TicketQRCode
                booking={bookingData}
                show={show}
                seats={seats}
                total={bookingData?.total_amount}
                size={160}
              />
            </div>

            {/* Divider */}
            <div className="relative flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-gray-900 border border-white/10 -ml-9 shrink-0" />
              <div className="flex-1 border-t border-dashed border-white/20" />
              <div className="w-5 h-5 rounded-full bg-gray-900 border border-white/10 -mr-9 shrink-0" />
            </div>

            {/* Total + Voucher */}
            <div className="space-y-1.5">
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-400">
                  <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> Voucher đã áp dụng:</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Tổng thanh toán</span>
                <span className="text-2xl font-bold text-red-400">{formatPrice(bookingData?.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-gray-500 text-xs mt-4 leading-relaxed">
          Vé điện tử đã được gửi về email của bạn.<br />
          Vui lòng có mặt tại rạp ít nhất <strong className="text-gray-400">15 phút</strong> trước giờ chiếu.
        </p>

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
};

export default VnpayReturn;
