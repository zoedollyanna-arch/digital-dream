/* ============================================
   [Kyori] Digital Dream - Profile Model
   Mongoose schema for user profile/settings persistence
   ============================================ */

const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
    uuid:           { type: String, required: true, unique: true, index: true },
    name:           { type: String, default: 'Dreamer' },
    theme:          { type: String, default: 'light' },
    wallpaper:      { type: String, default: '' },
    zoom:           { type: Number, default: 150 },
    onboarded:      { type: Boolean, default: false },
    notifications:  {
        notifs:         { type: Boolean, default: true },
        discordNotifs:  { type: Boolean, default: true },
        sound:          { type: Boolean, default: false }
    },
    discord:        {
        webhook:  { type: String, default: '' },
        name:     { type: String, default: '' },
        channel:  { type: String, default: 'general' }
    },
    installedApps:  [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('Profile', profileSchema);
