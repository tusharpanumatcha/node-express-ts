import mongoose from 'mongoose';
import { config } from './env';

/** Hides the password part of a connection string before logging it. */
function redact(uri: string): string {
    return uri.replace(/\/\/([^:/@]+):([^@]+)@/, '//$1:****@');
}

/** true for mongodb://localhost / 127.0.0.1 / ::1 connection strings. */
export function isLocalUri(uri: string): boolean {
    return /^mongodb:\/\/([^@/]*@)?(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$|\?)/i.test(uri.trim());
}

let listenersAdded = false;

export async function connectDB(uri: string = config.mongoUri): Promise<typeof mongoose> {
    // A local server either answers right away or isn't running, so don't wait long for it.
    const timeout = isLocalUri(uri) ? 3000 : 10000;
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: timeout });
    console.log(`MongoDB connected: ${redact(uri)}`);

    if (!listenersAdded) {
        listenersAdded = true;
        mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
        mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'));
    }
    return conn;
}

export async function disconnectDB(): Promise<void> {
    await mongoose.disconnect();
}
