import express from 'express';
import Show from '../models/Show.js';
import Room from '../models/Room.js';

const router = express.Router();

// ============================================================
// CRUD CƠ BẢN
// ============================================================

// Get all shows
router.get('/', async (req, res) => {
  try {
    const shows = await Show.find()
      .populate('movie')
      .populate('cinema')
      .populate('room_id')
      .sort({ showDateTime: 1 });
    res.json(shows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get shows by date
router.get('/by-date/:date', async (req, res) => {
  try {
    const date = new Date(req.params.date);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const shows = await Show.find({
      showDateTime: { $gte: date, $lt: nextDate },
      is_active: true,
    })
      .populate('movie')
      .populate('cinema')
      .populate('room_id')
      .sort({ showDateTime: 1 });

    res.json(shows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// Get shows by movie ID (optionally filtered by date)
// GET /api/shows/by-movie/:movieId?date=YYYY-MM-DD
// ============================================================
router.get('/by-movie/:movieId', async (req, res) => {
  try {
    const { date } = req.query;
    const filter = { movie: req.params.movieId, is_active: true };

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      filter.showDateTime = { $gte: startDate, $lte: endDate };
    }

    const shows = await Show.find(filter)
      .populate('cinema', 'name location address')
      .populate('room_id', 'name screen_type')
      .sort({ showDateTime: 1 });

    res.json(shows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get show by ID
router.get('/:id', async (req, res) => {
  try {
    const show = await Show.findById(req.params.id)
      .populate('movie')
      .populate('cinema')
      .populate('room_id');
    if (!show) {
      return res.status(404).json({ message: 'Show not found' });
    }
    res.json(show);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create show (admin)
router.post('/', async (req, res) => {
  const show = new Show(req.body);
  try {
    const savedShow = await show.save();
    await savedShow.populate('movie');
    await savedShow.populate('cinema');
    await savedShow.populate('room_id');
    res.status(201).json(savedShow);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update show (admin)
router.put('/:id', async (req, res) => {
  try {
    const show = await Show.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    })
      .populate('movie')
      .populate('cinema')
      .populate('room_id');
    res.json(show);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete show (admin)
router.delete('/:id', async (req, res) => {
  try {
    await Show.findByIdAndDelete(req.params.id);
    res.json({ message: 'Show deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// API SEAT-MAP: Trả về sơ đồ ghế kèm trạng thái realtime
// GET /api/shows/:id/seat-map
//
// Trạng thái ghế (theo thứ tự ưu tiên):
//   1. 'booked'   — nằm trong show.booked_seats (đã thanh toán, bất biến)
//   2. 'locked'   — nằm trong show.reserved_seats với hold_until > now
//   3. 'available'— còn trống
// ============================================================
router.get('/:id/seat-map', async (req, res) => {
  try {
    const show = await Show.findById(req.params.id)
      .populate('movie', 'title poster_path backdrop_path')
      .populate('cinema', 'name location address')
      .populate('room_id');

    if (!show) return res.status(404).json({ message: 'Show not found' });

    const room = show.room_id;
    if (!room) return res.status(404).json({ message: 'Room not found for this show' });

    const now = new Date();

    // ── 1. Build booked set (O(1) lookup) ─────────────────────
    const bookedSet = new Set(show.booked_seats);

    // ── 2. Build locked set (active locks only) ────────────────
    const lockedSet = new Set();
    for (const rs of show.reserved_seats) {
      if (rs.hold_until && rs.hold_until > now) {
        lockedSet.add(rs.seat_id);
      }
    }

    // ── 3. Use room.seats[] if available, else fall back to layout ─
    let seatMap;

    if (room.seats && room.seats.length > 0) {
      // ── New path: use flat seats array ──────────────────────
      // Group by row for frontend rendering
      const rowMap = {};
      for (const seat of room.seats) {
        if (!rowMap[seat.row]) {
          rowMap[seat.row] = {
            row:              seat.row,
            type:             seat.type,
            price_multiplier: seat.price_multiplier,
            seats:            [],
          };
        }
        const status = bookedSet.has(seat.seat_id)
          ? 'booked'
          : lockedSet.has(seat.seat_id)
          ? 'locked'
          : 'available';

        rowMap[seat.row].seats.push({
          seat_id: seat.seat_id,
          row:     seat.row,
          col:     seat.number,
          type:    seat.type,
          price:   Math.round(show.base_price * seat.price_multiplier),
          status,
        });
      }
      // Sort rows alphabetically, seats by number
      seatMap = Object.values(rowMap).sort((a, b) => a.row.localeCompare(b.row));
      seatMap.forEach((r) => r.seats.sort((a, b) => a.col - b.col));
    } else {
      // ── Legacy path: generate from layout ───────────────────
      seatMap = [];
      for (const rowCfg of room.layout.row_configs) {
        const seats = [];
        for (let col = 1; col <= room.layout.columns; col++) {
          const seatId = `${rowCfg.row}${col}`;
          const status = bookedSet.has(seatId)
            ? 'booked'
            : lockedSet.has(seatId)
            ? 'locked'
            : 'available';

          seats.push({
            seat_id: seatId,
            row:     rowCfg.row,
            col,
            type:    rowCfg.type,
            price:   Math.round(show.base_price * rowCfg.price_multiplier),
            status,
          });
        }
        seatMap.push({ row: rowCfg.row, type: rowCfg.type, price_multiplier: rowCfg.price_multiplier, seats });
      }
    }

    res.json({
      show: {
        _id:          show._id,
        showDateTime: show.showDateTime,
        base_price:   show.base_price,
        format:       show.format,
        language:     show.language,
        movie:        show.movie,
        cinema:       show.cinema,
        room: {
          _id:        room._id,
          name:       room.name,
          screen_type: room.screen_type,
          capacity:   room.capacity ?? room.seats?.length ?? 0,
          rows:       room.layout?.rows,
          columns:    room.layout?.columns,
        },
      },
      booked_count:    bookedSet.size,
      locked_count:    lockedSet.size,
      available_count: (room.capacity || room.seats?.length || 0) - bookedSet.size - lockedSet.size,
      seat_map:        seatMap,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// API LOCK-SEATS: Khóa ghế trước khi thanh toán (chống Race Condition)
// POST /api/shows/:id/lock-seats
// Body: { seat_ids: ["F5", "F6"], user_id: "objectIdString" }
// ============================================================
router.post('/:id/lock-seats', async (req, res) => {
  const { seat_ids, user_id } = req.body;

  if (!seat_ids || !Array.isArray(seat_ids) || seat_ids.length === 0) {
    return res.status(400).json({ message: 'seat_ids is required and must be a non-empty array' });
  }
  if (!user_id) {
    return res.status(400).json({ message: 'user_id is required' });
  }

  try {
    const show = await Show.findById(req.params.id);
    if (!show) {
      return res.status(404).json({ message: 'Show not found' });
    }

    const now = new Date();
    const holdUntil = new Date(now.getTime() + 10 * 60 * 1000); // +10 phút

    // Kiểm tra từng ghế: đã bị locked (chưa hết hạn) hoặc đã booked?
    const conflictSeats = [];
    for (const seatId of seat_ids) {
      // 1. Đã thanh toán thành công?
      if (show.booked_seats?.includes(seatId)) {
        conflictSeats.push(seatId);
        continue;
      }
      // 2. Đang bị lock bởi người khác (lock còn hiệu lực)?
      const activeLock = show.reserved_seats.find(
        (rs) => rs.seat_id === seatId && rs.hold_until && rs.hold_until > now,
      );
      if (activeLock) conflictSeats.push(seatId);
    }

    if (conflictSeats.length > 0) {
      return res.status(409).json({
        message: 'Một số ghế đã có người chọn',
        conflict_seats: conflictSeats,
      });
    }

    // Xóa lock cũ đã hết hạn của chính user này trước khi push mới
    await Show.updateOne(
      { _id: show._id },
      {
        $pull: {
          reserved_seats: {
            user_id: user_id,
            hold_until: { $lt: now }, // chỉ xóa lock đã hết hạn
          },
        },
      },
    );

    // Atomic push ghế mới vào reserved_seats (schema mới: không có status)
    const newReservations = seat_ids.map((seatId) => ({
      seat_id:    seatId,
      user_id:    user_id,
      hold_until: holdUntil,
      locked_at:  now,
    }));

    await Show.updateOne(
      { _id: show._id },
      { $push: { reserved_seats: { $each: newReservations } } },
    );

    res.json({
      message: 'Ghế đã được giữ thành công',
      locked_seats: seat_ids,
      hold_until: holdUntil,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// API UNLOCK-SEATS: Hủy giữ ghế (khi user thoát trang thanh toán)
// POST /api/shows/:id/unlock-seats
// Body: { seat_ids: ["F5", "F6"], user_id: "objectIdString" }
// ============================================================
router.post('/:id/unlock-seats', async (req, res) => {
  const { seat_ids, user_id } = req.body;

  try {
    await Show.updateOne(
      { _id: req.params.id },
      {
        $pull: {
          reserved_seats: {
            seat_id: { $in: seat_ids },
            user_id: user_id,
          },
        },
      },
    );

    res.json({ message: 'Đã hủy giữ ghế', unlocked_seats: seat_ids });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// API CONFIRM-BOOKING: Xác nhận đặt ghế sau thanh toán thành công
// POST /api/shows/:id/confirm-booking
// Body: { seat_ids: ["A1", "A2"], user_id: "objectIdString" }
//
// Logic:
//   1. Kiểm tra ghế chưa nằm trong booked_seats (chống double-book)
//   2. Dùng $addToSet + $each để push seat_ids vào booked_seats (atomic, no-dup)
//   3. Xóa các ghế đó khỏi reserved_seats (lock release)
//   4. Trả về show đã cập nhật
// ============================================================
router.post('/:id/confirm-booking', async (req, res) => {
  const { seat_ids, user_id } = req.body;

  if (!seat_ids || !Array.isArray(seat_ids) || seat_ids.length === 0) {
    return res.status(400).json({ message: 'seat_ids is required and must be a non-empty array' });
  }
  if (!user_id) {
    return res.status(400).json({ message: 'user_id is required' });
  }

  try {
    // ── Bước 1: Kiểm tra ghế chưa bị booked bởi người khác ────────
    const show = await Show.findById(req.params.id).select('booked_seats reserved_seats');
    if (!show) return res.status(404).json({ message: 'Show not found' });

    const alreadyBooked = seat_ids.filter((id) => show.booked_seats.includes(id));
    if (alreadyBooked.length > 0) {
      return res.status(409).json({
        message: 'Một số ghế đã được đặt bởi người khác',
        conflict_seats: alreadyBooked,
      });
    }

    // ── Bước 2 & 3: Atomic update ──────────────────────────────────
    // $addToSet + $each: thêm vào booked_seats, không trùng lặp
    // $pull từ reserved_seats: giải phóng lock của user này
    const updated = await Show.findOneAndUpdate(
      { _id: req.params.id },
      {
        $addToSet: { booked_seats: { $each: seat_ids } },   // ← atomic, no-dup
        $pull:     { reserved_seats: { user_id: user_id } }, // ← release lock
      },
      { new: true, select: 'booked_seats reserved_seats' },
    );

    res.json({
      message:       'Đặt ghế thành công',
      booked_seats:  updated.booked_seats,
      confirmed:     seat_ids,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
