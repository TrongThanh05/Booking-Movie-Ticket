import express from 'express';
import Favorite from '../models/Favorite.js';

const router = express.Router();

// Get user favorites
router.get('/user/:userId', async (req, res) => {
  try {
    const favorites = await Favorite.find({ user: req.params.userId })
      .populate('movie')
      .sort({ createdAt: -1 });

    res.json(favorites);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add favorite
router.post('/', async (req, res) => {
  const { userId, movieId } = req.body;

  try {
    // Check if already favorited
    const exists = await Favorite.findOne({ user: userId, movie: movieId });
    if (exists) {
      return res.status(400).json({ message: 'Already favorited' });
    }

    const favorite = new Favorite({
      user: userId,
      movie: movieId,
    });

    await favorite.save();
    await favorite.populate('movie');

    res.status(201).json(favorite);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Remove favorite
router.delete('/:id', async (req, res) => {
  try {
    await Favorite.findByIdAndDelete(req.params.id);
    res.json({ message: 'Favorite removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
