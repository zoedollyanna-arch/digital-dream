/* ============================================
   [Kyori] Digital Dream - MongoDB Connection
   Mongoose connection manager
   ============================================ */

const mongoose = require('mongoose');

let isConnected = false;

async function connectDB() {
    if (isConnected) return;

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('[DB] MONGODB_URI not set — add it in Render Environment tab');
        process.exit(1);
    }

    console.log('[DB] Connecting to MongoDB Atlas...');
    try {
        await mongoose.connect(uri, { dbName: 'digitaldream', serverSelectionTimeoutMS: 10000 });
        isConnected = true;
        console.log('[DB] Connected to MongoDB Atlas');
    } catch (err) {
        console.error('[DB] Connection failed:', err.message);
        console.error('[DB] Check: 1) MONGODB_URI is correct  2) Atlas Network Access allows 0.0.0.0/0');
        process.exit(1);
    }

    mongoose.connection.on('error', (err) => {
        console.error('[DB] MongoDB error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
        isConnected = false;
        console.warn('[DB] MongoDB disconnected');
    });
}

module.exports = { connectDB };
