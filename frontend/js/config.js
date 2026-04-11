/* ============================================
   [Kyori] Digital Dream - Configuration
   ============================================ */
const DDConfig = {
    // Backend server URL - UPDATE THIS to your deployed server
    API_BASE: 'https://digital-dream-jbqb.onrender.com',

    // App version
    VERSION: '2.0.0',

    // Default skin (unified theme + wallpaper)
    DEFAULT_SKIN: 'default',

    // Weather API city (default)
    DEFAULT_CITY: 'New York',

    // SL Marketplace base URL
    SL_MP_BASE: 'https://marketplace.secondlife.com',

    // URL whitelist for safe browser (domains allowed)
    BROWSER_WHITELIST: [
        'google.com',
        'youtube.com',
        'wikipedia.org',
        'secondlife.com',
        'marketplace.secondlife.com',
        'weather.com',
        'discord.com',
        'wiki.secondlife.com'
    ],

    // Max message history to display
    MAX_MESSAGES: 50,

    // Auto-refresh intervals (ms)
    WEATHER_REFRESH: 600000,   // 10 minutes
    MESSAGES_REFRESH: 5000,     // 5 seconds
    DISCORD_REFRESH: 3000       // 3 seconds
};
