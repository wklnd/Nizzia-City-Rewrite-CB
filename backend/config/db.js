const mongoose = require('mongoose');

require('dotenv').config();

// Prefer IPv4 loopback to avoid macOS ::1 resolution issues
const DEFAULT_URI = 'mongodb://127.0.0.1:27017/nizziacity';

function logConn(){
    const c = mongoose.connection;
    console.log(`Mongo connected: ${c.host}:${c.port}/${c.name}`);
}

function wireDiagnostics(){
    const c = mongoose.connection;
    c.on('error', (err) => console.error('[Mongo] error:', err?.message || err));
    c.on('disconnected', () => console.warn('[Mongo] disconnected'));
    c.on('reconnected', () => console.log('[Mongo] reconnected'));
}

const connectDB = async () => {
    const uri = process.env.MONGODB_URI || DEFAULT_URI;
    const opts = {
        // Reduce long hangs and prefer IPv4
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        family: 4,
        maxPoolSize: 10,
        minPoolSize: 0,
        autoIndex: true,
    };
    wireDiagnostics();

    const maxAttempts = 5;
    let attempt = 0;
    while (attempt < maxAttempts) {
        try {
            attempt++;
            await mongoose.connect(uri, opts);
            logConn();
            return;
        } catch (error) {
            console.error(`[Mongo] connect attempt ${attempt}/${maxAttempts} failed: ${error?.message || error}`);
            if (attempt >= maxAttempts) {
                console.error('[Mongo] giving up after max attempts');
                process.exit(1);
            }
            const backoffMs = Math.min(30000, attempt * 2000);
            await new Promise(res => setTimeout(res, backoffMs));
        }
    }
};

module.exports = connectDB;