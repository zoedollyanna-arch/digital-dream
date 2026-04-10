/* ============================================
   [Kyori] Digital Dream - Marketplace API Route
   SL Marketplace search proxy
   ============================================ */

const express = require('express');
const router = express.Router();

const SL_MP_BASE = 'https://marketplace.secondlife.com';

// Cache search results for 10 minutes
const cache = {};
const CACHE_TTL = 600000;

function getCached(key) {
    const entry = cache[key];
    if (entry && Date.now() - entry.time < CACHE_TTL) return entry.data;
    return null;
}

function setCache(key, data) {
    cache[key] = { data, time: Date.now() };
}

// GET /api/marketplace/search?q=searchterm&category=cat
router.get('/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Missing search query' });

    const cacheKey = 'mp_' + query.toLowerCase() + '_' + (req.query.category || '');
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    try {
        // SL Marketplace search URL
        const searchUrl = SL_MP_BASE + '/products/search?search%5Bkeywords%5D=' + encodeURIComponent(query);
        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'DigitalDreamTablet/1.0',
                'Accept': 'text/html'
            }
        });

        if (!response.ok) throw new Error('Marketplace returned ' + response.status);
        const html = await response.text();

        // Parse results from HTML (basic extraction)
        const items = parseMarketplaceHtml(html);
        const result = { items, query };
        setCache(cacheKey, result);
        res.json(result);
    } catch (err) {
        console.error('[Marketplace]', err.message);
        // Return mock data on failure
        res.json({
            items: getMockItems(query),
            query,
            mock: true
        });
    }
});

// GET /api/marketplace/featured
router.get('/featured', (req, res) => {
    // Return curated featured items
    res.json({
        items: [
            { name: 'Fashion Collection', creator: 'SL Designers', price: 250, category: 'clothing', url: SL_MP_BASE },
            { name: 'Modern Home Pack', creator: 'Interior Co', price: 499, category: 'furniture', url: SL_MP_BASE },
            { name: 'Avatar Mesh Body', creator: 'Body Works', price: 1500, category: 'avatar', url: SL_MP_BASE },
            { name: 'Script Toolkit', creator: 'Dev Tools', price: 100, category: 'scripts', url: SL_MP_BASE },
            { name: 'Hair Styles Pack', creator: 'Hair Studio', price: 350, category: 'avatar', url: SL_MP_BASE },
            { name: 'Cute Room Decor', creator: 'Kawaii Home', price: 175, category: 'furniture', url: SL_MP_BASE }
        ]
    });
});

function parseMarketplaceHtml(html) {
    const items = [];
    // Simple regex-based HTML parser for SL Marketplace listing cards
    const itemPattern = /<div[^>]*class="[^"]*listing-card[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
    const namePattern = /<a[^>]*class="[^"]*listing-title[^"]*"[^>]*>(.*?)<\/a>/i;
    const pricePattern = /L\$\s*([\d,]+)/i;
    const imgPattern = /<img[^>]*src="([^"]+)"/i;
    const linkPattern = /<a[^>]*href="(\/products\/[^"]+)"/i;

    let match;
    let count = 0;
    while ((match = itemPattern.exec(html)) !== null && count < 20) {
        const block = match[1];
        const nameM = block.match(namePattern);
        const priceM = block.match(pricePattern);
        const imgM = block.match(imgPattern);
        const linkM = block.match(linkPattern);

        if (nameM) {
            items.push({
                name: nameM[1].replace(/<[^>]*>/g, '').trim(),
                price: priceM ? parseInt(priceM[1].replace(/,/g, ''), 10) : 0,
                image: imgM ? imgM[1] : null,
                url: linkM ? SL_MP_BASE + linkM[1] : SL_MP_BASE,
                category: 'general'
            });
            count++;
        }
    }
    return items;
}

function getMockItems(query) {
    // Generate relevant mock items based on search query
    const q = query.toLowerCase();
    const categories = {
        'hair': 'avatar', 'dress': 'clothing', 'house': 'furniture',
        'skin': 'avatar', 'shoe': 'clothing', 'table': 'furniture',
        'script': 'scripts', 'mesh': 'avatar', 'decor': 'furniture'
    };
    const cat = Object.keys(categories).find(k => q.includes(k));
    return [
        { name: query + ' - Style A', creator: 'SL Creator', price: 199, category: cat || 'general', url: SL_MP_BASE },
        { name: query + ' - Premium', creator: 'Top Shop', price: 399, category: cat || 'general', url: SL_MP_BASE },
        { name: query + ' - Budget', creator: 'Value Store', price: 50, category: cat || 'general', url: SL_MP_BASE },
        { name: query + ' - Deluxe Set', creator: 'Luxury Items', price: 750, category: cat || 'general', url: SL_MP_BASE }
    ];
}

module.exports = router;
