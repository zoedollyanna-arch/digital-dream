/* ============================================
   [Kyori] Digital Dream - Message Model
   Mongoose schema for chat messages
   ============================================ */

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender:         { type: String, required: true, index: true },
    senderName:     { type: String, default: 'Unknown' },
    recipient:      { type: String, required: true, index: true },
    recipientName:  { type: String, default: 'Unknown' },
    text:           { type: String, required: true },
    time:           { type: String, required: true },
    read:           { type: Boolean, default: false }
}, { timestamps: true });

// Compound index for conversation lookups
messageSchema.index({ sender: 1, recipient: 1 });

module.exports = mongoose.model('Message', messageSchema);
