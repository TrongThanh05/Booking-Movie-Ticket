import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate unique filename from URL
function getFilenameFromUrl(url) {
  const hash = crypto.createHash('md5').update(url).digest('hex');
  const ext = url.split('.').pop().split('?')[0] || 'jpg';
  return `${hash}.${ext}`;
}

// Create mapping for posters and backdrops
function createPostandBackdropMappings() {
  const dummyShowsData = [
    {
      poster_path:
        'https://image.tmdb.org/t/p/original/dDlfjR7gllmr8HTeN6rfrYhTdwX.jpg',
      backdrop_path:
        'https://image.tmdb.org/t/p/original/op3qmNhvwEvyT7UFyPbIfQmKriB.jpg',
    },
    {
      poster_path:
        'https://image.tmdb.org/t/p/original/juA4IWO52Fecx8lhAsxmDgy3M3.jpg',
      backdrop_path:
        'https://image.tmdb.org/t/p/original/icFWIk1KfkWLZnugZAJEDauNZ94.jpg',
    },
    {
      poster_path:
        'https://image.tmdb.org/t/p/original/mKKqV23MQ0uakJS8OCE2TfV5jNS.jpg',
      backdrop_path:
        'https://image.tmdb.org/t/p/original/7Zx3wDG5bBtcfk8lcnCWDOLM4Y4.jpg',
    },
    {
      poster_path:
        'https://image.tmdb.org/t/p/original/ubP2OsF3GlfqYPvXyLw9d78djGX.jpg',
      backdrop_path:
        'https://image.tmdb.org/t/p/original/65MVgDa6YjSdqzh7YOA04mYkioo.jpg',
    },
    {
      poster_path:
        'https://image.tmdb.org/t/p/original/yFHHfHcUgGAxziP1C3lLt0q2T4s.jpg',
      backdrop_path:
        'https://image.tmdb.org/t/p/original/2Nti3gYAX513wvhp8IiLL6ZDyOm.jpg',
    },
    {
      poster_path:
        'https://image.tmdb.org/t/p/original/z53D72EAOxGRqdr7KXXWp9dJiDe.jpg',
      backdrop_path:
        'https://image.tmdb.org/t/p/original/1p5aI299YBnqrEEvVGJERk2MXXb.jpg',
    },
    {
      poster_path:
        'https://image.tmdb.org/t/p/original/m9EtP1Yrzv6v7dMaC9mRaGhd1um.jpg',
      backdrop_path:
        'https://image.tmdb.org/t/p/original/rthMuZfFv4fqEU4JVbgSW9wQ8rs.jpg',
    },
  ];

  const mappings = {
    posters: {},
    backdrops: {},
  };

  dummyShowsData.forEach((show, index) => {
    if (show.poster_path) {
      const filename = getFilenameFromUrl(show.poster_path);
      mappings.posters[show.poster_path] = `/images/posters/${filename}`;
    }
    if (show.backdrop_path) {
      const filename = getFilenameFromUrl(show.backdrop_path);
      mappings.backdrops[show.backdrop_path] = `/images/backdrops/${filename}`;
    }
  });

  return mappings;
}

// Main
const mappings = createPostandBackdropMappings();
const imageMappingsPath = path.join(
  __dirname,
  '../../src/assets/imageMappings.json',
);
const existingMappings = JSON.parse(
  fs.readFileSync(imageMappingsPath, 'utf-8'),
);

existingMappings.posters = mappings.posters;
existingMappings.backdrops = mappings.backdrops;

fs.writeFileSync(imageMappingsPath, JSON.stringify(existingMappings, null, 2));

console.log('✓ Poster and backdrop mappings updated!');
console.log('\nPoster mappings:');
Object.entries(mappings.posters)
  .slice(0, 5)
  .forEach(([url, path]) => {
    console.log(`  ${url.substring(0, 50)}... → ${path}`);
  });
console.log('\nBackdrop mappings:');
Object.entries(mappings.backdrops)
  .slice(0, 5)
  .forEach(([url, path]) => {
    console.log(`  ${url.substring(0, 50)}... → ${path}`);
  });
