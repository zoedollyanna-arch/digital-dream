/* ============================================
   [Kyori] Digital Dream - Messages API Route
   Chat/messaging system with MongoDB storage
   ============================================ */

const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const SlAction = require('../models/SlAction');

// GET /api/messages?uuid=X&contact=Y
router.get('/', async (req, res) => {
    try {
        const uuid = req.query.uuid;
        const contact = req.query.contact;
        if (!uuid || !contact) return res.status(400).json({ error: 'Missing uuid or contact' });

        const messages = await Message.find({
            $or: [
                { sender: uuid, recipient: contact },
                { sender: contact, recipient: uuid }
            ]
        })
        .sort({ createdAt: 1 })
        .limit(100)
        .select('sender senderName recipient text time')
        .lean();

        // Mark as read
        await Message.updateMany(
            { sender: contact, recipient: uuid, read: false },
            { $set: { read: true } }
        );

        res.json({ messages });
    } catch (err) {
        console.error('[Messages] GET / error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/messages/conversations?uuid=X
router.get('/conversations', async (req, res) => {
    try {
        const uuid = req.query.uuid;
        if (!uuid) return res.status(400).json({ error: 'Missing uuid' });

        const conversations = await Message.aggregate([
            // Match messages involving this user
            { $match: { $or: [{ sender: uuid }, { recipient: uuid }] } },
            // Compute the contact id and name
            { $addFields: {
                contactId: { $cond: [{ $eq: ['$sender', uuid] }, '$recipient', '$sender'] },
                contactName: { $cond: [{ $eq: ['$sender', uuid] }, '$recipientName', '$senderName'] }
            }},
            // Sort by newest first so $first picks latest
            { $sort: { createdAt: -1 } },
            // Group by contact
            { $group: {
                _id: '$contactId',
                name: { $first: '$contactName' },
                lastMessage: { $first: '$text' },
                lastTime: { $first: '$time' },
                messages: { $push: { sender: '$sender', read: '$read' } }
            }},
            // Compute unread count (messages FROM contact TO this user that are unread)
            { $addFields: {
                unread: {
                    $size: {
                        $filter: {
                            input: '$messages',
                            cond: { $and: [{ $ne: ['$$this.sender', uuid] }, { $eq: ['$$this.read', false] }] }
                        }
                    }
                }
            }},
            { $project: { id: '$_id', name: 1, lastMessage: 1, lastTime: 1, unread: 1, _id: 0 } },
            { $sort: { lastTime: -1 } },
            { $limit: 50 }
        ]);

        res.json({ conversations });
    } catch (err) {
        console.error('[Messages] GET /conversations error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/messages/unread?uuid=X
router.get('/unread', async (req, res) => {
    try {
        const uuid = req.query.uuid;
        if (!uuid) return res.status(400).json({ error: 'Missing uuid' });

        const count = await Message.countDocuments({ recipient: uuid, read: false });
        res.json({ count });
    } catch (err) {
        console.error('[Messages] GET /unread error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/messages/send
router.post('/send', async (req, res) => {
    try {
        const { sender, senderName, recipient, recipientName, text } = req.body;
        if (!sender || !recipient || !text) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const cleanText = String(text).substring(0, 1000);
        const time = new Date().toISOString();

        await Message.create({
            sender,
            senderName: senderName || 'Unknown',
            recipient,
            recipientName: recipientName || 'Unknown',
            text: cleanText,
            time
        });

        // Also create an SL action so LSL can send as IM
        await SlAction.create({
            uuid: sender,
            action: 'SEND_IM',
            recipient,
            text: cleanText,
            status: 'pending',
            created: time
        });

        res.json({ ok: true, time });
    } catch (err) {
        console.error('[Messages] POST /send error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
