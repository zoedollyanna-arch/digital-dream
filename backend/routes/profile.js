/* ============================================
   [Kyori] Digital Dream - Profile API Route
   Save/load user profile & settings for persistence
   ============================================ */

const express = require('express');
const router = express.Router();
const Profile = require('../models/Profile');

// UUID format check (standard 8-4-4-4-12 or SL key)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validUuid(v) { return typeof v === 'string' && UUID_RE.test(v); }

// GET /api/profile?uuid=X — Load full profile (source of truth)
router.get('/', async (req, res) => {
    try {
        const uuid = String(req.query.uuid || '');
        if (!validUuid(uuid)) return res.status(400).json({ error: 'Invalid uuid' });

        const profile = await Profile.findOne({ uuid }).lean();
        if (!profile) return res.json({ found: false });

        res.json({
            found: true,
            profile: {
                uuid: profile.uuid,
                name: profile.name,
                theme: profile.theme,
                wallpaper: profile.wallpaper,
                zoom: profile.zoom,
                onboarded: profile.onboarded,
                notifications: profile.notifications,
                discord: profile.discord,
                installedApps: profile.installedApps || [],
                xp: profile.xp || 0,
                coins: profile.coins || 0,
                rewardLast: profile.rewardLast || '',
                rewardStreak: profile.rewardStreak || 0,
                focusSessions: profile.focusSessions || 0,
                selfcareStreak: profile.selfcareStreak || 0,
                friendshipStreak: profile.friendshipStreak || 0,
                moodStreak: profile.moodStreak || 0,
                favoriteApps: profile.favoriteApps || [],
                recentApps: profile.recentApps || [],
                dnd: profile.dnd || false,
                unlock: profile.unlock !== false,
                journalPin: profile.journalPin ? '****' : ''
            }
        });
    } catch (err) {
        console.error('[Profile] GET error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/profile — Save/update profile (upsert)
router.post('/', async (req, res) => {
    try {
        const { uuid, name, theme, wallpaper, zoom, onboarded,
                notifications, discord, installedApps,
                favoriteApps, recentApps, dnd, unlock, journalPin } = req.body;

        if (!validUuid(uuid)) return res.status(400).json({ error: 'Invalid uuid' });

        const update = {};
        if (name !== undefined)          update.name = String(name).substring(0, 60);
        if (theme !== undefined)         update.theme = String(theme).substring(0, 20);
        if (wallpaper !== undefined)     update.wallpaper = String(wallpaper).substring(0, 30);
        if (zoom !== undefined)          update.zoom = Math.max(100, Math.min(200, Number(zoom) || 150));
        if (onboarded !== undefined)     update.onboarded = Boolean(onboarded);
        if (dnd !== undefined)           update.dnd = Boolean(dnd);
        if (unlock !== undefined)        update.unlock = Boolean(unlock);
        if (journalPin !== undefined)    update.journalPin = String(journalPin).substring(0, 128);
        if (notifications !== undefined) update.notifications = {
            notifs:         notifications.notifs !== false,
            discordNotifs:  notifications.discordNotifs !== false,
            sound:          notifications.sound === true
        };
        if (discord !== undefined) {
            var wh = String(discord.webhook || '').substring(0, 200);
            // Only allow real Discord webhook URLs or empty
            if (wh && !wh.startsWith('https://discord.com/api/webhooks/')) wh = '';
            update.discord = {
                webhook:  wh,
                name:     String(discord.name || '').substring(0, 60),
                channel:  String(discord.channel || 'general').substring(0, 40)
            };
        }
        if (installedApps !== undefined && Array.isArray(installedApps)) {
            update.installedApps = installedApps
                .filter(a => typeof a === 'string')
                .map(a => a.substring(0, 30))
                .slice(0, 50);
        }
        if (favoriteApps !== undefined && Array.isArray(favoriteApps)) {
            update.favoriteApps = favoriteApps
                .filter(a => typeof a === 'string')
                .map(a => a.substring(0, 30))
                .slice(0, 8);
        }
        if (recentApps !== undefined && Array.isArray(recentApps)) {
            update.recentApps = recentApps
                .filter(a => typeof a === 'string')
                .map(a => a.substring(0, 30))
                .slice(0, 8);
        }

        await Profile.findOneAndUpdate(
            { uuid },
            { $set: update },
            { upsert: true, new: true }
        );

        res.json({ ok: true });
    } catch (err) {
        console.error('[Profile] POST error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/profile/xp — Award XP (server-side atomic)
router.post('/xp', async (req, res) => {
    try {
        const { uuid, amount } = req.body;
        if (!validUuid(uuid)) return res.status(400).json({ error: 'Invalid uuid' });
        const amt = Math.max(0, Math.min(500, parseInt(amount, 10) || 0));
        if (amt === 0) return res.json({ ok: true, xp: 0, level: 1 });

        const profile = await Profile.findOneAndUpdate(
            { uuid },
            { $inc: { xp: amt } },
            { upsert: true, new: true }
        );
        const xp = profile.xp || 0;
        res.json({ ok: true, xp, level: Math.floor(xp / 100) + 1 });
    } catch (err) {
        console.error('[Profile] XP error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/profile/coins — Add coins (server-side atomic)
router.post('/coins', async (req, res) => {
    try {
        const { uuid, amount } = req.body;
        if (!validUuid(uuid)) return res.status(400).json({ error: 'Invalid uuid' });
        const amt = Math.max(0, Math.min(1000, parseInt(amount, 10) || 0));

        const profile = await Profile.findOneAndUpdate(
            { uuid },
            { $inc: { coins: amt } },
            { upsert: true, new: true }
        );
        res.json({ ok: true, coins: profile.coins || 0 });
    } catch (err) {
        console.error('[Profile] Coins error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/profile/daily-reward — Claim daily reward (server-side, prevents double-claim)
router.post('/daily-reward', async (req, res) => {
    try {
        const { uuid } = req.body;
        if (!validUuid(uuid)) return res.status(400).json({ error: 'Invalid uuid' });

        const today = new Date().toISOString().slice(0, 10);
        const profile = await Profile.findOne({ uuid });
        if (!profile) {
            await Profile.create({ uuid, rewardLast: today, rewardStreak: 1, coins: 25, xp: 15 });
            return res.json({ ok: true, claimed: true, streak: 1, coins: 25, xp: 15 });
        }

        if (profile.rewardLast === today) {
            return res.json({ ok: true, claimed: false, streak: profile.rewardStreak || 0, coins: profile.coins || 0 });
        }

        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const streak = (profile.rewardLast === yesterday) ? (profile.rewardStreak || 0) + 1 : 1;

        await Profile.updateOne({ uuid }, {
            $set: { rewardLast: today, rewardStreak: streak },
            $inc: { coins: 25, xp: 15 }
        });
        const updated = await Profile.findOne({ uuid }).lean();
        res.json({ ok: true, claimed: true, streak, coins: updated.coins, xp: updated.xp });
    } catch (err) {
        console.error('[Profile] DailyReward error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/profile/streak — Update a streak counter
router.post('/streak', async (req, res) => {
    try {
        const { uuid, key, value } = req.body;
        if (!validUuid(uuid)) return res.status(400).json({ error: 'Invalid uuid' });
        const allowed = ['focusSessions', 'selfcareStreak', 'friendshipStreak', 'moodStreak'];
        if (!allowed.includes(key)) return res.status(400).json({ error: 'Invalid streak key' });
        const val = Math.max(0, Math.min(9999, parseInt(value, 10) || 0));

        await Profile.findOneAndUpdate(
            { uuid },
            { $set: { [key]: val } },
            { upsert: true }
        );
        res.json({ ok: true });
    } catch (err) {
        console.error('[Profile] Streak error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
