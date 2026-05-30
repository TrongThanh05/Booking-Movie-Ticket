import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Clock, Ticket, Loader2, Search, X } from 'lucide-react';
import BlurCircle from '../components/BlurCircle';
import Pagination from '../components/Pagination';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const Theaters = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [theaters, setTheaters] = useState([]);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [pagination, setPagination] = useState({
    currentPage: 1, totalPages: 1, totalItems: 0, limit: 8,
    hasNextPage: false, hasPrevPage: false,
  });

  // Debounce search
  const [searchDebounced, setSearchDebounced] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => { setSearchDebounced(searchQuery); setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchTheaters = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/theaters', {
        params: { page, limit, search: searchDebounced },
      });

      const res = response.data;
      if (res.pagination) {
        setTheaters(res.data);
        setPagination(res.pagination);
      } else {
        // Backward compat
        const arr = Array.isArray(res) ? res : [];
        setTheaters(arr);
        setPagination({ currentPage: 1, totalPages: 1, totalItems: arr.length, limit, hasNextPage: false, hasPrevPage: false });
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Không thể tải dữ liệu rạp chiếu. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchDebounced]);

  useEffect(() => { fetchTheaters(); }, [fetchTheaters]);

  if (loading && page === 1 && theaters.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 pt-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-red-500 animate-spin mx-auto mb-4" />
              <h2 className="text-white text-xl font-semibold mb-2">
                Đang tải danh sách rạp...
              </h2>
              <p className="text-gray-400">Vui lòng chờ trong giây lát</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 pt-24 pb-12">
      <BlurCircle top="150px" left="0px" />
      <BlurCircle bottom="50px" right="50px" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
              Rạp Chiếu Phim
            </h1>
          </div>
          <p className="text-gray-400 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
            Khám phá các rạp chiếu phim gần bạn với lịch chiếu mới nhất và tiện
            ích hiện đại
          </p>
          <div className="flex items-center justify-center gap-8 mt-8 text-sm">
            <div className="flex items-center gap-2 text-gray-300">
              <MapPin className="w-4 h-4 text-green-500" />
              <span>{pagination.totalItems} rạp</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>Cập nhật hàng ngày</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-black/20 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm rạp theo tên hoặc vị trí..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-red-500 focus:bg-white/10 transition-all duration-300"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Theaters Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
          </div>
        ) : theaters.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-4">
            {theaters.map((theater) => (
              <div
                key={theater._id || theater.id}
                className="bg-black/20 backdrop-blur-sm rounded-2xl border border-white/10 p-4 shadow-md hover:shadow-lg transition-shadow duration-300"
              >
                <img
                  src={`/src/assets/images/theaters/${theater.image}`}
                  alt={`${theater.name} exterior`}
                  className="w-full h-48 object-cover rounded-xl mb-4"
                  loading="lazy"
                />
                <h3 className="font-semibold text-red-500 text-lg mb-2">
                  {theater.name}
                </h3>
                <p className="text-sm text-gray-400 mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-500" />
                  {theater.address}
                </p>
                <p className="text-sm text-gray-400 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  Số phòng: {theater.totalRooms || 0}
                </p>
                {theater.amenities && theater.amenities.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">
                      Tiện ích
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {theater.amenities.slice(0, 3).map((amenity, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-red-600/40 text-white px-2 py-1 rounded"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => navigate(`/releases?theater_id=${theater._id || theater.id}`)}
                  className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full font-medium text-sm shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Ticket className="w-4 h-4" /> Xem Lịch Chiếu
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <MapPin className="w-12 h-12 text-gray-600" />
            </div>
            <h3 className="text-white text-2xl font-bold mb-4">
              Không tìm thấy rạp
            </h3>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Không có rạp nào phù hợp với tiêu chí tìm kiếm. Hãy thử điều chỉnh
              từ khóa.
            </p>
            <button
              onClick={() => navigate('/movies')}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors duration-300"
            >
              Xem danh sách phim
            </button>
          </div>
        )}

        {/* Pagination */}
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          limit={pagination.limit}
          onPageChange={(newPage) => {
            setPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </div>
    </div>
  );
};

export default Theaters;
