import express from 'express';
import Favorite from '../models/Favorite.js';

const router = express.Router();

// ── GET /favorites/user/:userId  →  Lấy tất cả phim yêu thích của user
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

// ── GET /favorites/check?userId=&movieId=  →  Kiểm tra đã yêu thích chưa
router.get('/check', async (req, res) => {
  const { userId, movieId } = req.query;
  if (!userId || !movieId) {
    return res.status(400).json({ message: 'userId và movieId là bắt buộc' });
  }
  try {
    const exists = await Favorite.findOne({ user: userId, movie: movieId });
    res.json({ isFavorite: Boolean(exists), favoriteId: exists?._id || null });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── POST /favorites  →  Thêm yêu thích
router.post('/', async (req, res) => {
  const { userId, movieId } = req.body;

  try {
    // Check if already favorited
    const exists = await Favorite.findOne({ user: userId, movie: movieId });
    if (exists) {
      return res.status(400).json({ message: 'Already favorited' });
    }

    const favorite = new Favorite({ user: userId, movie: movieId });
    await favorite.save();
    await favorite.populate('movie');

    res.status(201).json(favorite);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ── DELETE /favorites/user/:userId/movie/:movieId  →  Xóa theo userId+movieId (SPECIFIC — đặt TRƯỚC /:id)
router.delete('/user/:userId/movie/:movieId', async (req, res) => {
  try {
    await Favorite.findOneAndDelete({
      user: req.params.userId,
      movie: req.params.movieId,
    });
    res.json({ message: 'Favorite removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── DELETE /favorites/:id  →  Xóa theo favoriteId (GENERIC — đặt SAU)
router.delete('/:id', async (req, res) => {
  try {
    await Favorite.findByIdAndDelete(req.params.id);
    res.json({ message: 'Favorite removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
