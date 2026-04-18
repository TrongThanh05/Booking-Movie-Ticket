import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_DIR = path.join(__dirname, '../../public/images');

// Generate unique filename from URL
function getFilenameFromUrl(url) {
  const hash = crypto.createHash('md5').update(url).digest('hex');
  const ext = url.split('.').pop().split('?')[0] || 'jpg';
  return `${hash}.${ext}`;
}

// Create mapping from original URLs to new paths
function createImageMappings() {
  const mappings = {
    trailers: {},
    casts: {},
    posters: {},
    backdrops: {},
  };

  const trailersUrls = [
    'https://img.youtube.com/vi/WpW36ldAqnM/maxresdefault.jpg',
    'https://img.youtube.com/vi/-sAOWhvheK8/maxresdefault.jpg',
    'https://img.youtube.com/vi/1pHDWnXmK7Y/maxresdefault.jpg',
    'https://img.youtube.com/vi/umiKiW4En9g/maxresdefault.jpg',
  ];

  const castUrls = [
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

  trailersUrls.forEach((url) => {
    const filename = getFilenameFromUrl(url);
    mappings.trailers[url] = `/images/trailers/${filename}`;
  });

  castUrls.forEach((url) => {
    const filename = getFilenameFromUrl(url);
    mappings.casts[url] = `/images/casts/${filename}`;
  });

  return mappings;
}

// Main
const mappings = createImageMappings();
const outputPath = path.join(__dirname, '../../src/assets/imageMappings.json');
fs.writeFileSync(outputPath, JSON.stringify(mappings, null, 2));

console.log('✓ Image mappings created at:', outputPath);
console.log('\nCast URL mappings:');
Object.entries(mappings.casts).forEach(([url, path]) => {
  console.log(`  ${url} → ${path}`);
});
