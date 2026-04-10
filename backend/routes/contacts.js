/* ============================================
   [Kyori] Digital Dream - Contacts API Route
   CRUD for per-user contact address book
   ============================================ */

const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');

// GET /api/contacts?uuid=X — List all contacts for this user
router.get('/', async (req, res) => {
    try {
        const uuid = req.query.uuid;
        if (!uuid) return res.status(400).json({ error: 'Missing uuid' });

        const contacts = await Contact.find({ owner: uuid })
            .sort({ favorite: -1, name: 1 })
            .lean();

        res.json({ contacts });
    } catch (err) {
        console.error('[Contacts] GET / error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/contacts — Add a new contact
router.post('/', async (req, res) => {
    try {
        const { owner, uuid, name, phone, email, notes, favorite } = req.body;
        if (!owner || !uuid || !name) {
            return res.status(400).json({ error: 'Missing required fields (owner, uuid, name)' });
        }

        const contact = await Contact.create({
            owner:    String(owner).substring(0, 60),
            uuid:     String(uuid).substring(0, 60),
            name:     String(name).substring(0, 60),
            phone:    String(phone || '').substring(0, 40),
            email:    String(email || '').substring(0, 100),
            notes:    String(notes || '').substring(0, 500),
            favorite: Boolean(favorite)
        });

        res.json({ ok: true, contact });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: 'Contact with this UUID already exists' });
        }
        console.error('[Contacts] POST / error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/contacts/:id — Update a contact
router.put('/:id', async (req, res) => {
    try {
        const { name, phone, email, notes, favorite } = req.body;
        const owner = req.query.uuid;
        if (!owner) return res.status(400).json({ error: 'Missing uuid' });

        const update = {};
        if (name !== undefined)     update.name = String(name).substring(0, 60);
        if (phone !== undefined)    update.phone = String(phone).substring(0, 40);
        if (email !== undefined)    update.email = String(email).substring(0, 100);
        if (notes !== undefined)    update.notes = String(notes).substring(0, 500);
        if (favorite !== undefined) update.favorite = Boolean(favorite);

        const contact = await Contact.findOneAndUpdate(
            { _id: req.params.id, owner },
            { $set: update },
            { new: true }
        );

        if (!contact) return res.status(404).json({ error: 'Contact not found' });
        res.json({ ok: true, contact });
    } catch (err) {
        console.error('[Contacts] PUT error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/contacts/:id?uuid=X — Delete a contact
router.delete('/:id', async (req, res) => {
    try {
        const owner = req.query.uuid;
        if (!owner) return res.status(400).json({ error: 'Missing uuid' });

        const result = await Contact.findOneAndDelete({ _id: req.params.id, owner });
        if (!result) return res.status(404).json({ error: 'Contact not found' });

        res.json({ ok: true });
    } catch (err) {
        console.error('[Contacts] DELETE error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/contacts/:id/favorite?uuid=X — Toggle favorite
router.put('/:id/favorite', async (req, res) => {
    try {
        const owner = req.query.uuid;
        if (!owner) return res.status(400).json({ error: 'Missing uuid' });

        const contact = await Contact.findOne({ _id: req.params.id, owner });
        if (!contact) return res.status(404).json({ error: 'Contact not found' });

        contact.favorite = !contact.favorite;
        await contact.save();

        res.json({ ok: true, favorite: contact.favorite });
    } catch (err) {
        console.error('[Contacts] FAVORITE error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
