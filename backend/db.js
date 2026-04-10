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
        console.error('[DB] MONGODB_URI not set in .env');
        process.exit(1);
    }

    try {
        await mongoose.connect(uri, { dbName: 'digitaldream' });
        isConnected = true;
        console.log('[DB] Connected to MongoDB Atlas');
    } catch (err) {
        console.error('[DB] Connection failed:', err.message);
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
