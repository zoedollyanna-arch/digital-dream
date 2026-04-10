/* ============================================
   [Kyori] Digital Dream - Backend Server
   Express server for tablet HUD MOAP system
   ============================================ */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./db');
const Message = require('./models/Message');
const SlAction = require('./models/SlAction');

const weatherRoutes = require('./routes/weather');
const messagesRoutes = require('./routes/messages');
const discordRoutes = require('./routes/discord');
const marketplaceRoutes = require('./routes/marketplace');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS === '*' ? '*' : process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
}));
app.use(express.json({ limit: '1mb' }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// --- Health check ---
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// --- LSL Bridge endpoint (receives data from SL scripts via llHTTPRequest) ---
app.post('/api/sl/bridge', async (req, res) => {
    const { action, uuid, name, data } = req.body;
    if (!action) return res.status(400).json({ error: 'Missing action' });

    try {
        switch (action) {
            case 'REGISTER':
                console.log('[SL Bridge] Registered:', name, uuid);
                res.json({ ok: true });
                break;

            case 'IM_RECEIVED':
                if (data && data.from && data.message) {
                    await Message.create({
                        sender: data.from,
                        senderName: data.fromName || 'Unknown',
                        recipient: uuid,
                        recipientName: name || 'Unknown',
                        text: data.message,
                        time: new Date().toISOString()
                    });
                }
                res.json({ ok: true });
                break;

            case 'POLL_ACTIONS': {
                const pending = await SlAction.find({
                    uuid: uuid || '',
                    status: 'pending'
                })
                .limit(5)
                .select('recipient text')
                .lean();

                if (pending.length > 0) {
                    const ids = pending.map(p => p._id);
                    await SlAction.updateMany(
                        { _id: { $in: ids } },
                        { $set: { status: 'sent' } }
                    );
                }

                // Map _id to id for LSL compatibility
                const actions = pending.map(p => ({
                    id: p._id,
                    target: p.recipient,
                    message: p.text
                }));

                res.json({ actions });
                break;
            }

            default:
                res.json({ ok: true });
        }
    } catch (err) {
        console.error('[SL Bridge] Error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- API Routes ---
app.use('/api/weather', weatherRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/discord', discordRoutes);
app.use('/api/marketplace', marketplaceRoutes);

// --- Fallback: serve index.html for unmatched routes ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// --- Start (connect DB first, then listen) ---
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log('[Digital Dream] Server running on port ' + PORT);
        console.log('[Digital Dream] Frontend: http://localhost:' + PORT);
        console.log('[Digital Dream] API: http://localhost:' + PORT + '/api/health');
    });
});
