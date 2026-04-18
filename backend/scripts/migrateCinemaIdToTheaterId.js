/**
 * Migration script: rename cinema_id → theater_id in the rooms collection
 * Steps:
 *  1. Drop old unique index  cinema_id_1_name_1
 *  2. $rename cinema_id → theater_id on all documents
 *  3. Create new unique index  theater_id_1_name_1
 * Run: node scripts/migrateCinemaIdToTheaterId.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/movie-booking';

const run = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected:', mongoose.connection.host);

    const db = mongoose.connection.db;
    const collection = db.collection('rooms');

    // ── Step 1: Drop old index if it exists ─────────────────────────────
    console.log('\n📌 Step 1 — Dropping old index cinema_id_1_name_1...');
    const indexes = await collection.indexes();
    const oldIndex = indexes.find((i) => i.name === 'cinema_id_1_name_1');
    if (oldIndex) {
      await collection.dropIndex('cinema_id_1_name_1');
      console.log('   ✔ Old index dropped.');
    } else {
      console.log('   ℹ️  Index not found, skipping drop.');
    }

    // ── Step 2: Rename field ─────────────────────────────────────────────
    console.log('\n📌 Step 2 — Renaming cinema_id → theater_id...');
    const oldCount = await collection.countDocuments({
      cinema_id: { $exists: true },
    });
    console.log(`   Documents with cinema_id: ${oldCount}`);

    if (oldCount > 0) {
      const result = await collection.updateMany(
        { cinema_id: { $exists: true } },
        { $rename: { cinema_id: 'theater_id' } },
      );
      console.log(`   ✔ Matched : ${result.matchedCount}`);
      console.log(`   ✔ Modified: ${result.modifiedCount}`);
    } else {
      console.log('   ℹ️  No documents to migrate.');
    }

    // ── Step 3: Create new index ─────────────────────────────────────────
    console.log('\n📌 Step 3 — Creating new index theater_id_1_name_1...');
    await collection.createIndex(
      { theater_id: 1, name: 1 },
      { unique: true, name: 'theater_id_1_name_1' },
    );
    console.log('   ✔ New index created.');

    // ── Verify ────────────────────────────────────────────────────────────
    const verifyCount = await collection.countDocuments({
      theater_id: { $exists: true },
    });
    console.log(`\n🔍 Rooms now with theater_id: ${verifyCount}`);

    await mongoose.disconnect();
    console.log('🏁 Migration complete!\n');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
};

run();
