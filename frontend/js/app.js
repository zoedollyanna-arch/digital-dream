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

    /* --- Toast Notifications --- */
    toast(message, type = 'info') {
        let toast = document.getElementById('ddToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'ddToast';
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.className = 'toast ' + type;
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => toast.classList.remove('show'), 2500);
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
        return level;
    },

    applyZoom() {
        var z = this.getZoom();
        document.documentElement.style.zoom = (z / 100);
    }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => DreamApp.init());
