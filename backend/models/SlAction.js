/* ============================================
   [Kyori] Digital Dream - SL Action Model
   Mongoose schema for pending SL actions
   ============================================ */

const mongoose = require('mongoose');

const slActionSchema = new mongoose.Schema({
    uuid:      { type: String, required: true, index: true },
    action:    { type: String, required: true },
    recipient: { type: String, default: null },
    text:      { type: String, default: null },
    status:    { type: String, default: 'pending' },
    created:   { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('SlAction', slActionSchema);
