/**
 * Fake database for local development: starts a throwaway MongoDB in memory.
 *
 * Used when the app is started with `--memory` (npm run dev:memory) or MONGODB_URI=memory.
 * Nothing is installed or configured - the first run downloads a MongoDB binary
 * (~100 MB, cached in ~/.cache/mongodb-binaries) and later runs start in a few seconds.
 * All data is lost when the server stops or restarts.
 */
import type { MongoMemoryServer } from 'mongodb-memory-server';

let server: MongoMemoryServer | undefined;

export async function startMemoryDB(): Promise<string> {
    let MongoMemory: typeof import('mongodb-memory-server');
    try {
        MongoMemory = await import('mongodb-memory-server');
    } catch {
        throw new Error(
            'mongodb-memory-server is not installed. Run `npm install` (it is a dev dependency), ' +
                'or set MONGODB_URI to a real database.'
        );
    }
    console.log('Starting in-memory MongoDB (first run downloads MongoDB, this can take a minute)...');
    server = await MongoMemory.MongoMemoryServer.create();
    return server.getUri('product-catalog');
}

export async function stopMemoryDB(): Promise<void> {
    if (server) {
        await server.stop();
        server = undefined;
    }
}
