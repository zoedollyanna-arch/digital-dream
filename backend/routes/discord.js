/* ============================================
   [Kyori] Digital Dream - Discord API Route
   Webhook-based Discord bridge
   ============================================ */

const express = require('express');
const router = express.Router();

// In-memory message log per channel (simple approach)
const channelMessages = {};
const MAX_MSG_PER_CHANNEL = 100;

// POST /api/discord/send  - Send a message via Discord webhook
router.post('/send', async (req, res) => {
    const { webhook, username, content } = req.body;

    if (!webhook || !content) {
        return res.status(400).json({ error: 'Missing webhook or content' });
    }

    // Validate webhook URL format
    if (!webhook.startsWith('https://discord.com/api/webhooks/')) {
        return res.status(400).json({ error: 'Invalid webhook URL' });
    }

    // Sanitize content
    const cleanContent = String(content).substring(0, 2000);
    const cleanName = String(username || 'Digital Dream').substring(0, 80);

    try {
        const response = await fetch(webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: cleanName,
                content: cleanContent
            })
        });

        if (!response.ok && response.status !== 204) {
            throw new Error('Discord webhook returned ' + response.status);
        }

        // Log message locally for channel display
        const channel = req.body.channel || 'general';
        if (!channelMessages[channel]) channelMessages[channel] = [];
        channelMessages[channel].push({
            sender: cleanName,
            text: cleanContent,
            time: new Date().toISOString()
        });
        if (channelMessages[channel].length > MAX_MSG_PER_CHANNEL) {
            channelMessages[channel].shift();
        }

        res.json({ ok: true });
    } catch (err) {
        console.error('[Discord]', err.message);
        res.status(502).json({ error: 'Failed to send to Discord' });
    }
});

// GET /api/discord/messages?channel=X  - Get cached messages for a channel
router.get('/messages', (req, res) => {
    const channel = req.query.channel || 'general';
    const messages = channelMessages[channel] || [];
    res.json({ messages, channel });
});

// POST /api/discord/incoming  - Webhook endpoint for Discord to POST to (for receiving messages)
// Configure a Discord bot or integration to POST here when messages arrive
router.post('/incoming', (req, res) => {
    const { channel, author, content, timestamp } = req.body;
    if (!content) return res.status(400).json({ error: 'Missing content' });

    const ch = channel || 'general';
    if (!channelMessages[ch]) channelMessages[ch] = [];
    channelMessages[ch].push({
        sender: author || 'Discord User',
        text: String(content).substring(0, 2000),
        time: timestamp || new Date().toISOString()
    });
    if (channelMessages[ch].length > MAX_MSG_PER_CHANNEL) {
        channelMessages[ch].shift();
    }

    res.json({ ok: true });
});

module.exports = router;
