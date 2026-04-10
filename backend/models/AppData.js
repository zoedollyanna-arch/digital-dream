/* ============================================
   [Kyori] Digital Dream - AppData Model
   Generic per-user, per-app data storage
   Replaces localStorage for app data persistence
   ============================================ */

const mongoose = require('mongoose');

const appDataSchema = new mongoose.Schema({
    owner:  { type: String, required: true, index: true },   // avatar UUID
    app:    { type: String, required: true },                 // app key e.g. 'notes', 'journal', 'todo'
    data:   { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

// One doc per user per app
appDataSchema.index({ owner: 1, app: 1 }, { unique: true });

module.exports = mongoose.model('AppData', appDataSchema);
