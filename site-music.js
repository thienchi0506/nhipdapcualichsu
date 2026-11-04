/* Shared background music lifecycle across all pages.
   User preference persists via localStorage and syncs across tabs. */
(function () {
    'use strict';
    if (window.SiteMusic) return;

    const STORAGE_KEY = 'dcls.music.v2';
    const LEGACY_KEY = 'dcls.music.session.v1';
    const tracks = [1, 2, 3, 4].map(n => 'nhac-nen-' + n + '.mp3');

    let saved = {};
    try {
        const raw = localStorage.getItem(STORAGE_KEY) ||
                    localStorage.getItem(LEGACY_KEY) ||
                    sessionStorage.getItem(STORAGE_KEY) ||
                    sessionStorage.getItem(LEGACY_KEY);
        if (raw) saved = JSON.parse(raw);
    } catch (_) {}

    let enabled = saved.enabled === true;
    let track = Number.isInteger(saved.track) && saved.track >= 0 && saved.track < tracks.length ? saved.track : 0;
    let position = Number.isFinite(saved.position) ? Math.max(0, saved.position) : 0;

    let audio = null;
    let ready = false;
    let leaving = false;
    let pending = false;
    let exam = false;
    let gameNarration = false;
    let previousGame = false;
    let speechGeneration = 0;
    const speaking = new Set();
    let failures = 0;
    let playVersion = 0;
    const narrationMedia = new Set();
    const gamePage = /(?:sa-ban(?:-3d|-nhu-nguyet)?|tran-do-nhap-vai)\.html$/.test(location.pathname);

    function store() {
        if (audio && audio.readyState > 0 && Number.isFinite(audio.currentTime)) {
            position = audio.currentTime;
        }
        const data = JSON.stringify({ enabled, track, position });
        try { localStorage.setItem(STORAGE_KEY, data); } catch (_) {}
        try { sessionStorage.setItem(STORAGE_KEY, data); } catch (_) {}
        try { sessionStorage.setItem(LEGACY_KEY, data); } catch (_) {}
    }

    function gameActive() {
        if (!gamePage) return false;
        const lobby3d = document.getElementById('lobby-3d-modal');
        if (lobby3d) return lobby3d.classList.contains('hidden');
        const stage = document.getElementById('game-stage-wrapper');
        if (stage) return !stage.hidden && getComputedStyle(stage).display !== 'none';
        return true;
    }

    function allowed() {
        // Music plays if enabled, audio ready, not hidden in background tab, not unloading,
        // and not currently suppressed by in-game voice narration.
        // Background music is NOT blocked by exams or window blur!
        return enabled && ready && !gameNarration && speaking.size === 0 && !document.hidden && !leaving;
    }

    function updateUI() {
        const playing = !!audio && !audio.paused && allowed();
        // If enabled is true, show as 'Bật' unless tab is hidden ('Tạm dừng')
        const status = !enabled ? 'Tắt' : (document.hidden ? 'Tạm dừng' : 'Bật');
        const title = 'Nhấp để ' + (enabled ? 'tắt' : 'bật') + ' nhạc · Nhấp đúp để đổi bài';

        ['btn-toggle-music', 'btn-music', 'audio-badge', 'site-music-toggle'].forEach(id => {
            const button = document.getElementById(id);
            if (!button) return;
            button.classList.toggle('active', enabled);
            button.setAttribute('aria-pressed', String(enabled));
            button.title = title;

            const icon = button.querySelector('#music-btn-icon, .nav-music-icon, .audio-badge__icon');
            if (icon) icon.textContent = enabled ? '🎵' : '🔇';

            const label = button.querySelector('#music-btn-text, #trang-thai-nhac, #text-music-status, #lbl-music-status, #audio-status, #audio-text');
            if (label) {
                label.textContent = 'Nhạc: ' + status;
            } else if (id !== 'audio-badge') {
                button.textContent = (enabled ? '🎵' : '🔇') + ' Nhạc: ' + status;
            }
            if (id === 'audio-badge' && !label) {
                button.setAttribute('aria-label', 'Nhạc: ' + status);
            }
        });

        const bars = document.getElementById('sound-bars');
        if (bars) bars.classList.toggle('playing', playing);
        if (window.Game3D) window.Game3D.cheDoNhac = enabled;
    }

    function applyPosition() {
        if (!audio) return;
        if (position > 0 && audio.readyState >= 1 && Number.isFinite(audio.duration)) {
            try {
                if (Math.abs(audio.currentTime - position) > 1) {
                    audio.currentTime = Math.min(position, Math.max(0, audio.duration - 0.5));
                }
            } catch (_) {}
        }
    }

    function reconcile() {
        if (!ready || !audio) return;
        const canPlay = allowed();

        if (!canPlay) {
            if (!audio.paused || pending) {
                store();
                playVersion++;
                pending = false;
                try { audio.pause(); } catch (_) {}
            }
            updateUI();
            return;
        }

        if (audio.paused && !pending) {
            pending = true;
            const version = ++playVersion;
            audio.muted = false;

            const targetTrack = tracks[track];
            if (!audio.src || !audio.src.endsWith(targetTrack)) {
                audio.src = targetTrack;
            }
            applyPosition();

            const p = audio.play();
            if (p !== undefined) {
                p.then(() => {
                    if (version !== playVersion) return;
                    pending = false;
                    if (!allowed()) {
                        audio.pause();
                    }
                    updateUI();
                }).catch(() => {
                    if (version !== playVersion) return;
                    pending = false;
                    // Autoplay restriction on fresh page document - wait for first user gesture
                    updateUI();
                });
            } else {
                pending = false;
                updateUI();
            }
        } else {
            updateUI();
        }
    }

    function refresh() {
        if (!ready) return;
        const active = gameActive();
        if (previousGame && !active) {
            gameNarration = false;
            if (window.speechSynthesis) window.speechSynthesis.cancel();
        }
        previousGame = active;
        reconcile();
    }

    function choose(index) {
        if (!audio) return;
        track = (index + tracks.length) % tracks.length;
        position = 0;
        failures = 0;
        playVersion++;
        pending = false;
        audio.src = tracks[track];
        store();
        reconcile();
    }

    function next() {
        const offset = 1 + Math.floor(Math.random() * (tracks.length - 1));
        choose(track + offset);
    }

    function toggle() {
        if (!enabled) {
            // User turned music ON
            enabled = true;
            store();
            reconcile();
        } else {
            // enabled is true
            if (audio && audio.paused && allowed()) {
                // If paused due to browser autoplay policy, resume immediately
                pending = false;
                audio.play().then(updateUI).catch(() => { reconcile(); });
            } else {
                // Audio was playing, user turned it OFF
                enabled = false;
                store();
                if (audio) audio.pause();
                updateUI();
            }
        }
    }

    function setExam(active) {
        exam = !!active;
        if (exam && window.speechSynthesis) {
            try { window.speechSynthesis.cancel(); } catch (_) {}
        }
        // Background music is permitted during exams; do not silence music.
        updateUI();
    }

    function releaseNarration() {
        gameNarration = false;
        queueMicrotask(reconcile);
    }

    function watchNarration(media) {
        let token;
        narrationMedia.add(media);
        media.addEventListener('play', () => {
            if (document.hidden || leaving) { media.pause(); return; }
            token = {};
            speaking.add(token);
            if (gameActive()) gameNarration = true;
            reconcile();
        });
        const finish = () => {
            speaking.delete(token);
            narrationMedia.delete(media);
            reconcile();
        };
        ['pause', 'ended', 'error'].forEach(name => media.addEventListener(name, finish));
        return media;
    }

    // Speech listeners coexist with game-specific onend/onerror handlers and queues.
    if (window.speechSynthesis) {
        const synth = window.speechSynthesis;
        const nativeSpeak = synth.speak.bind(synth);
        const nativeCancel = synth.cancel.bind(synth);
        synth.speak = function (utterance) {
            if (document.hidden || leaving) return;
            const generation = speechGeneration;
            const token = {};
            speaking.add(token);
            if (gameActive()) gameNarration = true;
            reconcile();
            const finish = () => {
                if (generation !== speechGeneration) return;
                speaking.delete(token);
                reconcile();
            };
            utterance.addEventListener('end', finish, { once: true });
            utterance.addEventListener('error', finish, { once: true });
            try { return nativeSpeak(utterance); }
            catch (error) { finish(); throw error; }
        };
        synth.cancel = function () {
            speechGeneration++;
            speaking.clear();
            nativeCancel();
            queueMicrotask(reconcile);
        };
    }

    function init() {
        if (ready) { refresh(); return; }
        audio = document.getElementById('bg-music');
        if (!audio) {
            audio = document.createElement('audio');
            audio.id = 'bg-music';
            document.body.appendChild(audio);
        }
        audio.autoplay = false;
        audio.preload = 'auto';
        audio.loop = false;
        audio.volume = 0.45;
        audio.src = tracks[track];

        audio.addEventListener('loadedmetadata', applyPosition);
        audio.addEventListener('canplay', applyPosition);
        audio.addEventListener('ended', () => { if (enabled) next(); });
        audio.addEventListener('error', () => {
            if (allowed() && ++failures < tracks.length) {
                playVersion++;
                pending = false;
                track = (track + 1) % tracks.length;
                position = 0;
                audio.src = tracks[track];
                reconcile();
            }
        });
        audio.addEventListener('play', updateUI);
        audio.addEventListener('pause', updateUI);

        let lastStoreTime = 0;
        audio.addEventListener('timeupdate', () => {
            if (Number.isFinite(audio.currentTime) && audio.currentTime > 0) {
                position = audio.currentTime;
                const now = Date.now();
                if (now - lastStoreTime > 2000) {
                    lastStoreTime = now;
                    store();
                }
            }
        });

        if (!document.querySelector('#btn-toggle-music, #btn-music, #audio-badge')) {
            const button = document.createElement('button');
            button.id = 'site-music-toggle';
            button.type = 'button';
            button.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:9000;border:1px solid #b58b35;border-radius:24px;padding:8px 14px;background:#241b16;color:#ffe1a0;font:600 13px Arial;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.4);';
            document.body.appendChild(button);
        }

        ready = true;
        previousGame = gameActive();

        ['game-stage-wrapper', 'lobby-3d-modal'].forEach(id => {
            const target = document.getElementById(id);
            if (target) new MutationObserver(refresh).observe(target, { attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
        });

        reconcile();
        setInterval(store, 2000);
    }

    // Global interaction listener: immediately resumes music on first user gesture on new page
    function resumeOnFirstGesture() {
        if (enabled && audio && audio.paused && !leaving && !document.hidden && allowed()) {
            audio.play().then(updateUI).catch(() => {});
        }
    }
    ['click', 'pointerdown', 'touchstart', 'keydown'].forEach(evt => {
        document.addEventListener(evt, resumeOnFirstGesture, { capture: true, passive: true });
    });

    // Control button click & dblclick handler
    document.addEventListener('click', event => {
        const button = event.target.closest && event.target.closest('#btn-toggle-music, #btn-music, #audio-badge, #site-music-toggle');
        if (!button) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.detail > 1) {
            enabled = true;
            next();
        } else {
            toggle();
        }
    }, true);

    document.addEventListener('dblclick', event => {
        if (event.target.closest && event.target.closest('#btn-toggle-music, #btn-music, #audio-badge, #site-music-toggle')) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
    }, true);

    // Sync across tabs
    window.addEventListener('storage', event => {
        if (event.key === STORAGE_KEY && event.newValue) {
            try {
                const data = JSON.parse(event.newValue);
                if (typeof data.enabled === 'boolean' && data.enabled !== enabled) {
                    enabled = data.enabled;
                    reconcile();
                }
            } catch (_) {}
        }
    });

    // Handle tab visibility (pause when backgrounded, resume when foregrounded)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            narrationMedia.forEach(media => { try { media.pause(); } catch (_) {} });
            if (window.speechSynthesis) window.speechSynthesis.cancel();
        }
        reconcile();
    });

    // Handle page transitions
    function onPageLeave() {
        leaving = true;
        store();
        narrationMedia.forEach(media => { try { media.pause(); } catch (_) {} });
        if (window.speechSynthesis) window.speechSynthesis.cancel();
    }
    window.addEventListener('pagehide', onPageLeave);
    window.addEventListener('beforeunload', onPageLeave);
    window.addEventListener('pageshow', () => {
        leaving = false;
        refresh();
    });

    window.SiteMusic = { init, toggle, next, choose, refresh, updateUI, setExam, watchNarration, releaseNarration };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
