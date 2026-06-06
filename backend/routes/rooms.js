import express from 'express';
import Room from '../models/Room.js';
import { adminMiddleware, scopeToTheater } from '../middleware/auth.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/rooms — Lấy danh sách phòng chiếu
//
// Phân quyền:
//   • Không yêu cầu auth → client cũng có thể xem
//   • Nếu có query ?theater_id → filter theo theater
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.theater_id) {
      filter.theater_id = req.query.theater_id;
    }
    const rooms = await Room.find(filter)
      .populate('theater_id')
      .sort({ name: 1 });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/rooms/:id — Chi tiết phòng (bao gồm layout cho seat-map rendering)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).populate('theater_id');
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/rooms/:id/seats
// Trả về danh sách ghế vật lý của phòng (dùng để render sơ đồ ghế)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/seats', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).select('seats capacity screen_type name');
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    res.json({
      room_id:     room._id,
      name:        room.name,
      screen_type: room.screen_type,
      capacity:    room.capacity,
      seats:       room.seats,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/rooms — Tạo phòng chiếu mới
//
// Phân quyền:
//   • Super-admin  → tạo cho bất kỳ theater nào (body.theater_id)
//   • Theater-owner→ CHỈ tạo cho theater mình quản lý
//                    (body.theater_id bị bắt buộc khớp req.theaterScope)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', adminMiddleware, async (req, res) => {
  try {
    // ── Theater-owner scope enforcement ──────────────────────────────────────
    if (req.isTheaterOwner) {
      const bodyTheaterId = req.body.theater_id;
      if (!bodyTheaterId) {
        // Auto-fill theater_id cho theater-owner nếu không truyền
        req.body.theater_id = req.theaterScope;
      } else if (bodyTheaterId.toString() !== req.theaterScope.toString()) {
        return res.status(403).json({
          message: 'Bạn chỉ có quyền tạo phòng chiếu cho rạp của mình',
        });
      }
    }

    const room = new Room(req.body);
    const savedRoom = await room.save();
    await savedRoom.populate('theater_id');
    res.status(201).json(savedRoom);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/rooms/:id — Cập nhật phòng chiếu
//
// Phân quyền:
//   • Super-admin  → sửa bất kỳ
//   • Theater-owner→ CHỈ sửa phòng thuộc theater mình, KHÔNG cho đổi theater_id
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // ── Theater-owner scope enforcement ──────────────────────────────────────
    if (req.isTheaterOwner) {
      if (room.theater_id.toString() !== req.theaterScope.toString()) {
        return res.status(403).json({
          message: 'Bạn chỉ có quyền chỉnh sửa phòng chiếu của rạp mình',
        });
      }
      // Không cho theater-owner đổi theater_id (chuyển phòng sang rạp khác)
      delete req.body.theater_id;
    }

    const updatedRoom = await Room.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).populate('theater_id');
    res.json(updatedRoom);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/rooms/:id — Xóa phòng chiếu
//
// Phân quyền:
//   • Super-admin  → xóa bất kỳ
//   • Theater-owner→ CHỈ xóa phòng thuộc theater mình
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // ── Theater-owner scope enforcement ──────────────────────────────────────
    if (req.isTheaterOwner) {
      if (room.theater_id.toString() !== req.theaterScope.toString()) {
        return res.status(403).json({
          message: 'Bạn chỉ có quyền xóa phòng chiếu của rạp mình',
        });
      }
    }

    await Room.findByIdAndDelete(req.params.id);
    res.json({ message: 'Room deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/rooms/:id/row-type — Đổi loại ghế của cả 1 hàng
//
// Body: { row: "A", type: "vip" | "regular" | "couple" }
// Cập nhật cả seats[] lẫn layout.row_configs[] cùng lúc
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/row-type', adminMiddleware, async (req, res) => {
  try {
    const { row, type } = req.body;
    if (!row || !type) {
      return res.status(400).json({ message: 'Thiếu tham số row hoặc type' });
    }
    const validTypes = ['regular', 'vip', 'couple'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: `type phải là: ${validTypes.join(', ')}` });
    }

    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    // Theater-owner scope
    if (req.isTheaterOwner && room.theater_id.toString() !== req.theaterScope.toString()) {
      return res.status(403).json({ message: 'Bạn chỉ có quyền chỉnh sửa phòng chiếu của rạp mình' });
    }

    // Price multiplier tương ứng loại ghế
    const MULTIPLIER = { regular: 1.0, vip: 1.5, couple: 2.0 };
    const multiplier = MULTIPLIER[type];

    // Cập nhật tất cả ghế thuộc hàng đó
    room.seats = room.seats.map((s) =>
      s.row === row ? { ...s.toObject(), type, price_multiplier: multiplier } : s.toObject()
    );

    // Cập nhật row_config trong layout
    if (room.layout?.row_configs) {
      room.layout.row_configs = room.layout.row_configs.map((rc) =>
        rc.row === row ? { ...rc.toObject(), type, price_multiplier: multiplier } : rc.toObject()
      );
      room.markModified('layout');
    }
    room.markModified('seats');

    await room.save({ validateModifiedOnly: true });
    // Bỏ hook regenerate seats khi chỉ patch (seats đã được set thủ công)
    res.json({ message: `Đã cập nhật hàng ${row} → ${type}`, seats: room.seats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/rooms/:id/seat-status — Đổi trạng thái 1 ghế cụ thể
//
// Body: { seat_id: "A1", status: "active" | "broken" | "maintenance" }
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/seat-status', adminMiddleware, async (req, res) => {
  try {
    const { seat_id, status } = req.body;
    if (!seat_id || !status) {
      return res.status(400).json({ message: 'Thiếu tham số seat_id hoặc status' });
    }
    const validStatuses = ['active', 'broken', 'maintenance'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `status phải là: ${validStatuses.join(', ')}` });
    }

    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    // Theater-owner scope
    if (req.isTheaterOwner && room.theater_id.toString() !== req.theaterScope.toString()) {
      return res.status(403).json({ message: 'Bạn chỉ có quyền chỉnh sửa phòng chiếu của rạp mình' });
    }

    const seatIdx = room.seats.findIndex((s) => s.seat_id === seat_id);
    if (seatIdx === -1) return res.status(404).json({ message: `Không tìm thấy ghế ${seat_id}` });

    room.seats[seatIdx].status = status;
    room.markModified('seats');
    await room.save({ validateModifiedOnly: true });

    res.json({ message: `Ghế ${seat_id} → ${status}`, seat: room.seats[seatIdx] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

