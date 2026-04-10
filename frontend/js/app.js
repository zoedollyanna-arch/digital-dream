/* ============================================
   [Kyori] Digital Dream - Shared App Logic
   ============================================ */

const DreamApp = {
    /* --- Theme Management --- */
    initTheme() {
        const saved = localStorage.getItem('dd-theme') || DDConfig.DEFAULT_THEME;
        this.setTheme(saved);
    },

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('dd-theme', theme);
        this.syncSetting('theme', theme);
    },

    getTheme() {
        return localStorage.getItem('dd-theme') || DDConfig.DEFAULT_THEME;
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
            var el = e.target.closest('a, button, .app-icon, .nav-item, .settings-item, .theme-option, .wp-swatch, .ob-btn, .ob-theme-chip, .ob-connect-card');
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
                theme: localStorage.getItem('dd-theme') || 'light',
                wallpaper: localStorage.getItem('dd-wallpaper') || '',
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
        this.initTheme();
        this.initStatusBar();
        this.applyZoom();
        this.applyWallpaper();
        this.initSounds();
        // Store user info from URL params if present
        const uuid = this.getParam('uuid');
        const name = this.getParam('name');
        if (uuid || name) this.setUser(uuid, name);
    },

    /* --- Wallpaper --- */
    applyWallpaper() {
        var wp = localStorage.getItem('dd-wallpaper') || '';
        var bg = document.querySelector('.tablet-bg');
        if (!bg) return;
        bg.className = bg.className.replace(/\bwp-\S+/g, '').trim();
        if (wp) bg.classList.add('wp-' + wp);
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
