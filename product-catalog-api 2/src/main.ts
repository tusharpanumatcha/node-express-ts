import { config } from './config/env';
import { connectDB, disconnectDB, isLocalUri } from './config/db';
import { createApp } from './app';
import { printRoutes } from './helper/routes';

let usingMemoryDb = config.useMemoryDb;

/** Fake database: in-memory MongoDB, filled with src/data/api-data.json on every start. */
async function useMemoryDatabase() {
    usingMemoryDb = true;
    const { startMemoryDB, stopMemoryDB } = await import('./config/memory-db');
    const { seedDatabase } = await import('./scripts/seed-data');
    onShutdown(stopMemoryDB);
    const uri = await startMemoryDB();
    await connectDB(uri);
    const counts = await seedDatabase();
    console.log(
        `Using IN-MEMORY database with ${counts.categories} categories and ${counts.products} products ` +
            '(data resets when the server restarts).'
    );
}

async function main() {
    if (config.useMemoryDb) {
        await useMemoryDatabase();
    } else {
        try {
            await connectDB();
        } catch (err: any) {
            // During development, if no local MongoDB is running, fall back to the fake database
            // instead of failing. A remote database (e.g. Atlas) or production still fails loudly.
            const canFallBack = isLocalUri(config.mongoUri) && process.env.NODE_ENV !== 'production';
            if (!canFallBack) throw err;
            await disconnectDB().catch(() => undefined);
            console.warn(`No MongoDB is running at ${config.mongoUri} (${err.message ?? err}).`);
            console.warn('Falling back to the fake in-memory database...');
            await useMemoryDatabase();
        }
    }

    const app = createApp();
    const server = app.listen(config.port, () => {
        printRoutes(app, `http://localhost:${config.port}`);
        console.log(`Server is running in http://localhost:${config.port}`);
    });
    onShutdown(() => new Promise<void>((resolve) => server.close(() => resolve())));
}

// Cleanup steps run in reverse order on Ctrl+C / restart.
const cleanups: (() => Promise<void>)[] = [];
function onShutdown(fn: () => Promise<void>) {
    cleanups.unshift(fn);
}

let shuttingDown = false;
async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received, shutting down...`);
    await disconnectDB().catch(() => undefined);
    for (const fn of cleanups) await fn().catch(() => undefined);
    process.exit(0);
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

main().catch(async (err) => {
    console.error('Failed to start the server:', err.message ?? err);
    if (usingMemoryDb) {
        console.error('The in-memory database could not start. Check your internet connection for the first-run download.');
    } else {
        console.error('Check that MongoDB is running and MONGODB_URI in your .env is correct.');
        console.error('No MongoDB? Use the fake in-memory database instead:  npm run dev:memory');
    }
    for (const fn of cleanups) await fn().catch(() => undefined);
    process.exit(1);
});
