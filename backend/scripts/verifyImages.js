import mongoose from 'mongoose';
import Movie from '../models/Movie.js';
import dotenv from 'dotenv';

dotenv.config();

async function verifyImages() {
  try {
    console.log('Connecting to database...\n');
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/movie-booking',
    );

    console.log('Fetching movies with updated image paths...\n');
    const movies = await Movie.find();

    console.log(`Total movies in database: ${movies.length}\n`);

    movies.forEach((movie) => {
      console.log(`\n📽️  Movie: ${movie.title}`);
      console.log(`  ├─ Poster: ${movie.poster_path || 'N/A'}`);
      console.log(`  ├─ Backdrop: ${movie.backdrop_path || 'N/A'}`);
      if (movie.casts && movie.casts.length > 0) {
        const castExample =
          Array.isArray(movie.casts) && typeof movie.casts[0] === 'object'
            ? movie.casts[0].profile_path
            : 'N/A';
        console.log(`  └─ Cast (example): ${castExample}`);
      }
    });

    // Summary statistics
    const postersInPublic = movies.filter(
      (m) => m.poster_path && m.poster_path.startsWith('/images/'),
    ).length;
    const backdropsInPublic = movies.filter(
      (m) => m.backdrop_path && m.backdrop_path.startsWith('/images/'),
    ).length;
    const castsInPublic = movies.filter(
      (m) =>
        m.casts &&
        m.casts.some(
          (c) =>
            (typeof c === 'object' &&
              c.profile_path &&
              c.profile_path.startsWith('/images/')) ||
            (typeof c === 'string' && c.startsWith('/images/')),
        ),
    ).length;

    console.log('\n\n📊 Summary:');
    console.log(
      `✓ Posters using local paths: ${postersInPublic}/${movies.length}`,
    );
    console.log(
      `✓ Backdrops using local paths: ${backdropsInPublic}/${movies.length}`,
    );
    console.log(`✓ Movies with cast images: ${castsInPublic}/${movies.length}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

verifyImages();
