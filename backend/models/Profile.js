/* ============================================
   [Kyori] Digital Dream - Profile Model
   Mongoose schema for user profile/settings persistence
   ============================================ */

const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
    uuid:           { type: String, required: true, unique: true, index: true },
    name:           { type: String, default: 'Dreamer', maxlength: 60 },
    theme:          { type: String, default: 'light', maxlength: 20 },
    wallpaper:      { type: String, default: '', maxlength: 30 },
    zoom:           { type: Number, default: 150, min: 100, max: 200 },
    onboarded:      { type: Boolean, default: false },
    notifications:  {
        notifs:         { type: Boolean, default: true },
        discordNotifs:  { type: Boolean, default: true },
        sound:          { type: Boolean, default: false }
    },
    discord:        {
        webhook:  { type: String, default: '', maxlength: 200 },
        name:     { type: String, default: '', maxlength: 60 },
        channel:  { type: String, default: 'general', maxlength: 40 }
    },
    installedApps:  [{ type: String, maxlength: 30 }],

    // Gamification (backend is source of truth)
    xp:             { type: Number, default: 0, min: 0 },
    coins:          { type: Number, default: 0, min: 0 },
    rewardLast:     { type: String, default: '' },
    rewardStreak:   { type: Number, default: 0, min: 0 },

    // Streaks (for badge calculations)
    focusSessions:      { type: Number, default: 0, min: 0 },
    selfcareStreak:     { type: Number, default: 0, min: 0 },
    friendshipStreak:   { type: Number, default: 0, min: 0 },
    moodStreak:         { type: Number, default: 0, min: 0 },

    // Home screen preferences
    favoriteApps:   [{ type: String, maxlength: 30 }],
    recentApps:     [{ type: String, maxlength: 30 }],
    dnd:            { type: Boolean, default: false },
    unlock:         { type: Boolean, default: true },

    // Journal lock PIN (hashed)
    journalPin:     { type: String, default: '', maxlength: 128 }
}, { timestamps: true });

module.exports = mongoose.model('Profile', profileSchema);
