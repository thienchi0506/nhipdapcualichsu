/* Shared background music lifecycle across all pages.
   User preference persists via localStorage and syncs across tabs.
   Supports seamless continuous audio playback across internal page transitions. */
(function () {
    'use strict';

    const STORAGE_KEY = 'dcls.music.v2';
    const LEGACY_KEY = 'dcls.music.session.v1';
    const tracks = [1, 2, 3, 4].map(n => 'nhac-nen-' + n + '.mp3');

    // =========================================================================
    //  CASE A: RUNNING INSIDE THE SEAMLESS NAVIGATION FRAME
    // =========================================================================
    const isInsideFrame = (window.self !== window.top);

    if (isInsideFrame) {
        try {
            const host = (window.parent && window.parent.SiteMusic) || (window.top && window.top.SiteMusic);
            if (host && host.__isMaster) {
                // Delegate to master player in host window
                window.SiteMusic = host;

                // Sync UI on this document when ready
                function syncChildUI() {
                    if (host.updateUI) host.updateUI(document);
                }
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', syncChildUI);
                } else {
                    syncChildUI();
                }

                // Intercept clicks on links inside the iframe
                attachFrameInterceptors(window, host);

                // Coordinate speech synthesis with master host
                if (window.speechSynthesis && host.watchSpeech) {
                    host.watchSpeech(window);
                }

                return;
            }
        } catch (_) {
            // If cross-origin or restricted, fall through to standalone player
        }
    }

    if (window.SiteMusic && window.SiteMusic.__isMaster) return;

    // =========================================================================
    //  CASE B: RUNNING AS MASTER PLAYER IN TOP/PARENT WINDOW
    // =========================================================================
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

    // Estimate elapsed time since last store for smooth continuation
    let position = Number.isFinite(saved.position) ? Math.max(0, saved.position) : 0;
    if (saved.timestamp && Number.isFinite(saved.timestamp)) {
        const elapsed = (Date.now() - saved.timestamp) / 1000;
        if (elapsed > 0 && elapsed < 8) {
            position = Math.max(0, position + elapsed);
        }
    }

    let audio = null;
    let ready = false;
    let pending = false;
    let exam = false;
    let gameNarration = false;
    let previousGame = false;
    let speechGeneration = 0;
    const speaking = new Set();
    let failures = 0;
    let playVersion = 0;
    const narrationMedia = new Set();

    let activeFrame = null;

    function store() {
        if (audio && audio.readyState > 0 && Number.isFinite(audio.currentTime)) {
            position = audio.currentTime;
        }
        const data = JSON.stringify({
            enabled,
            track,
            position,
            timestamp: Date.now()
        });
        try { localStorage.setItem(STORAGE_KEY, data); } catch (_) {}
        try { sessionStorage.setItem(STORAGE_KEY, data); } catch (_) {}
        try { sessionStorage.setItem(LEGACY_KEY, data); } catch (_) {}
    }

    function gameActive(targetDoc) {
        const doc = targetDoc || (activeFrame && activeFrame.contentDocument) || document;
        const path = doc.location ? doc.location.pathname : location.pathname;
        const isGame = /(?:sa-ban(?:-3d|-nhu-nguyet)?|tran-do-nhap-vai)\.html$/.test(path);
        if (!isGame) return false;
        const lobby3d = doc.getElementById('lobby-3d-modal');
        if (lobby3d) return lobby3d.classList.contains('hidden');
        const stage = doc.getElementById('game-stage-wrapper');
        if (stage) return !stage.hidden && getComputedStyle(stage).display !== 'none';
        return true;
    }

    function allowed() {
        // Music stays active during same-site navigation and pauses when the site is hidden.
        return enabled && ready && !gameNarration && speaking.size === 0;
    }

    function updateDocUI(doc) {
        if (!doc) return;
        const playing = !!audio && !audio.paused && allowed();
        const status = !enabled ? 'Tắt' : 'Bật';
        const title = 'Nhấp để ' + (enabled ? 'tắt' : 'bật') + ' nhạc · Nhấp đúp để đổi bài';

        ['btn-toggle-music', 'btn-music', 'audio-badge', 'site-music-toggle'].forEach(id => {
            const button = doc.getElementById(id);
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

        const bars = doc.getElementById('sound-bars');
        if (bars) bars.classList.toggle('playing', playing);
        const win = doc.defaultView;
        if (win && win.Game3D) win.Game3D.cheDoNhac = enabled;
    }

    function updateUI(targetDoc) {
        if (targetDoc) {
            updateDocUI(targetDoc);
        } else {
            updateDocUI(document);
            if (activeFrame && activeFrame.contentDocument) {
                try { updateDocUI(activeFrame.contentDocument); } catch (_) {}
            }
        }
    }

    function applyPosition() {
        if (!audio) return;
        if (position > 0 && audio.readyState >= 1 && Number.isFinite(audio.duration)) {
            try {
                if (Math.abs(audio.currentTime - position) > 0.5) {
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
            if (activeFrame?.contentWindow?.speechSynthesis) {
                try { activeFrame.contentWindow.speechSynthesis.cancel(); } catch (_) {}
            }
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
        enabled = true; // Choosing or shuffling a track turns music ON
        store();
        reconcile();
    }

    function next() {
        const offset = 1 + Math.floor(Math.random() * (tracks.length - 1));
        choose(track + offset);
    }

    function toggle() {
        if (!enabled) {
            enabled = true;
            store();
            reconcile();
        } else {
            if (audio && audio.paused && allowed()) {
                pending = false;
                audio.play().then(() => updateUI()).catch(() => reconcile());
            } else {
                enabled = false;
                store();
                if (audio) audio.pause();
                updateUI();
            }
        }
    }

    function stopForLeavingSite() {
        // Preserve the track and playhead, but do not auto-resume when the visitor returns.
        if (audio && Number.isFinite(audio.currentTime) && audio.currentTime > 0) {
            position = audio.currentTime;
        }
        enabled = false;
        pending = false;
        playVersion++;
        if (audio) {
            try { audio.pause(); } catch (_) {}
        }
        store();
        updateUI();
    }

    function leaveSite(url, sourceWindow) {
        stopForLeavingSite();
        try {
            const hostWindow = (sourceWindow || window).top || window.top;
            hostWindow.location.assign(url);
        } catch (_) {
            (sourceWindow || window).location.assign(url);
        }
    }

    function setExam(active) {
        exam = !!active;
        if (exam && window.speechSynthesis) {
            try { window.speechSynthesis.cancel(); } catch (_) {}
        }
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

    function watchSpeech(win) {
        if (!win || !win.speechSynthesis) return;
        const synth = win.speechSynthesis;
        const nativeSpeak = synth.speak.bind(synth);
        const nativeCancel = synth.cancel.bind(synth);
        synth.speak = function (utterance) {
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

    watchSpeech(window);

    // =========================================================================
    //  SEAMLESS NAVIGATION ENGINE
    // =========================================================================
    const initialUrl = location.href;
    const initialPath = location.pathname;

    function getFrame() {
        if (!activeFrame) {
            activeFrame = document.getElementById('site-nav-frame');
        }
        if (!activeFrame) {
            activeFrame = document.createElement('iframe');
            activeFrame.id = 'site-nav-frame';
            activeFrame.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:none;margin:0;padding:0;z-index:2147483647;background:#110B08;display:none;';
            (document.body || document.documentElement).appendChild(activeFrame);

            activeFrame.addEventListener('load', () => {
                try {
                    const childDoc = activeFrame.contentDocument;
                    if (childDoc) {
                        if (childDoc.title) document.title = childDoc.title;
                        updateDocUI(childDoc);
                        const childUrl = activeFrame.contentWindow.location.pathname + activeFrame.contentWindow.location.search;
                        const currUrl = location.pathname + location.search;
                        if (childUrl && childUrl !== currUrl) {
                            history.replaceState({ siteMusicNav: true, url: childUrl }, '', childUrl);
                        }
                    }
                } catch (_) {}
            });
        }
        return activeFrame;
    }

    function navigateTo(url) {
        if (!url) return;
        const targetUrl = new URL(url, location.href);
        const targetPath = targetUrl.pathname;

        // If target matches initial host page
        if (targetUrl.href === initialUrl || targetPath === initialPath) {
            const frame = getFrame();
            frame.style.display = 'none';
            frame.src = 'about:blank';
            history.pushState({ siteMusicNav: true, url: targetUrl.href }, '', targetUrl.href);
            updateDocUI(document);
            window.scrollTo(0, 0);
            return;
        }

        const frame = getFrame();
        frame.style.display = 'block';
        frame.src = targetUrl.href;
        history.pushState({ siteMusicNav: true, url: targetUrl.href }, '', targetUrl.href);
    }

    window.addEventListener('popstate', () => {
        const frame = getFrame();
        const currentPath = location.pathname;
        if (location.href === initialUrl || currentPath === initialPath) {
            frame.style.display = 'none';
            frame.src = 'about:blank';
            updateDocUI(document);
        } else {
            frame.style.display = 'block';
            frame.src = location.href;
        }
    });

    function attachNavigationInterceptor(win) {
        const doc = win.document;
        doc.addEventListener('click', event => {
            // Music button handling
            const musicBtn = event.target.closest && event.target.closest('#btn-toggle-music, #btn-music, #audio-badge, #site-music-toggle');
            if (musicBtn) {
                event.preventDefault();
                event.stopImmediatePropagation();
                if (event.detail > 1) {
                    next();
                } else {
                    toggle();
                }
                return;
            }

            // Internal navigation link handling
            const anchor = event.target.closest && event.target.closest('a[href]');
            if (!anchor) return;
            if (anchor.hasAttribute('download')) return;

            const href = anchor.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

            try {
                const targetUrl = new URL(href, win.location.href);
                if (targetUrl.origin !== win.location.origin) {
                    // External destinations should leave the site's persistent music host.
                    if (anchor.target && anchor.target !== '_self' && anchor.target !== '_top') {
                        stopForLeavingSite();
                        return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    leaveSite(targetUrl.href, win);
                    return;
                }

                if (anchor.target && anchor.target !== '_self') return;

                const path = targetUrl.pathname.toLowerCase();
                if (path.endsWith('.html') || path.endsWith('/') || !path.includes('.')) {
                    if (targetUrl.pathname === win.location.pathname && targetUrl.search === win.location.search && targetUrl.hash) {
                        return; // Allow in-page anchor jumping
                    }

                    event.preventDefault();
                    navigateTo(targetUrl.href);
                }
            } catch (_) {}
        }, true);

        doc.addEventListener('dblclick', event => {
            if (event.target.closest && event.target.closest('#btn-toggle-music, #btn-music, #audio-badge, #site-music-toggle')) {
                event.preventDefault();
                event.stopImmediatePropagation();
            }
        }, true);
    }

    function attachFrameInterceptors(win, masterHost) {
        const doc = win.document;
        doc.addEventListener('click', event => {
            const musicBtn = event.target.closest && event.target.closest('#btn-toggle-music, #btn-music, #audio-badge, #site-music-toggle');
            if (musicBtn) {
                event.preventDefault();
                event.stopImmediatePropagation();
                if (event.detail > 1) {
                    masterHost.next();
                } else {
                    masterHost.toggle();
                }
                return;
            }

            const anchor = event.target.closest && event.target.closest('a[href]');
            if (!anchor) return;
            if (anchor.hasAttribute('download')) return;

            const href = anchor.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

            try {
                const targetUrl = new URL(href, win.location.href);
                if (targetUrl.origin !== win.location.origin) {
                    if (anchor.target && anchor.target !== '_self' && anchor.target !== '_top') {
                        masterHost.stopForLeavingSite();
                        return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    masterHost.leaveSite(targetUrl.href, win);
                    return;
                }

                if (anchor.target && anchor.target !== '_self') return;

                const path = targetUrl.pathname.toLowerCase();
                if (path.endsWith('.html') || path.endsWith('/') || !path.includes('.')) {
                    if (targetUrl.pathname === win.location.pathname && targetUrl.search === win.location.search && targetUrl.hash) {
                        return;
                    }

                    event.preventDefault();
                    masterHost.navigateTo(targetUrl.href);
                }
            } catch (_) {}
        }, true);

        doc.addEventListener('dblclick', event => {
            if (event.target.closest && event.target.closest('#btn-toggle-music, #btn-music, #audio-badge, #site-music-toggle')) {
                event.preventDefault();
                event.stopImmediatePropagation();
            }
        }, true);
    }

    function init() {
        if (ready) { refresh(); return; }

        audio = document.getElementById('bg-music');
        if (!audio) {
            audio = new Audio();
            audio.id = 'bg-music';
            if (document.body) {
                try { document.body.appendChild(audio); } catch (_) {}
            }
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
        audio.addEventListener('play', () => updateUI());
        audio.addEventListener('pause', () => updateUI());

        let lastStoreTime = 0;
        audio.addEventListener('timeupdate', () => {
            if (Number.isFinite(audio.currentTime) && audio.currentTime > 0) {
                position = audio.currentTime;
                const now = Date.now();
                if (now - lastStoreTime > 1000) {
                    lastStoreTime = now;
                    store();
                }
            }
        });

        ready = true;
        previousGame = gameActive();

        if (document.body) {
            setupMasterBody();
        } else {
            document.addEventListener('DOMContentLoaded', setupMasterBody);
        }

        reconcile();
        setInterval(store, 1500);
    }

    function setupMasterBody() {
        if (!document.querySelector('#btn-toggle-music, #btn-music, #audio-badge')) {
            const button = document.createElement('button');
            button.id = 'site-music-toggle';
            button.type = 'button';
            button.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:9000;border:1px solid #b58b35;border-radius:24px;padding:8px 14px;background:#241b16;color:#ffe1a0;font:600 13px Arial;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.4);';
            document.body.appendChild(button);
        }

        ['game-stage-wrapper', 'lobby-3d-modal'].forEach(id => {
            const target = document.getElementById(id);
            if (target) new MutationObserver(refresh).observe(target, { attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
        });

        attachNavigationInterceptor(window);
        updateUI();
    }

    // Global interaction listener: immediately resumes music on first user gesture if blocked by autoplay
    function resumeOnFirstGesture() {
        if (enabled && audio && audio.paused && allowed()) {
            audio.play().then(() => updateUI()).catch(() => {});
        }
    }
    ['click', 'pointerdown', 'touchstart', 'keydown'].forEach(evt => {
        document.addEventListener(evt, resumeOnFirstGesture, { capture: true, passive: true });
    });

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

    // Stop audio when this site is sent to the background. Internal page changes
    // stay inside the persistent host, so they do not trigger this handler.
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            narrationMedia.forEach(media => { try { media.pause(); } catch (_) {} });
            if (window.speechSynthesis) window.speechSynthesis.cancel();
            stopForLeavingSite();
        }
    });

    // The host is being closed/replaced (including an external top-level link).
    function onPageLeave() {
        stopForLeavingSite();
    }
    window.addEventListener('pagehide', onPageLeave);
    window.addEventListener('beforeunload', onPageLeave);

    window.SiteMusic = {
        __isMaster: true,
        init,
        toggle,
        next,
        choose,
        refresh,
        updateUI,
        setExam,
        watchNarration,
        releaseNarration,
        navigateTo,
        leaveSite,
        stopForLeavingSite,
        watchSpeech,
        get audio() { return audio; },
        get enabled() { return enabled; },
        get track() { return track; },
        get position() { return position; }
    };

    window.__SiteMusicHost = window.SiteMusic;

    // Initialize immediately
    init();
})();
