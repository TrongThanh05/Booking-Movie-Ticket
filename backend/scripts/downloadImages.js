import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import mongoose from 'mongoose';
import Movie from '../models/Movie.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_DIR = path.join(__dirname, '../../public/images');
const IMAGES_DIR = {
  trailers: path.join(BASE_DIR, 'trailers'),
  casts: path.join(BASE_DIR, 'casts'),
  posters: path.join(BASE_DIR, 'posters'),
  backdrops: path.join(BASE_DIR, 'backdrops'),
};

// Ensure directories exist
Object.values(IMAGES_DIR).forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Generate unique filename from URL
function getFilenameFromUrl(url) {
  const hash = crypto.createHash('md5').update(url).digest('hex');
  const ext = url.split('.').pop().split('?')[0] || 'jpg';
  return `${hash}.${ext}`;
}

// Download image and save to disk
async function downloadImage(url, type) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const filename = getFilenameFromUrl(url);
    const filepath = path.join(IMAGES_DIR[type], filename);

    fs.writeFileSync(filepath, response.data);
    console.log(`✓ Downloaded: ${type}/${filename}`);
    return `/images/${type}/${filename}`;
  } catch (error) {
    console.error(`✗ Failed to download: ${url}`, error.message);
    return null;
  }
}

// Update database with new image paths
async function updateMoviesInDatabase() {
  try {
    const movies = await Movie.find();

    for (const movie of movies) {
      let updated = false;

      // Update poster_path
      if (movie.poster_path && movie.poster_path.includes('image.tmdb.org')) {
        const newPath = await downloadImage(movie.poster_path, 'posters');
        if (newPath) {
          movie.poster_path = newPath;
          updated = true;
        }
      }

      // Update backdrop_path
      if (
        movie.backdrop_path &&
        movie.backdrop_path.includes('image.tmdb.org')
      ) {
        const newPath = await downloadImage(movie.backdrop_path, 'backdrops');
        if (newPath) {
          movie.backdrop_path = newPath;
          updated = true;
        }
      }

      // Update casts if needed
      if (
        movie.casts &&
        Array.isArray(movie.casts) &&
        typeof movie.casts[0] === 'object'
      ) {
        for (let cast of movie.casts) {
          if (
            cast.profile_path &&
            cast.profile_path.includes('image.tmdb.org')
          ) {
            const newPath = await downloadImage(cast.profile_path, 'casts');
            if (newPath) {
              cast.profile_path = newPath;
              updated = true;
            }
          }
        }
      }

      if (updated) {
        await movie.save();
        console.log(`✓ Updated movie: ${movie.title}`);
      }
    }
  } catch (error) {
    console.error('Error updating movies in database:', error);
  }
}

// Main function
async function main() {
  try {
    console.log('Starting image download process...\n');

    // Get image URLs from provided data
    const dummyTrailers = [
      { image: 'https://img.youtube.com/vi/WpW36ldAqnM/maxresdefault.jpg' },
      { image: 'https://img.youtube.com/vi/-sAOWhvheK8/maxresdefault.jpg' },
      { image: 'https://img.youtube.com/vi/1pHDWnXmK7Y/maxresdefault.jpg' },
      { image: 'https://img.youtube.com/vi/umiKiW4En9g/maxresdefault.jpg' },
    ];

    const dummyCasts = [
      'https://image.tmdb.org/t/p/original/usWnHCzbADijULREZYSJ0qfM00y.jpg',
      'https://image.tmdb.org/t/p/original/snk6JiXOOoRjPtHU5VMoy6qbd32.jpg',
      'https://image.tmdb.org/t/p/original/zmznPrQ9GSZwcOIUT0c3GyETwrP.jpg',
      'https://image.tmdb.org/t/p/original/nTSPtzWu6deZTJtWXHUpACVznY4.jpg',
      'https://image.tmdb.org/t/p/original/mGAPQG2OKTgdKFkp9YpvCSqcbgY.jpg',
      'https://image.tmdb.org/t/p/original/lJm89neuiVlYISEqNpGZA5kTAnP.jpg',
      'https://image.tmdb.org/t/p/original/hLN0Ca09KwQOFLZLPIEzgTIbqqg.jpg',
      'https://image.tmdb.org/t/p/original/qY4W0zfGBYzlCyCC0QDJS1Muoa0.jpg',
      'https://image.tmdb.org/t/p/original/6Ksb8ANhhoWWGnlM6O1qrySd7e1.jpg',
      'https://image.tmdb.org/t/p/original/yhI4MK5atavKBD9wiJtaO1say1p.jpg',
      'https://image.tmdb.org/t/p/original/uPq4xUPiJIMW5rXF9AT0GrRqgJY.jpg',
      'https://image.tmdb.org/t/p/original/uZNtbPHowlBYo74U1qlTaRlrdiY.jpg',
      'https://image.tmdb.org/t/p/original/cbZrB8crWlLEDjVUoak8Liak6s.jpg',
    ];

    console.log('Downloading trailer images...');
    for (const trailer of dummyTrailers) {
      await downloadImage(trailer.image, 'trailers');
    }

    console.log('\nDownloading cast images...');
    for (const castUrl of dummyCasts) {
      await downloadImage(castUrl, 'casts');
    }

    console.log('\nConnecting to database...');
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/movie-booking',
    );

    console.log('\nUpdating movies in database...');
    await updateMoviesInDatabase();

    console.log('\n✓ All images downloaded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
