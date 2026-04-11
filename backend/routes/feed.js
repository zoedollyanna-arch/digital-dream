/* ============================================
   [Kyori] Digital Dream - Feed Routes
   Shared social feed endpoints
   GET  /api/feed         — fetch latest posts
   POST /api/feed         — create a post
   POST /api/feed/:id/like — toggle like
   DELETE /api/feed/:id   — delete own post
   ============================================ */

const express = require('express');
const router = express.Router();
const FeedPost = require('../models/FeedPost');

// UUID format check
const validUuid = (u) => typeof u === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(u);

// GET /api/feed?uuid=<viewer>&limit=50&before=<isoDate>
router.get('/', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
        const query = {};
        if (req.query.before) {
            const d = new Date(req.query.before);
            if (!isNaN(d.getTime())) query.createdAt = { $lt: d };
        }

        const viewerUuid = req.query.uuid || '';

        const posts = await FeedPost.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        const result = posts.map(p => ({
            id:         p._id,
            authorUuid: p.authorUuid,
            author:     p.authorName,
            text:       p.text,
            mood:       p.mood || '',
            likes:      p.likes ? p.likes.length : 0,
            liked:      p.likes ? p.likes.includes(viewerUuid) : false,
            time:       p.createdAt
        }));

        res.json({ posts: result });
    } catch (err) {
        console.error('[Feed] GET error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/feed — create a new post
router.post('/', async (req, res) => {
    try {
        const { uuid, name, text, mood } = req.body;
        if (!validUuid(uuid)) return res.status(400).json({ error: 'Invalid uuid' });
        if (!text || typeof text !== 'string' || !text.trim()) return res.status(400).json({ error: 'Text required' });

        const post = await FeedPost.create({
            authorUuid: uuid,
            authorName: String(name || 'Dreamer').substring(0, 60),
            text:       text.trim().substring(0, 280),
            mood:       String(mood || '').substring(0, 4),
            likes:      []
        });

        res.json({
            ok: true,
            post: {
                id:         post._id,
                authorUuid: post.authorUuid,
                author:     post.authorName,
                text:       post.text,
                mood:       post.mood,
                likes:      0,
                liked:      false,
                time:       post.createdAt
            }
        });
    } catch (err) {
        console.error('[Feed] POST error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/feed/:id/like — toggle like
router.post('/:id/like', async (req, res) => {
    try {
        const { uuid } = req.body;
        if (!validUuid(uuid)) return res.status(400).json({ error: 'Invalid uuid' });

        const post = await FeedPost.findById(req.params.id);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        const idx = post.likes.indexOf(uuid);
        if (idx === -1) {
            post.likes.push(uuid);
        } else {
            post.likes.splice(idx, 1);
        }
        await post.save();

        res.json({ ok: true, likes: post.likes.length, liked: post.likes.includes(uuid) });
    } catch (err) {
        console.error('[Feed] LIKE error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/feed/:id — delete own post
router.delete('/:id', async (req, res) => {
    try {
        const { uuid } = req.body;
        if (!validUuid(uuid)) return res.status(400).json({ error: 'Invalid uuid' });

        const post = await FeedPost.findById(req.params.id);
        if (!post) return res.status(404).json({ error: 'Post not found' });
        if (post.authorUuid !== uuid) return res.status(403).json({ error: 'Not your post' });

        await post.deleteOne();
        res.json({ ok: true });
    } catch (err) {
        console.error('[Feed] DELETE error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
