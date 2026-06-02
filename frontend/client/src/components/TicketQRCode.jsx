/**
 * TicketQRCode.jsx
 * Component QR code vé điện tử — tái sử dụng được ở mọi màn hình.
 *
 * Props:
 *   booking  {object} — dữ liệu booking từ API (MyBooking / SeatLayout success)
 *   show     {object} — (tuỳ chọn) nếu booking chưa populate show, truyền riêng
 *   seats    {string[]} — (tuỳ chọn) danh sách ghế khi từ SeatLayout
 *   total    {number}  — (tuỳ chọn) tổng tiền khi từ SeatLayout
 *   size     {number}  — kích thước QR (px), mặc định 180
 */
import React, { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode } from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (price) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(price ?? 0);

const fmtDateTime = (dt) => {
  if (!dt) return 'N/A';
  const d = new Date(dt);
  return `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} — ${d.toLocaleDateString('vi-VN')}`;
};

// ── Component ─────────────────────────────────────────────────────────────────
const TicketQRCode = ({ booking, show: showProp, seats: seatsProp, total: totalProp, size = 180 }) => {
  // Hỗ trợ 2 nguồn dữ liệu:
  //   A) Từ MyBooking  → booking object đã populate đầy đủ
  //   B) Từ SeatLayout → booking + showProp + seatsProp + totalProp riêng lẻ
  const show    = showProp  ?? booking?.show;
  const seats   = seatsProp ?? booking?.tickets?.map((t) => t.seat_id) ?? [];
  const total   = totalProp ?? booking?.total_amount ?? 0;

  // Lấy thông tin user từ localStorage (client luôn có sau khi login)
  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); }
    catch { return {}; }
  }, []);

  // ── Dữ liệu nhúng vào QR ─────────────────────────────────────────────────
  const qrPayload = useMemo(() => {
    // Chuẩn hoá foods từ booking (mảng foodItemSchema đã populate)
    const foods = booking?.foods?.length
      ? booking.foods.map((f) => ({
          name:     f.foodId?.name     ?? f.name     ?? 'Món ăn',
          quantity: f.quantity,
          price:    f.priceAtPurchase  ?? 0,
        }))
      : [];

    const payload = {
      ticket_code:      booking?.booking_code ?? booking?._id ?? 'N/A',
      seats:            seats.join(', '),
      show_datetime:    show?.showDateTime ?? null,
      room:             show?.room?.name   ?? show?.room_id?.name ?? 'N/A',
      theater:          show?.cinema?.name ?? 'N/A',
      movie:            show?.movie?.title ?? 'N/A',
      total_amount:     total,
      payment_method:   booking?.payment_method ?? 'N/A',
      booked_at:        booking?.createdAt       ?? booking?.created_at ?? new Date().toISOString(),
      foods,   // ← thêm danh sách F&B
      customer: {
        name:  currentUser.name  ?? 'N/A',
        email: currentUser.email ?? 'N/A',
        phone: currentUser.phone ?? 'N/A',
      },
    };
    return JSON.stringify(payload);
  }, [booking, show, seats, total, currentUser]);

  const ticketCode = booking?.booking_code ?? booking?._id ?? '';

  return (
    <div className="flex flex-col items-center gap-3">
      {/* QR Card */}
      <div className="
        relative p-4 rounded-2xl
        bg-white/5 backdrop-blur-md
        border border-white/15
        shadow-xl shadow-black/40
        flex flex-col items-center gap-3
      ">
        {/* Decorative top bar */}
        <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />

        {/* Header label */}
        <div className="flex items-center gap-1.5 text-red-400 text-xs font-semibold tracking-widest uppercase">
          <QrCode className="w-3.5 h-3.5" />
          <span>Vé điện tử</span>
        </div>

        {/* QR Code — nền trắng để máy quét nhận diện dễ hơn */}
        <div className="p-3 bg-white rounded-xl shadow-md">
          <QRCodeSVG
            value={qrPayload}
            size={size}
            level="M"
            imageSettings={{
              src: '/logo-icon.png',  // logo nhỏ ở giữa (tuỳ chọn, bỏ nếu chưa có file)
              height: 28,
              width: 28,
              excavate: true,
            }}
          />
        </div>

        {/* Ticket code */}
        {ticketCode && (
          <p className="text-xs text-gray-400 tracking-wider">
            Mã vé:{' '}
            <span className="text-yellow-400 font-mono font-semibold">
              #{ticketCode}
            </span>
          </p>
        )}

        {/* Scan hint */}
        <p className="text-[10px] text-gray-500 text-center max-w-[160px] leading-relaxed">
          Nhân viên quét mã để xác nhận vé
        </p>

        {/* Decorative bottom bar */}
        <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />
      </div>
    </div>
  );
};

export default TicketQRCode;
