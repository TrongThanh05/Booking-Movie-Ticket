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

export default router;
