import express from 'express';
import Room from '../models/Room.js';

const router = express.Router();

// Get all rooms (optionally filter by theater_id)
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

// Get room by ID (includes full layout for seat-map rendering)
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

// ─────────────────────────────────────────────────────────────────
// GET /api/rooms/:id/seats
// Trả về danh sách ghế vật lý của phòng (dùng để render sơ đồ ghế)
// ─────────────────────────────────────────────────────────────────
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

// Create room (admin)
router.post('/', async (req, res) => {
  const room = new Room(req.body);
  try {
    const savedRoom = await room.save();
    await savedRoom.populate('theater_id');
    res.status(201).json(savedRoom);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update room (admin)
router.put('/:id', async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).populate('theater_id');
    res.json(room);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete room (admin)
router.delete('/:id', async (req, res) => {
  try {
    await Room.findByIdAndDelete(req.params.id);
    res.json({ message: 'Room deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
