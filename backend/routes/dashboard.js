import express from 'express';
import { adminMiddleware } from '../middleware/auth.js';
import Booking from '../models/Booking.js';
import Movie from '../models/Movie.js';
import User from '../models/User.js';
import Show from '../models/Show.js';

const router = express.Router();

// ── GET /api/admin/dashboard/stats ────────────────────────────────────────────
// Trả về tất cả số liệu thống kê cần thiết cho Dashboard Admin
//
// Phân quyền:
//   • Super-admin   → thống kê toàn hệ thống
//   • Theater-owner → thống kê CHỈ trong phạm vi rạp mình quản lý
// ─────────────────────────────────────────────────────────────────────────────
router.get('/stats', adminMiddleware, async (req, res) => {
  try {
    const now = new Date();

    // ── Khoảng thời gian: tháng hiện tại & tháng trước ────────────────────────
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // ══════════════════════════════════════════════════════════════════════════
    // THEATER-OWNER SCOPE: xác định danh sách show IDs thuộc rạp
    // ══════════════════════════════════════════════════════════════════════════
    let showScopeFilter = {};     // filter cho Booking query
    let showDateFilter  = {};     // filter cho Show query
    let theaterShowIds  = null;   // mảng ObjectId shows (dùng cho $in)

    if (req.isTheaterOwner) {
      const theaterShows = await Show.find({ cinema: req.theaterScope })
        .select('_id')
        .lean();
      theaterShowIds = theaterShows.map((s) => s._id);
      showScopeFilter = { show: { $in: theaterShowIds } };
      showDateFilter  = { cinema: req.theaterScope };
    }

    // Booking base match (kết hợp scope + status)
    const bookingMatchBase = {
      status: { $in: ['confirmed', 'completed'] },
      ...showScopeFilter,
    };

    // ── 1. Tổng doanh thu ─────────────────────────────────────────────────────
    const [revenueThisMonth, revenueLastMonth] = await Promise.all([
      Booking.aggregate([
        { $match: { ...bookingMatchBase, booked_at: { $gte: startOfThisMonth } } },
        { $group: { _id: null, total: { $sum: '$total_amount' } } },
      ]),
      Booking.aggregate([
        { $match: { ...bookingMatchBase, booked_at: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
        { $group: { _id: null, total: { $sum: '$total_amount' } } },
      ]),
    ]);
    const revenueCurrent  = revenueThisMonth[0]?.total  || 0;
    const revenuePrevious = revenueLastMonth[0]?.total   || 0;
    const revenueTrend = revenuePrevious > 0
      ? (((revenueCurrent - revenuePrevious) / revenuePrevious) * 100).toFixed(1)
      : null;

    // ── 2. Số phim đang chiếu (có show trong tương lai) ──────────────────────
    const showActiveFilter = { showDateTime: { $gte: now }, is_active: true, ...showDateFilter };
    const showPrevFilter   = {
      showDateTime: { $gte: startOfLastMonth, $lte: endOfLastMonth },
      is_active: true,
      ...showDateFilter,
    };

    const [nowShowingCount, prevNowShowingCount] = await Promise.all([
      Show.distinct('movie', showActiveFilter).then(ids => ids.length),
      Show.distinct('movie', showPrevFilter).then(ids => ids.length),
    ]);
    const movieTrend = prevNowShowingCount > 0
      ? (((nowShowingCount - prevNowShowingCount) / prevNowShowingCount) * 100).toFixed(1)
      : null;

    // ── 3. Vé đã bán (tháng này vs tháng trước) ──────────────────────────────
    const [ticketsThisMonth, ticketsLastMonth] = await Promise.all([
      Booking.aggregate([
        { $match: { ...bookingMatchBase, booked_at: { $gte: startOfThisMonth } } },
        { $project: { ticketCount: { $size: '$tickets' } } },
        { $group: { _id: null, total: { $sum: '$ticketCount' } } },
      ]),
      Booking.aggregate([
        { $match: { ...bookingMatchBase, booked_at: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
        { $project: { ticketCount: { $size: '$tickets' } } },
        { $group: { _id: null, total: { $sum: '$ticketCount' } } },
      ]),
    ]);
    const ticketsCurrent  = ticketsThisMonth[0]?.total || 0;
    const ticketsPrevious = ticketsLastMonth[0]?.total  || 0;
    const ticketsTrend = ticketsPrevious > 0
      ? (((ticketsCurrent - ticketsPrevious) / ticketsPrevious) * 100).toFixed(1)
      : null;

    // ── 4. Tổng người dùng ────────────────────────────────────────────────────
    // Theater-owner: vẫn hiển thị tổng user (chỉ đọc, không scope)
    const [totalUsers, newUsersThisMonth, newUsersLastMonth] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'user', createdAt: { $gte: startOfThisMonth } }),
      User.countDocuments({ role: 'user', createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
    ]);
    const userTrend = newUsersLastMonth > 0
      ? (((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100).toFixed(1)
      : null;

    // ── 5. Doanh thu 7 ngày gần nhất (cho chart) ─────────────────────────────
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const dailyRevenue = await Booking.aggregate([
      {
        $match: {
          ...bookingMatchBase,
          booked_at: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            year:  { $year: '$booked_at' },
            month: { $month: '$booked_at' },
            day:   { $dayOfMonth: '$booked_at' },
          },
          total: { $sum: '$total_amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    // Build đủ 7 ngày (kể cả ngày không có doanh thu = 0)
    const revenueChartData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const year = d.getFullYear(), month = d.getMonth() + 1, day = d.getDate();
      const found = dailyRevenue.find(
        r => r._id.year === year && r._id.month === month && r._id.day === day,
      );
      revenueChartData.push({
        date:    `${day}/${month}`,
        revenue: found?.total || 0,
        orders:  found?.count || 0,
      });
    }

    // ── 6. Top 5 phim bán nhiều vé nhất ──────────────────────────────────────
    const topMoviesPipeline = [
      { $match: { status: { $in: ['confirmed', 'completed'] }, ...showScopeFilter } },
      { $lookup: { from: 'shows', localField: 'show', foreignField: '_id', as: 'showData' } },
      { $unwind: '$showData' },
    ];

    // Theater-owner: filter thêm theo cinema sau lookup
    if (req.isTheaterOwner) {
      topMoviesPipeline.push({
        $match: { 'showData.cinema': req.theaterScope },
      });
    }

    topMoviesPipeline.push(
      {
        $group: {
          _id:        '$showData.movie',
          ticketsSold: { $sum: { $size: '$tickets' } },
          revenue:     { $sum: '$total_amount' },
        },
      },
      { $sort: { ticketsSold: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from:         'movies',
          localField:   '_id',
          foreignField: '_id',
          as:           'movie',
        },
      },
      { $unwind: '$movie' },
      {
        $project: {
          _id:         0,
          movieId:     '$_id',
          title:       '$movie.title',
          poster_path: '$movie.poster_path',
          genres:      '$movie.genres',
          ticketsSold: 1,
          revenue:     1,
        },
      },
    );

    const topMovies = await Booking.aggregate(topMoviesPipeline);

    // ── 7. 5 đơn đặt vé gần nhất ─────────────────────────────────────────────
    const recentBookingFilter = { status: { $ne: 'cancelled' }, ...showScopeFilter };
    const recentBookings = await Booking.find(recentBookingFilter)
      .sort({ booked_at: -1 })
      .limit(5)
      .populate('user', 'name email')
      .populate({
        path: 'show',
        select: 'movie showDateTime cinema',
        populate: [
          { path: 'movie', select: 'title poster_path' },
          { path: 'cinema', select: 'name' },
        ],
      })
      .lean();

    res.json({
      // Metadata cho frontend: biết đang xem scope nào
      scope: req.isTheaterOwner
        ? { type: 'theater', theater_id: req.theaterScope }
        : { type: 'system' },
      stats: {
        revenue: {
          current:  revenueCurrent,
          previous: revenuePrevious,
          trend:    revenueTrend ? parseFloat(revenueTrend) : 0,
        },
        movies: {
          nowShowing:  nowShowingCount,
          prevShowing: prevNowShowingCount,
          trend:       movieTrend ? parseFloat(movieTrend) : 0,
        },
        tickets: {
          current:  ticketsCurrent,
          previous: ticketsPrevious,
          trend:    ticketsTrend ? parseFloat(ticketsTrend) : 0,
        },
        users: {
          total:      totalUsers,
          newThisMonth: newUsersThisMonth,
          trend:      userTrend ? parseFloat(userTrend) : 0,
        },
      },
      revenueChartData,
      topMovies,
      recentBookings: recentBookings.map(b => ({
        _id:          b._id,
        booking_code: b.booking_code,
        user:         b.user,
        movie:        b.show?.movie?.title || 'N/A',
        cinema:       b.show?.cinema?.name || 'N/A',
        showDateTime: b.show?.showDateTime,
        total_amount: b.total_amount,
        status:       b.status,
        booked_at:    b.booked_at,
        ticketCount:  b.tickets?.length || 0,
      })),
    });
  } catch (err) {
    console.error('[Dashboard Stats Error]', err);
    res.status(500).json({ message: 'Lỗi server khi lấy thống kê dashboard' });
  }
});

export default router;
