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

const BACKDROPS_DIR = path.join(__dirname, '../../public/images/backdrops');

// Ensure directory exists
if (!fs.existsSync(BACKDROPS_DIR)) {
  fs.mkdirSync(BACKDROPS_DIR, { recursive: true });
}

// Generate unique filename from URL
function getFilenameFromUrl(url) {
  const hash = crypto.createHash('md5').update(url).digest('hex');
  const ext = url.split('.').pop().split('?')[0] || 'jpg';
  return `${hash}.${ext}`;
}

// Download image and save to disk
async function downloadImage(url) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
    });
    const filename = getFilenameFromUrl(url);
    const filepath = path.join(BACKDROPS_DIR, filename);

    fs.writeFileSync(filepath, response.data);
    console.log(`✓ Downloaded backdrop: ${filename}`);
    return `/images/backdrops/${filename}`;
  } catch (error) {
    console.error(`✗ Failed to download backdrop: ${url.substring(0, 60)}...`);
    return null;
  }
}

async function downloadBackdropsFromDatabase() {
  try {
    const movies = await Movie.find();

    for (const movie of movies) {
      if (
        movie.backdrop_path &&
        movie.backdrop_path.includes('image.tmdb.org')
      ) {
        const newPath = await downloadImage(movie.backdrop_path);
        if (newPath) {
          movie.backdrop_path = newPath;
          await movie.save();
          console.log(`✓ Updated ${movie.title} backdrop path`);
        }
      }
    }
  } catch (error) {
    console.error('Error downloading backdrops:', error.message);
  }
}

async function main() {
  try {
    console.log('Starting backdrop download process...\n');

    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/movie-booking',
    );
    console.log('Connected to database\n');

    await downloadBackdropsFromDatabase();

    console.log('\n✓ Backdrop download completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
