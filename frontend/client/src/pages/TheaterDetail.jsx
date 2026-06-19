import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin, Phone, Mail, Clock, Ticket, Loader2,
  ArrowLeft, Star, Wifi, Coffee, Car, Volume2,
  Monitor, Zap, Shield, Building2,
  Users, ExternalLink,
} from 'lucide-react';
import BlurCircle from '../components/BlurCircle';
import { getTheaterById } from '../lib/api';

// ─── Mock data dùng khi chưa có API thật ───────────────────────────────────
// Xóa / comment block này khi API đã sẵn sàng.
const MOCK_THEATER = null; // set = null để dùng API thật

// Ánh xạ tên tiện ích → icon Lucide
const AMENITY_ICONS = {
  'IMAX':       <Monitor className="w-4 h-4" />,
  '4DX':        <Zap     className="w-4 h-4" />,
  'Dolby':      <Volume2 className="w-4 h-4" />,
  'Snack Bar':  <Coffee  className="w-4 h-4" />,
  'WiFi':       <Wifi    className="w-4 h-4" />,
  'Parking':    <Car     className="w-4 h-4" />,
  'Security':   <Shield  className="w-4 h-4" />,
};

// Tạo Google Maps Embed URL từ địa chỉ
const buildMapUrl = (theater) => {
  if (theater?.lat && theater?.lng) {
    return `https://maps.google.com/maps?q=${theater.lat},${theater.lng}&z=16&output=embed`;
  }
  // fallback: tìm kiếm theo tên + địa chỉ
  const query = encodeURIComponent(`${theater?.name} ${theater?.address || theater?.location}`);
  return `https://maps.google.com/maps?q=${query}&z=16&output=embed`;
};

