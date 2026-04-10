/* ============================================
   [Kyori] Digital Dream - Contact Model
   Mongoose schema for contacts (per-user address book)
   ============================================ */

const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    owner:      { type: String, required: true, index: true },   // owner's avatar UUID
    uuid:       { type: String, required: true },                 // contact's avatar UUID
    name:       { type: String, required: true },                 // custom display name
    phone:      { type: String, default: '' },                    // optional phone label
    email:      { type: String, default: '' },                    // optional email label
    notes:      { type: String, default: '' },                    // freeform notes
    favorite:   { type: Boolean, default: false }
}, { timestamps: true });

// Compound index: each owner can only add a given UUID once
contactSchema.index({ owner: 1, uuid: 1 }, { unique: true });

module.exports = mongoose.model('Contact', contactSchema);
