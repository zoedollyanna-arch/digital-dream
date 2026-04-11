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
                notifications, installedApps,
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
        if (notifications !== undefined) {
            var feedVal = notifications.feedNotifs !== undefined ? notifications.feedNotifs : notifications.discordNotifs;
            update.notifications = {
                notifs:         notifications.notifs !== false,
                discordNotifs:  feedVal !== false,
                sound:          notifications.sound === true
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
        // Progressive leveling: level n requires 25*n*(n-1) cumulative XP
        let level = 1;
        while (25 * level * (level + 1) <= xp) level++;
        res.json({ ok: true, xp, level });
    } catch (err) {
        console.error('[Profile] XP error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/profile/coins — Add or spend coins (server-side atomic)
router.post('/coins', async (req, res) => {
    try {
        const { uuid, amount } = req.body;
        if (!validUuid(uuid)) return res.status(400).json({ error: 'Invalid uuid' });
        const amt = Math.max(-1000, Math.min(1000, parseInt(amount, 10) || 0));

        if (amt < 0) {
            // Spending: ensure they have enough
            const profile = await Profile.findOne({ uuid });
            if (!profile || (profile.coins || 0) < Math.abs(amt)) {
                return res.status(400).json({ error: 'Not enough coins' });
            }
        }

        const profile = await Profile.findOneAndUpdate(
            { uuid },
            { $inc: { coins: amt } },
            { upsert: true, new: true }
        );
        res.json({ ok: true, coins: Math.max(0, profile.coins || 0) });
    } catch (err) {
        console.error('[Profile] Coins error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/profile/daily-reward — Claim daily reward (server-side, prevents double-claim)
// Streak-scaled: longer streaks give better rewards
router.post('/daily-reward', async (req, res) => {
    try {
        const { uuid } = req.body;
        if (!validUuid(uuid)) return res.status(400).json({ error: 'Invalid uuid' });

        const today = new Date().toISOString().slice(0, 10);
        const profile = await Profile.findOne({ uuid });

        // Streak-scaled reward amounts
        function rewardAmounts(streak) {
            const bonus = Math.min(streak, 10);
            return { coins: 25 + bonus * 5, xp: 15 + bonus * 2 };
        }

        if (!profile) {
            const amounts = rewardAmounts(1);
            await Profile.create({ uuid, rewardLast: today, rewardStreak: 1, coins: amounts.coins, xp: amounts.xp });
            return res.json({ ok: true, claimed: true, streak: 1, coins: amounts.coins, xp: amounts.xp, bonusCoins: amounts.coins, bonusXp: amounts.xp });
        }

        if (profile.rewardLast === today) {
            return res.json({ ok: true, claimed: false, streak: profile.rewardStreak || 0, coins: profile.coins || 0 });
        }

        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const streak = (profile.rewardLast === yesterday) ? (profile.rewardStreak || 0) + 1 : 1;
        const amounts = rewardAmounts(streak);

        await Profile.updateOne({ uuid }, {
            $set: { rewardLast: today, rewardStreak: streak },
            $inc: { coins: amounts.coins, xp: amounts.xp }
        });
        const updated = await Profile.findOne({ uuid }).lean();
        res.json({ ok: true, claimed: true, streak, coins: updated.coins, xp: updated.xp, bonusCoins: amounts.coins, bonusXp: amounts.xp });
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
