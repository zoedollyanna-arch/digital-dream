(function () {
    function withMeta(category, folder, apps) {
        return apps.map(function (app) {
            app.category = category;
            app.folder = folder;
            return app;
        });
    }

    function uniqueApps(list) {
        var seen = {};
        return list.filter(function (app) {
            if (!app || !app.id || seen[app.id]) return false;
            seen[app.id] = true;
            return true;
        });
    }

    /* Custom icon art — each app gets a distinct gradient + emoji/symbol overlay */
    window.DDAppArt = {
        home:            { gradient: 'linear-gradient(135deg,#007AFF,#00C6FB)', emoji: '' },
        messages:        { gradient: 'linear-gradient(135deg,#34C759,#A8E063)', emoji: '' },
        youtube:         { gradient: 'linear-gradient(135deg,#FF3B30,#FF6B6B)', emoji: '' },
        weather:         { gradient: 'linear-gradient(135deg,#5AC8FA,#56CCF2)', emoji: '' },
        dreamstore:      { gradient: 'linear-gradient(135deg,#AF52DE,#D291F5)', emoji: '' },
        browser:         { gradient: 'linear-gradient(135deg,#8E8E93,#B0BEC5)', emoji: '' },
        dreamfeed:       { gradient: 'linear-gradient(135deg,#FF6B9D,#C44569)', emoji: '' },
        contacts:        { gradient: 'linear-gradient(135deg,#FF9F0A,#FFD93D)', emoji: '' },
        settings:        { gradient: 'linear-gradient(135deg,#636366,#8E8E93)', emoji: '' },
        notes:           { gradient: 'linear-gradient(135deg,#FF9F0A,#FFBE76)', emoji: '📝' },
        journal:         { gradient: 'linear-gradient(135deg,#5856D6,#9B59B6)', emoji: '📖' },
        todo:            { gradient: 'linear-gradient(135deg,#34C759,#6BCB77)', emoji: '✅' },
        calculator:      { gradient: 'linear-gradient(135deg,#8E8E93,#636366)', emoji: '🔢' },
        dreamplanner:    { gradient: 'linear-gradient(135deg,#FFB703,#FB8500)', emoji: '⭐' },
        focus:           { gradient: 'linear-gradient(135deg,#007AFF,#0652DD)', emoji: '⏳' },
        moodvibes:       { gradient: 'linear-gradient(135deg,#FF5E9C,#FF85A2)', emoji: '🌈' },
        selfcare:        { gradient: 'linear-gradient(135deg,#34C759,#00B894)', emoji: '💖' },
        moodboard:       { gradient: 'linear-gradient(135deg,#BF5AF2,#E0AAFF)', emoji: '🎨' },
        trivia:          { gradient: 'linear-gradient(135deg,#FF2D55,#C44569)', emoji: '🧠' },
        memory:          { gradient: 'linear-gradient(135deg,#5AC8FA,#74B9FF)', emoji: '🃏' },
        tictactoe:       { gradient: 'linear-gradient(135deg,#007AFF,#4A69BD)', emoji: '❌' },
        snake:           { gradient: 'linear-gradient(135deg,#34C759,#A8E063)', emoji: '🐍' },
        wouldyourather:  { gradient: 'linear-gradient(135deg,#FF9F0A,#F9CA24)', emoji: '🤔' },
        quizdaily:       { gradient: 'linear-gradient(135deg,#5856D6,#6C5CE7)', emoji: '⚡' },
        petbuddy:        { gradient: 'linear-gradient(135deg,#00C7BE,#55EFC4)', emoji: '🐾' },
        doodle:          { gradient: 'linear-gradient(135deg,#BF5AF2,#A29BFE)', emoji: '🖌️' },
        photos:          { gradient: 'linear-gradient(135deg,#FF6259,#FE6B8B)', emoji: '📸' },
        stickers:        { gradient: 'linear-gradient(135deg,#FF8C42,#F7B731)', emoji: '✨' }
    };

    window.DDCoreApps = {
        home:      { id: 'home',       name: 'Home',        icon: 'fas fa-home',          color: '#007AFF', page: 'index.html',      folder: 'core' },
        messages:  { id: 'messages',   name: 'DreamChat',   icon: 'fas fa-comment-dots',  color: '#34C759', page: 'messages.html',   folder: 'core' },
        youtube:   { id: 'youtube',    name: 'DreamTube',   icon: 'fab fa-youtube',       color: '#FF3B30', page: 'youtube.html',    folder: 'fun' },
        weather:   { id: 'weather',    name: 'Weather',     icon: 'fas fa-cloud-sun',     color: '#5AC8FA', page: 'weather.html',    folder: 'core' },
        dreamstore:{ id: 'dreamstore', name: 'Dream Store', icon: 'fas fa-store',         color: '#AF52DE', page: 'dreamstore.html', folder: 'core' },
        browser:   { id: 'browser',    name: 'Browser',     icon: 'fas fa-globe',         color: '#8E8E93', page: 'browser.html',    folder: 'core' },
        dreamfeed:{ id: 'dreamfeed', name: 'DreamFeed',   icon: 'fas fa-rss',           color: '#FF6B9D', page: 'dreamfeed.html', folder: 'social' },
        contacts:  { id: 'contacts',   name: 'Contacts',    icon: 'fas fa-address-book',  color: '#FF9F0A', page: 'contacts.html',   folder: 'social' },
        settings:  { id: 'settings',   name: 'Settings',    icon: 'fas fa-cog',           color: '#636366', page: 'settings.html',   folder: 'core' }
    };

    window.DDCatalog = {
        productivity: uniqueApps(withMeta('Productivity & School', 'study', [
            { id: 'notes',        name: 'Dream Notes',      desc: 'Write notes & reminders',          icon: 'fas fa-sticky-note',    color: '#FF9F0A', tag: 'popular', page: 'notes.html' },
            { id: 'journal',      name: 'My Journal',       desc: 'Private diary with optional lock', icon: 'fas fa-book',           color: '#5856D6', tag: 'new',     page: 'journal.html' },
            { id: 'todo',         name: 'To-Do List',       desc: 'Track your tasks',                 icon: 'fas fa-check-circle',   color: '#34C759', tag: '',        page: 'todo.html' },
            { id: 'calculator',   name: 'Calculator',       desc: 'Quick math helper',                icon: 'fas fa-calculator',     color: '#8E8E93', tag: '',        page: 'calculator.html' },
            { id: 'dreamplanner', name: 'Dream Planner',    desc: 'Goals, homework, wishes & dates',  icon: 'fas fa-star',           color: '#FFB703', tag: 'new',     page: 'dreamplanner.html' },
            { id: 'focus',        name: 'Focus Mode',       desc: 'Pomodoro timer with rewards',      icon: 'fas fa-hourglass-half', color: '#007AFF', tag: 'popular', page: 'focus.html' }
        ])),

        wellness: uniqueApps(withMeta('Wellness & Vibes', 'vibes', [
            { id: 'moodvibes',    name: 'Mood & Vibes',     desc: 'Mood streaks, quotes & fortunes',  icon: 'fas fa-face-smile-beam', color: '#FF5E9C', tag: 'new',     page: 'moodvibes.html' },
            { id: 'selfcare',     name: 'Self-Care',        desc: 'Habits, hydration & positivity',   icon: 'fas fa-heart',          color: '#34C759', tag: 'popular', page: 'selfcare.html' },
            { id: 'moodboard',    name: 'Mood Board',       desc: 'Save colors, vibes & dream notes', icon: 'fas fa-images',         color: '#BF5AF2', tag: '',        page: 'moodboard.html' }
        ])),

        games: uniqueApps(withMeta('Games & Fun', 'fun', [
            { id: 'trivia',         name: 'Dream Trivia',     desc: 'Fun quiz challenges',            icon: 'fas fa-brain',       color: '#FF2D55', tag: 'popular', page: 'trivia.html' },
            { id: 'memory',         name: 'Memory Match',     desc: 'Card matching game',             icon: 'fas fa-th',          color: '#5AC8FA', tag: 'new',     page: 'memory.html' },
            { id: 'tictactoe',      name: 'Tic-Tac-Toe',     desc: 'Classic X & O game',             icon: 'fas fa-times',       color: '#007AFF', tag: '',        page: 'tictactoe.html' },
            { id: 'snake',          name: 'Dream Snake',      desc: 'Retro snake game',               icon: 'fas fa-gamepad',     color: '#34C759', tag: 'new',     page: 'snake.html' },
            { id: 'wouldyourather', name: 'Would You Rather', desc: 'Fun clean choices for everyone', icon: 'fas fa-random',      color: '#FF9F0A', tag: 'new',     page: 'wouldyourather.html' },
            { id: 'quizdaily',      name: 'Quiz of the Day',  desc: 'Music, movies & school trivia',  icon: 'fas fa-bolt',        color: '#5856D6', tag: 'popular', page: 'quizdaily.html' },
            { id: 'petbuddy',       name: 'Pet Buddy',        desc: 'Feed, play & level up your pet', icon: 'fas fa-paw',         color: '#00C7BE', tag: 'new',     page: 'petbuddy.html' }
        ])),

        social: uniqueApps(withMeta('Creative & Social', 'creative', [
            { id: 'doodle',   name: 'Doodle Pad',    desc: 'Draw and sketch for fun',    icon: 'fas fa-paint-brush', color: '#BF5AF2', tag: 'popular', page: 'doodle.html' },
            { id: 'photos',   name: 'Photo Album',   desc: 'Save your snapshots',        icon: 'fas fa-camera',      color: '#FF6259', tag: '',        page: 'photos.html' },
            { id: 'stickers', name: 'Sticker Maker', desc: 'Build cute sticker packs',   icon: 'fas fa-icons',       color: '#FF8C42', tag: 'new',     page: 'stickers.html' }
        ]))
    };

    window.DDGetAllApps = function (includeCore) {
        var out = [];
        if (includeCore !== false) {
            Object.keys(window.DDCoreApps).forEach(function (key) {
                out.push(window.DDCoreApps[key]);
            });
        }
        Object.keys(window.DDCatalog).forEach(function (key) {
            out = out.concat(window.DDCatalog[key]);
        });
        return uniqueApps(out);
    };
})();