// ─── Component chính ────────────────────────────────────────────────────────
const TheaterDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [theater, setTheater] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Fetch thông tin rạp
  const fetchTheater = useCallback(async () => {
    try {
      setLoading(true);
      if (MOCK_THEATER) {
        setTheater(MOCK_THEATER);
      } else {
        const res = await getTheaterById(id);
        setTheater(res.data);
      }
      setError(null);
    } catch (err) {
      console.error('Lỗi tải thông tin rạp:', err);
      setError('Không tìm thấy rạp chiếu phim này.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchTheater(); }, [fetchTheater]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 pt-24 px-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-red-500 animate-spin mx-auto mb-4" />
          <h2 className="text-white text-xl font-semibold mb-2">Đang tải thông tin rạp...</h2>
          <p className="text-gray-400">Vui lòng chờ trong giây lát</p>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error || !theater) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 pt-24 px-4 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-20 h-20 text-gray-600 mx-auto mb-6" />
          <h2 className="text-white text-2xl font-bold mb-4">{error || 'Không tìm thấy rạp'}</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Rạp chiếu phim bạn tìm kiếm không tồn tại hoặc đã bị xóa.
          </p>
          <button
            onClick={() => navigate('/theaters')}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
          >
            ← Quay lại danh sách rạp
          </button>
        </div>
      </div>
    );
  }

  const mapUrl = buildMapUrl(theater);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 pt-24 pb-16">
      <BlurCircle top="120px" left="0" />
      <BlurCircle bottom="100px" right="0" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Breadcrumb / Back button ─────────────────────────────────── */}
        <button
          onClick={() => navigate('/theaters')}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Danh sách rạp
        </button>

        {/* ── Hero Banner ───────────────────────────────────────────────── */}
        <div className="relative rounded-3xl overflow-hidden mb-10 shadow-2xl">
          {theater.image ? (
            <img
              src={`/src/assets/images/theaters/${theater.image}`}
              alt={theater.name}
              className="w-full h-200 sm:h-100 lg:h-100 object-cover"
            />
          ) : (
            <div className="w-full h-64 sm:h-80 lg:h-96 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              <Building2 className="w-24 h-24 text-gray-600" />
            </div>
          )}
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

          {/* Theater name + meta */}
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-red-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-3">
              {theater.name}
            </h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-300">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-green-400" />
                {theater.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-400" />
                {theater.totalRooms || 0} phòng chiếu
              </span>
              <span className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                Rạp cao cấp
              </span>
            </div>
          </div>
        </div>

        {/* ── Main Content Grid ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Left column — Info + Contact */}
          <div className="space-y-6">

            {/* Thông tin cơ bản */}
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-red-400" />
                Thông Tin Rạp
              </h2>
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-green-400 mt-1 shrink-0" />
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">Địa chỉ</p>
                    <p className="text-gray-200">{theater.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-blue-400 mt-1 shrink-0" />
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">Giờ mở cửa</p>
                    <p className="text-gray-200">08:00 – 23:30 hàng ngày</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building2 className="w-4 h-4 text-purple-400 mt-1 shrink-0" />
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">Số phòng chiếu</p>
                    <p className="text-gray-200">{theater.totalRooms || 0} phòng</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Liên hệ — click-to-action ─────────────────────────── */}
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5 text-red-400" />
                Thông Tin Liên Hệ
              </h2>
              <div className="space-y-3">
                {/* Hotline — tel: */}
                {theater.phone ? (
                  <a
                    href={`tel:${theater.phone}`}
                    id="contact-phone"
                    className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 hover:border-green-400/40 transition-all duration-200 group"
                    title="Gọi ngay cho chúng tôi"
                  >
                    <div className="w-9 h-9 rounded-full bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                      <Phone className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Hotline</p>
                      <p className="text-green-300 font-semibold">{theater.phone}</p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-500 ml-auto" />
                  </a>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 opacity-50">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <p className="text-gray-500 text-sm">Chưa có số điện thoại</p>
                  </div>
                )}

                {/* Email — mailto: */}
                {theater.email ? (
                  <a
                    href={`mailto:${theater.email}`}
                    id="contact-email"
                    className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-400/40 transition-all duration-200 group"
                    title="Gửi email cho chúng tôi"
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                      <Mail className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400">Email</p>
                      <p className="text-blue-300 font-semibold truncate">{theater.email}</p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-500 ml-auto shrink-0" />
                  </a>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 opacity-50">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <p className="text-gray-500 text-sm">Chưa có email</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Tiện ích ─────────────────────────────────────────────── */}
            {theater.amenities?.length > 0 && (
              <div className="bg-black/30 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  Tiện Ích & Công Nghệ
                </h2>
                <div className="flex flex-wrap gap-2">
                  {theater.amenities.map((amenity, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 border border-red-500/30 text-red-300 text-sm font-medium hover:bg-red-600/30 transition-colors"
                    >
                      {AMENITY_ICONS[amenity] || <Zap className="w-3.5 h-3.5" />}
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right column — Bản đồ */}
          <div className="space-y-6">

            {/* ── Bản đồ vị trí ─────────────────────────────────────────── */}
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-red-400" />
                  Vị Trí Trên Bản Đồ
                </h2>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(theater.name + ' ' + theater.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  Mở Google Maps <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              {/* Google Maps Embed — responsive */}
              <div className="relative w-full" style={{ paddingBottom: '65%' }}>
                {!mapLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                  </div>
                )}
                <iframe
                  title={`Bản đồ ${theater.name}`}
                  src={buildMapUrl(theater)}
                  className="absolute inset-0 w-full h-full border-0"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  onLoad={() => setMapLoaded(true)}
                />
              </div>
              <div className="p-3 bg-black/20">
                <p className="text-xs text-gray-400 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
                  {theater.address}
                </p>
              </div>
            </div>

            {/* ── Nút CTA ─────────────────────────────────────────────── */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate(`/releases?theater_id=${theater._id}`)}
                className="flex-1 min-w-[180px] flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-full font-semibold shadow-lg hover:shadow-red-500/30 transition-all duration-300"
              >
                <Ticket className="w-5 h-5" /> Xem Lịch Chiếu
              </button>
              <button
                onClick={() => navigate('/theaters')}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/15 text-white rounded-full font-semibold border border-white/10 transition-all duration-300"
              >
                <Users className="w-5 h-5" /> Rạp Khác
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TheaterDetail;
