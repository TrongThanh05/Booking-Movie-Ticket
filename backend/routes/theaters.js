import express from 'express';
import Theater from '../models/Theater.js';

const router = express.Router();

// Get all theaters
router.get('/', async (req, res) => {
  try {
    const theaters = await Theater.find().sort({ createdAt: -1 });
    res.json(theaters);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get theater by ID
router.get('/:id', async (req, res) => {
  try {
    const theater = await Theater.findById(req.params.id);
    if (!theater) {
      return res.status(404).json({ message: 'Theater not found' });
    }
    res.json(theater);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create theater (admin)
router.post('/', async (req, res) => {
  const theater = new Theater(req.body);
  try {
    const savedTheater = await theater.save();
    res.status(201).json(savedTheater);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update theater (admin)
router.put('/:id', async (req, res) => {
  try {
    const theater = await Theater.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(theater);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete theater (admin)
router.delete('/:id', async (req, res) => {
  try {
    await Theater.findByIdAndDelete(req.params.id);
    res.json({ message: 'Theater deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
