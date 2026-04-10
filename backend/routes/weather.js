/* ============================================
   [Kyori] Digital Dream - Weather API Route
   Proxies OpenWeatherMap for the tablet HUD
   ============================================ */

const express = require('express');
const router = express.Router();

const API_KEY = process.env.OPENWEATHER_API_KEY || '';
const UNITS = process.env.WEATHER_UNITS || 'imperial';
const OWM_BASE = 'https://api.openweathermap.org/data/2.5';

// Cache weather data for 5 minutes to avoid rate limits
const cache = {};
const CACHE_TTL = 300000; // 5 min

function getCached(key) {
    const entry = cache[key];
    if (entry && Date.now() - entry.time < CACHE_TTL) return entry.data;
    return null;
}

function setCache(key, data) {
    cache[key] = { data, time: Date.now() };
}

// GET /api/weather?city=CityName
router.get('/', async (req, res) => {
    const city = req.query.city;
    if (!city) return res.status(400).json({ error: 'Missing city parameter' });

    if (!API_KEY) {
        // Return mock data if no API key configured
        return res.json({
            temp: 72, feels_like: 70, humidity: 55, wind: 8,
            description: 'Partly cloudy', icon: '02d',
            city: city, country: 'US', visibility: 16093,
            pressure: 1013, sunrise: Math.floor(Date.now() / 1000) - 21600,
            sunset: Math.floor(Date.now() / 1000) + 21600
        });
    }

    const cacheKey = 'weather_' + city.toLowerCase();
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    try {
        const url = OWM_BASE + '/weather?q=' + encodeURIComponent(city) + '&appid=' + encodeURIComponent(API_KEY) + '&units=' + UNITS;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Weather API returned ' + response.status);
        const data = await response.json();

        const result = {
            temp: data.main.temp,
            feels_like: data.main.feels_like,
            humidity: data.main.humidity,
            pressure: data.main.pressure,
            wind: data.wind.speed,
            description: data.weather[0].description,
            icon: data.weather[0].icon,
            city: data.name,
            country: data.sys.country,
            visibility: data.visibility,
            sunrise: data.sys.sunrise,
            sunset: data.sys.sunset
        };

        setCache(cacheKey, result);
        res.json(result);
    } catch (err) {
        console.error('[Weather]', err.message);
        res.status(502).json({ error: 'Weather service unavailable' });
    }
});

// GET /api/weather/forecast?city=CityName
router.get('/forecast', async (req, res) => {
    const city = req.query.city;
    if (!city) return res.status(400).json({ error: 'Missing city parameter' });

    if (!API_KEY) {
        // Mock forecast
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        return res.json({
            forecast: days.map((d, i) => ({
                day: d, high: 75 - i, low: 58 + i, icon: i % 2 === 0 ? '01d' : '02d',
                description: i % 2 === 0 ? 'Clear' : 'Partly cloudy'
            }))
        });
    }

    const cacheKey = 'forecast_' + city.toLowerCase();
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    try {
        const url = OWM_BASE + '/forecast?q=' + encodeURIComponent(city) + '&appid=' + encodeURIComponent(API_KEY) + '&units=' + UNITS;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Forecast API returned ' + response.status);
        const data = await response.json();

        // Group by day and pick midday entry
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const grouped = {};
        for (const item of data.list) {
            const d = new Date(item.dt * 1000);
            const key = d.toDateString();
            if (!grouped[key]) grouped[key] = { temps: [], icons: [], descs: [], day: dayNames[d.getDay()] };
            grouped[key].temps.push(item.main.temp);
            grouped[key].icons.push(item.weather[0].icon);
            grouped[key].descs.push(item.weather[0].description);
        }

        const forecast = Object.values(grouped).slice(0, 5).map(g => ({
            day: g.day,
            high: Math.max(...g.temps),
            low: Math.min(...g.temps),
            icon: g.icons[Math.floor(g.icons.length / 2)],
            description: g.descs[Math.floor(g.descs.length / 2)]
        }));

        const result = { forecast };
        setCache(cacheKey, result);
        res.json(result);
    } catch (err) {
        console.error('[Forecast]', err.message);
        res.status(502).json({ error: 'Forecast service unavailable' });
    }
});

module.exports = router;
