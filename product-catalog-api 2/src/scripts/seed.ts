/**
 * Loads src/data/api-data.json into the MongoDB from MONGODB_URI.
 *
 *   npm run seed              -> adds missing categories/products, updates existing ones (matched by name)
 *   npm run seed -- --fresh   -> deletes ALL categories and products first, then inserts the data
 *
 * (Not needed with `npm run dev:memory` - the in-memory database is seeded automatically.)
 */
import { connectDB, disconnectDB } from '../config/db';
import { seedDatabase } from './seed-data';

async function seed() {
    const fresh = process.argv.includes('--fresh');
    await connectDB();
    if (fresh) console.log('Clearing categories and products...');
    const counts = await seedDatabase({ fresh });
    console.log(`Seed complete: ${counts.categories} categories, ${counts.products} products in the database.`);
}

seed()
    .catch((err) => {
        console.error('Seeding failed:', err.message ?? err);
        process.exitCode = 1;
    })
    .finally(() => disconnectDB());
