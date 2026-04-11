/* ============================================
   [Kyori] Digital Dream - FeedPost Model
   Mongoose schema for shared DreamFeed social posts
   ============================================ */

const mongoose = require('mongoose');

const feedPostSchema = new mongoose.Schema({
    authorUuid:  { type: String, required: true, index: true },
    authorName:  { type: String, required: true, maxlength: 60 },
    text:        { type: String, required: true, maxlength: 280 },
    mood:        { type: String, default: '', maxlength: 4 },
    likes:       [{ type: String }],       // array of UUIDs who liked
    createdAt:   { type: Date, default: Date.now }
});

// TTL: auto-delete posts older than 30 days
feedPostSchema.index({ createdAt: -1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('FeedPost', feedPostSchema);
