/* ============================================
   [Kyori] Digital Dream - Shared App Logic
   ============================================ */

const DreamApp = {
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
        // Migrate old theme/wallpaper to new skin system
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
        // Set data-theme attribute for CSS variable overrides
        document.documentElement.setAttribute('data-theme', skin === 'default' ? 'light' : skin);
        // Set inline gradient for MOAP/CEF compatibility
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
        var notes = [880, 1046.5]; // A5, C6
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
        var notes = [523.25, 659.25, 783.99]; // C5, E5, G5
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

    /* Attach tap sounds to all clickable elements */
    initSounds() {
        document.addEventListener('click', function(e) {
            var el = e.target.closest('a, button, .app-icon, .nav-item, .settings-item, .skin-swatch, .ob-btn, .ob-skin-chip, .ob-connect-card');
            if (el) DreamApp.playTap();
        }, true);
    },

    /* --- Toast Notifications --- */
    toast(message, type = 'info') {
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
        const params = new URLSearchParams(window.location.search);
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

    /* --- Backend Profile Sync --- */
    _syncTimer: null,

    /* Debounced save: batches rapid setting changes into one API call */
    syncSetting(key, value) {
        // Guard: don't sync if no uuid
        if (this.getUserId() === 'unknown') return;
        if (this._syncTimer) clearTimeout(this._syncTimer);
        this._syncTimer = setTimeout(() => this._doSync(), 1500);
    },

    /* Gather all current settings and push to backend */
    async _doSync() {
        var uuid = this.getUserId();
        if (!uuid || uuid === 'unknown') return;
        try {
            var dc = null;
            try { dc = JSON.parse(localStorage.getItem('dd-discord-config')); } catch(e) {}
            var apps = [];
            try { apps = JSON.parse(localStorage.getItem('dd-installed-apps') || '[]'); } catch(e) {}

            await this.apiPost('/api/profile', {
                uuid: uuid,
                name: localStorage.getItem('dd-name') || 'Dreamer',
                theme: localStorage.getItem('dd-skin') || 'default',
                wallpaper: localStorage.getItem('dd-skin') || 'default',
                zoom: parseInt(localStorage.getItem('dd-zoom'), 10) || 150,
                onboarded: localStorage.getItem('dd-onboarded') === 'true',
                notifications: {
                    notifs: localStorage.getItem('dd-setting-notifs') !== 'false',
                    discordNotifs: localStorage.getItem('dd-setting-discordNotifs') !== 'false',
                    sound: localStorage.getItem('dd-setting-sound') === 'true'
                },
                discord: dc || { webhook: '', name: '', channel: 'general' },
                installedApps: apps
            });
        } catch (e) {
            // Silent fail — offline or server issue
        }
    },

    /* Force immediate sync (call after big changes like onboarding) */
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
        // Direct video ID (11 chars)
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

    /* --- Init (call on every page) --- */
    init() {
        this.initSkin();
        this.initStatusBar();
        this.applyZoom();
        this.initSounds();
        // Store user info from URL params if present
        const uuid = this.getParam('uuid');
        const name = this.getParam('name');
        if (uuid || name) this.setUser(uuid, name);
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
        // Debounced save (1s)
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

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => DreamApp.init());
