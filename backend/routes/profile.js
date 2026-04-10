/* ============================================
   [Kyori] Digital Dream - Profile API Route
   Save/load user profile & settings for persistence
   ============================================ */

const express = require('express');
const router = express.Router();
const Profile = require('../models/Profile');

// GET /api/profile?uuid=X — Load profile
router.get('/', async (req, res) => {
    try {
        const uuid = req.query.uuid;
        if (!uuid) return res.status(400).json({ error: 'Missing uuid' });

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
                installedApps: profile.installedApps
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
                notifications, discord, installedApps } = req.body;

        if (!uuid) return res.status(400).json({ error: 'Missing uuid' });

        const update = {};
        if (name !== undefined)          update.name = String(name).substring(0, 60);
        if (theme !== undefined)         update.theme = String(theme).substring(0, 20);
        if (wallpaper !== undefined)     update.wallpaper = String(wallpaper).substring(0, 30);
        if (zoom !== undefined)          update.zoom = Math.max(100, Math.min(200, Number(zoom) || 150));
        if (onboarded !== undefined)     update.onboarded = Boolean(onboarded);
        if (notifications !== undefined) update.notifications = {
            notifs:         notifications.notifs !== false,
            discordNotifs:  notifications.discordNotifs !== false,
            sound:          notifications.sound === true
        };
        if (discord !== undefined)       update.discord = {
            webhook:  String(discord.webhook || '').substring(0, 200),
            name:     String(discord.name || '').substring(0, 60),
            channel:  String(discord.channel || 'general').substring(0, 40)
        };
        if (installedApps !== undefined && Array.isArray(installedApps)) {
            update.installedApps = installedApps
                .filter(a => typeof a === 'string')
                .map(a => a.substring(0, 30))
                .slice(0, 50);
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

module.exports = router;
