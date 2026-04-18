import mongoose from 'mongoose';

const castSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    profile_path: { type: String },
    character: { type: String },
  },
  { _id: false },
);

const genreSchema = new mongoose.Schema(
  {
    id: { type: Number },
    name: { type: String, required: true },
  },
  { _id: false },
);

const movieSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    overview: { type: String },
    poster_path: { type: String },
    backdrop_path: { type: String },
    release_date: { type: Date },
    genres: [genreSchema],
    runtime: { type: Number },
    vote_average: { type: Number, default: 0 },
    vote_count: { type: Number, default: 0 },
    casts: [castSchema],
    tagline: { type: String },
    original_language: { type: String },
    trailer_url: { type: String },
  },
  {
    timestamps: true,
  },
);

const Movie = mongoose.model('Movie', movieSchema);

export default Movie;
