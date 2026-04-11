/* ============================================
   [Kyori] Digital Dream - Shared App Logic
   Backend-first with localStorage cache
   ============================================ */

const DreamApp = {
    /* --- Profile cache (loaded from backend on init) --- */
    _profile: null,
    _profileLoaded: false,
    _profilePromise: null,

    /* --- Skin Management (unified theme + wallpaper) --- */
    _skinGradients: {
        'default': 'linear-gradient(135deg, #C2E9FB 0%, #E8D5F5 25%, #FBE4D5 50%, #D5E8FB 75%, #E0F5E8 100%)',
        'sunset':  'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 25%, #FEC89A 50%, #FFD93D 75%, #FF6B6B 100%)',
        'ocean':   'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #6B8DD6 50%, #8E37D7 75%, #667eea 100%)',
        'forest':  'linear-gradient(135deg, #11998e 0%, #38ef7d 25%, #43B692 50%, #11998e 75%, #38ef7d 100%)',
        'candy':   'linear-gradient(135deg, #f093fb 0%, #f5576c 25%, #fda085 50%, #f093fb 75%, #f5576c 100%)',
        'pink':    'linear-gradient(135deg, #FFB6C1 0%, #FF69B4 25%, #FF1493 50%, #FF69B4 75%, #FFB6C1 100%)',
        'space':   'linear-gradient(135deg, #0f0c29 0%, #302b63 25%, #24243e 50%, #0f0c29 75%, #302b63 100%)',
        'cotton':  'linear-gradient(135deg, #E0C3FC 0%, #8EC5FC 25%, #F0E6FF 50%, #8EC5FC 75%, #E0C3FC 100%)'
    },

    initSkin() {
        var skin = localStorage.getItem('dd-skin');
        if (!skin) {
            var oldWp = localStorage.getItem('dd-wallpaper');
            if (oldWp && this._skinGradients[oldWp]) {
                skin = oldWp;
            } else {
                var oldTheme = localStorage.getItem('dd-theme');
                if (oldTheme === 'dark') skin = 'space';
                else if (oldTheme === 'neon') skin = 'ocean';
                else skin = 'default';
            }
            localStorage.setItem('dd-skin', skin);
        }
        this.applySkin(skin);
    },

    setSkin(skin) {
        if (!this._skinGradients[skin]) skin = 'default';
        localStorage.setItem('dd-skin', skin);
        this.applySkin(skin);
        this.syncSetting('skin', skin);
    },

    getSkin() {
        return localStorage.getItem('dd-skin') || 'default';
    },

    applySkin(skin) {
        if (!skin || !this._skinGradients[skin]) skin = 'default';
        document.documentElement.setAttribute('data-theme', skin === 'default' ? 'light' : skin);
        var bg = document.querySelector('.tablet-bg');
        if (bg) {
            bg.style.background = this._skinGradients[skin];
            bg.style.backgroundSize = '400% 400%';
            bg.style.animation = 'wallpaperShift 25s ease infinite';
        }
    },

    /* --- Status Bar Clock --- */
    initStatusBar() {
        this.updateClock();
        setInterval(() => this.updateClock(), 30000);
    },

    updateClock() {
        const el = document.getElementById('statusTime');
        if (!el) return;
        const now = new Date();
        let h = now.getHours();
        const m = String(now.getMinutes()).padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        el.textContent = h + ':' + m + ' ' + ampm;
    },

    /* --- Sound System --- */
    _audioCtx: null,

    _getAudioCtx() {
        if (!this._audioCtx) {
            try { this._audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
            catch (e) { return null; }
        }
        return this._audioCtx;
    },

    soundEnabled() {
        return localStorage.getItem('dd-setting-sound') === 'true';
    },

    playTap() {
        if (!this.soundEnabled()) return;
        var ctx = this._getAudioCtx();
        if (!ctx) return;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 1200;
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
    },

    playNotification() {
        if (!this.soundEnabled()) return;
        var ctx = this._getAudioCtx();
        if (!ctx) return;
        var notes = [880, 1046.5];
        notes.forEach(function(freq, i) {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
            gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + i * 0.12 + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + i * 0.12);
            osc.stop(ctx.currentTime + i * 0.12 + 0.3);
        });
    },

    playSuccess() {
        if (!this.soundEnabled()) return;
        var ctx = this._getAudioCtx();
        if (!ctx) return;
        var notes = [523.25, 659.25, 783.99];
        notes.forEach(function(freq, i) {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
            gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + i * 0.1 + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + i * 0.1);
            osc.stop(ctx.currentTime + i * 0.1 + 0.4);
        });
    },

    initSounds() {
        document.addEventListener('click', function(e) {
            var el = e.target.closest('a, button, .app-icon, .nav-item, .settings-item, .skin-swatch, .ob-btn, .ob-skin-chip, .ob-connect-card');
            if (el) DreamApp.playTap();
        }, true);
    },

    /* --- Toast Notifications --- */
    toast(message, type) {
        type = type || 'info';
        if (this.isDndEnabled() && type !== 'error') return;
        let toast = document.getElementById('ddToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'ddToast';
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        if (this._toastTimer) clearTimeout(this._toastTimer);
        toast.textContent = message;
        toast.className = 'toast ' + type;
        requestAnimationFrame(() => toast.classList.add('show'));
        if (type === 'success') this.playSuccess();
        else if (type !== 'info') this.playNotification();
        this._toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
    },

    /* --- API Helpers --- */
    async apiGet(endpoint) {
        const res = await fetch(DDConfig.API_BASE + endpoint);
        if (!res.ok) throw new Error('API error: ' + res.status);
        return res.json();
    },

    async apiPost(endpoint, data) {
        const res = await fetch(DDConfig.API_BASE + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('API error: ' + res.status);
        return res.json();
    },

    /* --- URL Param Helpers --- */
    getParam(name) {
        var params = new URLSearchParams(window.location.search);
        return params.get(name);
    },

    /* --- Avatar UUID from URL --- */
    getUserId() {
        return this.getParam('uuid') || localStorage.getItem('dd-uuid') || 'unknown';
    },

    getUserName() {
        return this.getParam('name') || localStorage.getItem('dd-name') || 'Dreamer';
    },

    setUser(uuid, name) {
        if (uuid) localStorage.setItem('dd-uuid', uuid);
        if (name) localStorage.setItem('dd-name', name);
    },

    /* --- Backend Profile (source of truth) --- */

    /** Load profile from backend, cache to localStorage. Returns profile object or null. */
    async loadProfile() {
        var uuid = this.getUserId();
        if (!uuid || uuid === 'unknown') return null;
        if (this._profilePromise) return this._profilePromise;
        this._profilePromise = this._doLoadProfile(uuid);
        return this._profilePromise;
    },

    async _doLoadProfile(uuid) {
        try {
            var data = await this.apiGet('/api/profile?uuid=' + encodeURIComponent(uuid));
            if (data && data.found && data.profile) {
                this._profile = data.profile;
                this._profileLoaded = true;
                this._cacheProfileToLocal(data.profile);
                return data.profile;
            }
        } catch (e) {
            // Offline fallback — use localStorage cache
        }
        this._profileLoaded = true;
        return null;
    },

    /** Cache backend profile fields into localStorage for offline access */
    _cacheProfileToLocal(p) {
        if (!p) return;
        if (p.name) localStorage.setItem('dd-name', p.name);
        var skin = p.wallpaper || p.theme || 'default';
        if (skin === 'light') skin = 'default';
        else if (skin === 'dark') skin = 'space';
        else if (skin === 'neon') skin = 'ocean';
        localStorage.setItem('dd-skin', skin);
        if (p.zoom) localStorage.setItem('dd-zoom', String(p.zoom));
        if (p.notifications) {
            localStorage.setItem('dd-setting-notifs', String(p.notifications.notifs !== false));
            localStorage.setItem('dd-setting-discordNotifs', String(p.notifications.discordNotifs !== false));
            localStorage.setItem('dd-setting-sound', String(p.notifications.sound === true));
        }
        if (p.discord && p.discord.webhook) localStorage.setItem('dd-discord-config', JSON.stringify(p.discord));
        if (p.installedApps) localStorage.setItem('dd-installed-apps', JSON.stringify(p.installedApps));
        if (p.favoriteApps) localStorage.setItem('dd-favorite-apps', JSON.stringify(p.favoriteApps));
        if (p.recentApps) localStorage.setItem('dd-recent-apps', JSON.stringify(p.recentApps));
        localStorage.setItem('dd-xp', String(p.xp || 0));
        localStorage.setItem('dd-coins', String(p.coins || 0));
        if (p.rewardLast) localStorage.setItem('dd-reward-last', p.rewardLast);
        localStorage.setItem('dd-reward-streak', String(p.rewardStreak || 0));
        localStorage.setItem('dd-focus-sessions', String(p.focusSessions || 0));
        localStorage.setItem('dd-selfcare-streak', String(p.selfcareStreak || 0));
        localStorage.setItem('dd-friendship-streak', String(p.friendshipStreak || 0));
        localStorage.setItem('dd-mood-streak', String(p.moodStreak || 0));
        localStorage.setItem('dd-setting-dnd', String(p.dnd === true));
        localStorage.setItem('dd-setting-unlock', String(p.unlock !== false));
    },

    _syncTimer: null,

    syncSetting(key, value) {
        if (this.getUserId() === 'unknown') return;
        if (this._syncTimer) clearTimeout(this._syncTimer);
        this._syncTimer = setTimeout(() => this._doSync(), 1500);
    },

    async _doSync() {
        var uuid = this.getUserId();
        if (!uuid || uuid === 'unknown') return;
        try {
            var dc = null;
            try { dc = JSON.parse(localStorage.getItem('dd-discord-config')); } catch(e) {}
            var apps = [];
            try { apps = JSON.parse(localStorage.getItem('dd-installed-apps') || '[]'); } catch(e) {}
            var favs = [];
            try { favs = JSON.parse(localStorage.getItem('dd-favorite-apps') || '[]'); } catch(e) {}
            var recents = [];
            try { recents = JSON.parse(localStorage.getItem('dd-recent-apps') || '[]'); } catch(e) {}

            await this.apiPost('/api/profile', {
                uuid: uuid,
                name: localStorage.getItem('dd-name') || 'Dreamer',
                theme: localStorage.getItem('dd-skin') || 'default',
                wallpaper: localStorage.getItem('dd-skin') || 'default',
                zoom: parseInt(localStorage.getItem('dd-zoom'), 10) || 150,
                onboarded: localStorage.getItem('dd-onboarded') === 'true',
                dnd: localStorage.getItem('dd-setting-dnd') === 'true',
                unlock: localStorage.getItem('dd-setting-unlock') !== 'false',
                notifications: {
                    notifs: localStorage.getItem('dd-setting-notifs') !== 'false',
                    discordNotifs: localStorage.getItem('dd-setting-discordNotifs') !== 'false',
                    sound: localStorage.getItem('dd-setting-sound') === 'true'
                },
                discord: dc || { webhook: '', name: '', channel: 'general' },
                installedApps: apps,
                favoriteApps: favs,
                recentApps: recents
            });
        } catch (e) {
            // Silent fail — offline or server issue
        }
    },

    async saveProfile() {
        if (this._syncTimer) clearTimeout(this._syncTimer);
        await this._doSync();
    },

    /* --- Browser Whitelist Check --- */
    isUrlAllowed(url) {
        try {
            const hostname = new URL(url).hostname.toLowerCase();
            return DDConfig.BROWSER_WHITELIST.some(d => hostname === d || hostname.endsWith('.' + d));
        } catch {
            return false;
        }
    },

    /* --- YouTube URL Helpers --- */
    extractYouTubeId(url) {
        if (!url) return null;
        if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
        ];
        for (const p of patterns) {
            const m = url.match(p);
            if (m) return m[1];
        }
        return null;
    },

    getYouTubeEmbed(videoId) {
        return 'https://www.youtube.com/embed/' + encodeURIComponent(videoId) + '?autoplay=1&rel=0';
    },

    /* --- Escape HTML (XSS prevention) --- */
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /* --- Time formatting --- */
    timeAgo(dateStr) {
        const now = Date.now();
        const then = new Date(dateStr).getTime();
        const diff = Math.floor((now - then) / 1000);
        if (diff < 60) return 'just now';
        if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
        return Math.floor(diff / 86400) + 'd ago';
    },

    formatTime(dateStr) {
        const d = new Date(dateStr);
        let h = d.getHours();
        const m = String(d.getMinutes()).padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return h + ':' + m + ' ' + ampm;
    },

    /* --- Tablet OS Helpers --- */
    getAllApps(includeCore) {
        if (typeof window.DDGetAllApps === 'function') return window.DDGetAllApps(includeCore);
        return [];
    },

    findAppById(id) {
        return this.getAllApps(true).find(function(app) { return app.id === id; }) || null;
    },

    getAppByPage(page) {
        if (!page) return null;
        var clean = String(page).split('?')[0].split('/').pop();
        return this.getAllApps(true).find(function(app) { return app.page === clean; }) || null;
    },

    getInstalledApps() {
        try {
            var list = JSON.parse(localStorage.getItem('dd-installed-apps') || '[]');
            return Array.from(new Set(Array.isArray(list) ? list : []));
        } catch (e) {
            return [];
        }
    },

    setInstalledApps(list) {
        var unique = Array.from(new Set(Array.isArray(list) ? list : []));
        localStorage.setItem('dd-installed-apps', JSON.stringify(unique));
        this.syncSetting('installedApps', unique);
        return unique;
    },

    getFavoriteApps() {
        try {
            var list = JSON.parse(localStorage.getItem('dd-favorite-apps') || '[]');
            return Array.from(new Set(Array.isArray(list) ? list : []));
        } catch (e) {
            return [];
        }
    },

    toggleFavoriteApp(id) {
        var list = this.getFavoriteApps();
        if (list.indexOf(id) !== -1) list = list.filter(function(x) { return x !== id; });
        else list.unshift(id);
        localStorage.setItem('dd-favorite-apps', JSON.stringify(Array.from(new Set(list)).slice(0, 8)));
        this.syncSetting('favoriteApps', list);
        return this.getFavoriteApps();
    },

    getRecentApps() {
        try {
            var ids = JSON.parse(localStorage.getItem('dd-recent-apps') || '[]');
            if (!Array.isArray(ids)) ids = [];
            return ids.map((id) => this.findAppById(id)).filter(Boolean);
        } catch (e) {
            return [];
        }
    },

    recordRecentApp() {
        var page = window.location.pathname.split('/').pop() || 'index.html';
        if (['', 'index.html', 'boot.html', 'onboarding.html'].indexOf(page) !== -1) return;
        var app = this.getAppByPage(page);
        if (!app) return;
        var list = this.getRecentApps().map(function(item) { return item.id; }).filter(function(id) { return id !== app.id; });
        list.unshift(app.id);
        var trimmed = list.slice(0, 8);
        localStorage.setItem('dd-recent-apps', JSON.stringify(trimmed));
        this.syncSetting('recentApps', trimmed);
    },

    isDndEnabled() {
        return localStorage.getItem('dd-setting-dnd') === 'true';
    },

    setDnd(enabled) {
        localStorage.setItem('dd-setting-dnd', enabled ? 'true' : 'false');
        this.syncSetting('dnd', enabled === true);
    },

    /* --- Gamification (backend-first, localStorage cache) --- */

    getLevelInfo() {
        var xp = parseInt(localStorage.getItem('dd-xp') || '0', 10) || 0;
        var level = Math.floor(xp / 100) + 1;
        return { xp: xp, level: level, current: xp % 100, next: 100 };
    },

    async awardXp(amount, reason) {
        amount = parseInt(amount, 10) || 0;
        if (amount <= 0) return this.getLevelInfo();
        // Update localStorage cache immediately for responsive UI
        var xp = (parseInt(localStorage.getItem('dd-xp') || '0', 10) || 0) + amount;
        localStorage.setItem('dd-xp', String(xp));
        if (reason && !this.isDndEnabled()) this.toast('+' + amount + ' XP - ' + reason, 'success');
        // Push to backend (fire and forget)
        var uuid = this.getUserId();
        if (uuid && uuid !== 'unknown') {
            this.apiPost('/api/profile/xp', { uuid: uuid, amount: amount }).catch(function() {});
        }
        return this.getLevelInfo();
    },

    getDailyReward() {
        var today = new Date().toISOString().slice(0, 10);
        return {
            today: today,
            claimedToday: localStorage.getItem('dd-reward-last') === today,
            streak: parseInt(localStorage.getItem('dd-reward-streak') || '0', 10) || 0,
            coins: parseInt(localStorage.getItem('dd-coins') || '0', 10) || 0
        };
    },

    async claimDailyReward() {
        var info = this.getDailyReward();
        if (info.claimedToday) return null;
        var uuid = this.getUserId();
        if (uuid && uuid !== 'unknown') {
            try {
                var result = await this.apiPost('/api/profile/daily-reward', { uuid: uuid });
                if (result && result.claimed) {
                    localStorage.setItem('dd-reward-last', info.today);
                    localStorage.setItem('dd-reward-streak', String(result.streak));
                    localStorage.setItem('dd-coins', String(result.coins));
                    localStorage.setItem('dd-xp', String(result.xp));
                    return { streak: result.streak, coins: result.coins };
                }
                return null;
            } catch (e) {
                // Fallback to local
            }
        }
        // Offline fallback
        var yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        var last = localStorage.getItem('dd-reward-last') || '';
        var streak = (last === yesterday) ? info.streak + 1 : 1;
        var coins = info.coins + 25;
        localStorage.setItem('dd-reward-last', info.today);
        localStorage.setItem('dd-reward-streak', String(streak));
        localStorage.setItem('dd-coins', String(coins));
        this.awardXp(15, 'Daily reward claimed');
        return { streak: streak, coins: coins };
    },

    getDailyQuote() {
        var quotes = [
            { title: 'Glow gently', text: 'Small steps still sparkle. You are doing better than you think.' },
            { title: 'Dream bigger', text: 'Your ideas deserve space to grow, even if they start tiny.' },
            { title: 'Soft reset', text: 'Pause, breathe, and start fresh. That still counts as progress.' },
            { title: 'Main character energy', text: 'Be kind, be curious, and keep your heart open today.' },
            { title: 'Cozy focus', text: 'A little effort plus a calm vibe can move mountains.' },
            { title: 'Light up the room', text: 'Your creativity makes the whole tablet feel brighter.' }
        ];
        var index = new Date().getDate() % quotes.length;
        return quotes[index];
    },

    getBadges() {
        var badges = [];
        if (this.getInstalledApps().length >= 5) badges.push('Collector');
        if ((parseInt(localStorage.getItem('dd-focus-sessions') || '0', 10) || 0) >= 3) badges.push('Focused');
        if ((parseInt(localStorage.getItem('dd-selfcare-streak') || '0', 10) || 0) >= 2) badges.push('Glow Up');
        if ((parseInt(localStorage.getItem('dd-friendship-streak') || '0', 10) || 0) >= 3) badges.push('Bestie');
        if ((parseInt(localStorage.getItem('dd-mood-streak') || '0', 10) || 0) >= 2) badges.push('Vibes');
        return badges;
    },

    /** Update a streak on backend */
    async updateStreak(key, value) {
        localStorage.setItem('dd-' + key.replace(/([A-Z])/g, '-$1').toLowerCase(), String(value));
        var uuid = this.getUserId();
        if (uuid && uuid !== 'unknown') {
            this.apiPost('/api/profile/streak', { uuid: uuid, key: key, value: value }).catch(function() {});
        }
    },

    /* --- Init (call on every page) --- */
    init() {
        this.initSkin();
        this.initStatusBar();
        this.applyZoom();
        this.initSounds();
        var uuid = this.getParam('uuid');
        var name = this.getParam('name');
        if (uuid || name) this.setUser(uuid, name);
        this.recordRecentApp();
        // Background profile sync from backend
        this.loadProfile();
    },

    /* --- Zoom Management --- */
    ZOOM_MIN: 100,
    ZOOM_MAX: 200,
    ZOOM_STEP: 10,
    ZOOM_DEFAULT: 150,

    getZoom() {
        var z = parseInt(localStorage.getItem('dd-zoom'), 10);
        return (z >= this.ZOOM_MIN && z <= this.ZOOM_MAX) ? z : this.ZOOM_DEFAULT;
    },

    setZoom(level) {
        level = Math.max(this.ZOOM_MIN, Math.min(this.ZOOM_MAX, level));
        localStorage.setItem('dd-zoom', level);
        this.applyZoom();
        this.syncSetting('zoom', level);
        return level;
    },

    applyZoom() {
        var z = this.getZoom();
        document.documentElement.style.zoom = (z / 100);
    },

    /* --- App Data (DB-backed per-app storage) --- */

    async loadAppData(appKey) {
        var uuid = this.getUserId();
        if (!uuid || uuid === 'unknown') return null;
        try {
            var data = await this.apiGet('/api/appdata?uuid=' + encodeURIComponent(uuid) + '&app=' + encodeURIComponent(appKey));
            return (data && data.found) ? data.data : null;
        } catch (e) {
            return null;
        }
    },

    _appDataTimers: {},

    saveAppData(appKey, data) {
        var uuid = this.getUserId();
        if (!uuid || uuid === 'unknown') return;
        if (this._appDataTimers[appKey]) clearTimeout(this._appDataTimers[appKey]);
        this._appDataTimers[appKey] = setTimeout(async () => {
            try {
                await this.apiPost('/api/appdata', { uuid: uuid, app: appKey, data: data });
            } catch (e) { /* silent */ }
        }, 1000);
    },

    saveAppDataNow(appKey, data) {
        var uuid = this.getUserId();
        if (!uuid || uuid === 'unknown') return Promise.resolve();
        return this.apiPost('/api/appdata', { uuid: uuid, app: appKey, data: data }).catch(function() {});
    }
};

document.addEventListener('DOMContentLoaded', () => DreamApp.init());
