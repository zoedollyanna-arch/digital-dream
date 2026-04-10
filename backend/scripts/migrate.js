/* ============================================
   [Kyori] Digital Dream - Migration Script
   Sets up MongoDB collections, indexes, and
   optionally seeds sample data.

   Usage:
     npm run migrate
     node scripts/migrate.js [--seed]
   ============================================ */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Message = require('../models/Message');
const SlAction = require('../models/SlAction');

const SEED_FLAG = process.argv.includes('--seed');

async function migrate() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('[Migrate] MONGODB_URI not set in .env');
        process.exit(1);
    }

    console.log('[Migrate] Connecting to MongoDB Atlas...');
    await mongoose.connect(uri, { dbName: 'digitaldream' });
    console.log('[Migrate] Connected.');

    // --- Ensure collections exist ---
    const db = mongoose.connection.db;
    const existing = (await db.listCollections().toArray()).map(c => c.name);

    for (const name of ['messages', 'slactions']) {
        if (!existing.includes(name)) {
            await db.createCollection(name);
            console.log(`[Migrate] Created collection: ${name}`);
        } else {
            console.log(`[Migrate] Collection already exists: ${name}`);
        }
    }

    // --- Sync indexes defined in schemas ---
    console.log('[Migrate] Syncing indexes for Message...');
    await Message.syncIndexes();
    console.log('[Migrate] Syncing indexes for SlAction...');
    await SlAction.syncIndexes();
    console.log('[Migrate] Indexes synced.');

    // --- Optional seed data ---
    if (SEED_FLAG) {
        console.log('[Migrate] Seeding sample data...');

        const msgCount = await Message.countDocuments();
        if (msgCount === 0) {
            const now = new Date().toISOString();
            await Message.insertMany([
                {
                    sender: '00000000-0000-0000-0000-000000000001',
                    senderName: 'Kyori Resident',
                    recipient: '00000000-0000-0000-0000-000000000002',
                    recipientName: 'Dream Tester',
                    text: 'Hey! Welcome to Digital Dream 🌙',
                    time: now,
                    read: false
                },
                {
                    sender: '00000000-0000-0000-0000-000000000002',
                    senderName: 'Dream Tester',
                    recipient: '00000000-0000-0000-0000-000000000001',
                    recipientName: 'Kyori Resident',
                    text: 'This tablet is so cool! 💜',
                    time: now,
                    read: false
                }
            ]);
            console.log('[Migrate] Inserted 2 sample messages.');
        } else {
            console.log(`[Migrate] Messages collection already has ${msgCount} docs, skipping seed.`);
        }

        const actionCount = await SlAction.countDocuments();
        if (actionCount === 0) {
            await SlAction.create({
                uuid: '00000000-0000-0000-0000-000000000001',
                action: 'SEND_IM',
                recipient: '00000000-0000-0000-0000-000000000002',
                text: 'Test IM from migration seed',
                status: 'pending',
                created: new Date().toISOString()
            });
            console.log('[Migrate] Inserted 1 sample SL action.');
        } else {
            console.log(`[Migrate] SlActions collection already has ${actionCount} docs, skipping seed.`);
        }
    }

    // --- Summary ---
    const msgTotal = await Message.countDocuments();
    const actTotal = await SlAction.countDocuments();
    const msgIndexes = await Message.collection.indexes();
    const actIndexes = await SlAction.collection.indexes();

    console.log('\n=== Migration Summary ===');
    console.log(`Messages:   ${msgTotal} documents, ${msgIndexes.length} indexes`);
    console.log(`SlActions:  ${actTotal} documents, ${actIndexes.length} indexes`);
    console.log('Indexes (messages):', msgIndexes.map(i => i.name).join(', '));
    console.log('Indexes (slactions):', actIndexes.map(i => i.name).join(', '));
    console.log('=========================\n');

    await mongoose.disconnect();
    console.log('[Migrate] Done. Disconnected.');
}

migrate().catch(err => {
    console.error('[Migrate] Fatal error:', err);
    process.exit(1);
});
