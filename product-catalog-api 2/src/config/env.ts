// Loads variables from a .env file in the project root (if present) using
// Node's built-in loader (Node >= 20.12), so no dotenv dependency is needed.
try {
    process.loadEnvFile();
} catch {
    // No .env file - fall back to real environment variables / defaults.
}

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/product-catalog';

export const config = {
    port: Number(process.env.PORT) || 3000,
    mongoUri,
    /** true -> use a fake in-memory MongoDB (started with --memory, or MONGODB_URI=memory) */
    useMemoryDb: process.argv.includes('--memory') || mongoUri.trim().toLowerCase() === 'memory',
};
