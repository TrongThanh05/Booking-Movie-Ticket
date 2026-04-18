import express from 'express';
import Movie from '../models/Movie.js';

const router = express.Router();

// Get all movies
router.get('/', async (req, res) => {
  try {
    const movies = await Movie.find().sort({ createdAt: -1 });
    res.json(movies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get movie by ID
router.get('/:id', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }
    res.json(movie);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create movie (admin)
router.post('/', async (req, res) => {
  const movie = new Movie(req.body);
  try {
    const savedMovie = await movie.save();
    res.status(201).json(savedMovie);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update movie (admin)
router.put('/:id', async (req, res) => {
  try {
    const movie = await Movie.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(movie);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete movie (admin)
router.delete('/:id', async (req, res) => {
  try {
    await Movie.findByIdAndDelete(req.params.id);
    res.json({ message: 'Movie deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update image paths (admin)
router.put('/:id/images', async (req, res) => {
  try {
    const { poster_path, backdrop_path, casts } = req.body;
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    if (poster_path) movie.poster_path = poster_path;
    if (backdrop_path) movie.backdrop_path = backdrop_path;
    if (casts) movie.casts = casts;

    const updatedMovie = await movie.save();
    res.json({
      message: 'Image paths updated successfully',
      movie: updatedMovie,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
