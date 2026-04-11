/* ============================================
   [Kyori] Digital Dream - AppData API Route
   Generic get/save for per-user app data
   ============================================ */

const express = require('express');
const router = express.Router();
const AppData = require('../models/AppData');

const ALLOWED_APPS = ['notes', 'journal', 'todo', 'photos', 'doodle', 'calculator', 'trivia', 'memory', 'snake', 'tictactoe', 'focus', 'moodvibes', 'selfcare', 'dreamplanner', 'stickers', 'moodboard', 'wouldyourather', 'quizdaily', 'petbuddy'];
const MAX_DATA_SIZE = 500000; // ~500KB limit per app
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/appdata?uuid=X&app=Y — Load data for one app
router.get('/', async (req, res) => {
    try {
        const uuid = String(req.query.uuid || '');
        const app = String(req.query.app || '');
        if (!uuid || !UUID_RE.test(uuid)) return res.status(400).json({ error: 'Invalid uuid' });
        if (!ALLOWED_APPS.includes(app)) return res.status(400).json({ error: 'Invalid app key' });

        const doc = await AppData.findOne({ owner: uuid, app }).lean();
        res.json({ found: !!doc, data: doc ? doc.data : null });
    } catch (err) {
        console.error('[AppData] GET error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/appdata — Save data for one app (upsert)
router.post('/', async (req, res) => {
    try {
        const uuid = String(req.body.uuid || '');
        const app = String(req.body.app || '');
        const data = req.body.data;
        if (!uuid || !UUID_RE.test(uuid)) return res.status(400).json({ error: 'Invalid uuid' });
        if (!ALLOWED_APPS.includes(app)) return res.status(400).json({ error: 'Invalid app key' });

        // Size guard
        const size = JSON.stringify(data).length;
        if (size > MAX_DATA_SIZE) {
            return res.status(413).json({ error: 'Data too large (max 500KB)' });
        }

        await AppData.findOneAndUpdate(
            { owner: uuid, app },
            { $set: { data } },
            { upsert: true }
        );

        res.json({ ok: true });
    } catch (err) {
        console.error('[AppData] POST error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
