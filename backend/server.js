/* ============================================
   [Kyori] Digital Dream - Backend Server
   Express server for tablet HUD MOAP system
   ============================================ */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./db');
const Message = require('./models/Message');
const SlAction = require('./models/SlAction');

const weatherRoutes = require('./routes/weather');
const messagesRoutes = require('./routes/messages');
const marketplaceRoutes = require('./routes/marketplace');
const profileRoutes = require('./routes/profile');
const contactsRoutes = require('./routes/contacts');
const appDataRoutes = require('./routes/appdata');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(helmet({
    contentSecurityPolicy: false,   // MOAP/CEF needs inline scripts
    crossOriginEmbedderPolicy: false
}));
app.use(cors({
    origin: !process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS === '*' ? '*' : process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
}));
app.use(express.json({ limit: '1mb' }));

// Rate limiting — general API
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,           // 1 minute
    max: 120,                       // 120 requests per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, slow down.' }
});
app.use('/api/', apiLimiter);

// Stricter rate limit for write endpoints
const writeLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { error: 'Too many write requests.' }
});
app.use('/api/profile', writeLimiter);
app.use('/api/appdata', writeLimiter);
app.use('/api/messages/send', writeLimiter);

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// --- Health check ---
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', version: '2.1.0', timestamp: new Date().toISOString() });
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
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/appdata', appDataRoutes);

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
