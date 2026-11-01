/* Shared background music lifecycle. User preference is separate from temporary pauses. */
(function () {
    'use strict';
    if (window.SiteMusic) return;
    const KEY = 'dcls.music.session.v1';
    const tracks = [1, 2, 3, 4].map(n => 'nhac-nen-' + n + '.mp3');
    let saved = {};
    try { saved = JSON.parse(sessionStorage.getItem(KEY) || '{}'); } catch (_) {}
    let enabled = saved.enabled === true;
    let track = Number.isInteger(saved.track) && saved.track >= 0 && saved.track < tracks.length ? saved.track : 0;
    let position = Number.isFinite(saved.position) ? Math.max(0, saved.position) : 0;
    let audio, ready = false, leaving = false, focused = true, pending = false;
    let exam = false, gameNarration = false, previousGame = false;
    let speechGeneration = 0, speaking = new Set(), failures = 0;
    let playVersion = 0, lastAllowed = false;
    const narrationMedia = new Set();
    const gamePage = /(?:sa-ban(?:-3d|-nhu-nguyet)?|tran-do-nhap-vai)\.html$/.test(location.pathname);

    function store() {
        if (audio && audio.readyState > 0 && Number.isFinite(audio.currentTime)) position = audio.currentTime;
        try { sessionStorage.setItem(KEY, JSON.stringify({ enabled, track, position })); } catch (_) {}
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
        return enabled && ready && !exam && !gameNarration && speaking.size === 0 && !document.hidden && focused && !leaving;
    }

    function updateUI() {
        const playing = !!audio && !audio.paused && allowed();
        const status = !enabled ? 'Tắt' : (playing ? 'Bật' : 'Tạm dừng');
        const title = 'Nhấp để ' + (enabled ? 'tắt' : 'bật') + ' nhạc · Nhấp đúp để đổi bài';
        ['btn-toggle-music', 'btn-music', 'audio-badge', 'site-music-toggle'].forEach(id => {
            const button = document.getElementById(id);
            if (!button) return;
            button.classList.toggle('active', playing);
            button.setAttribute('aria-pressed', String(enabled));
            button.title = title;
            const label = button.querySelector('#music-btn-text, #trang-thai-nhac, #text-music-status, #lbl-music-status, #audio-status, #audio-text');
            if (label) label.textContent = 'Nhạc: ' + status;
            else if (id !== 'audio-badge') button.textContent = (playing ? '🎵' : '🔇') + ' Nhạc: ' + status;
            if (id === 'audio-badge' && !label) button.setAttribute('aria-label', 'Nhạc: ' + status);
        });
        const bars = document.getElementById('sound-bars');
        if (bars) bars.classList.toggle('playing', playing);
        if (window.Game3D) window.Game3D.cheDoNhac = enabled;
    }

    function reconcile() {
        if (!ready) return;
        const canPlay = allowed();
        lastAllowed = canPlay;
        if (!canPlay) {
            if (!audio.paused || pending) {
                store(); playVersion++; pending = false; audio.pause();
            }
            updateUI();
            return;
        }
        if (audio.paused && !pending) {
            pending = true;
            const version = ++playVersion;
            audio.muted = false;
            audio.play().then(() => {
                if (version !== playVersion) return;
                pending = false;
                if (!allowed()) audio.pause();
                updateUI();
            }).catch(() => {
                if (version !== playVersion) return;
                pending = false;
                // A browser may require another gesture after a full document navigation.
                updateUI();
            });
        } else updateUI();
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
        playVersion++; pending = false;
        audio.src = tracks[track];
        store();
        reconcile();
    }

    function next() {
        const offset = 1 + Math.floor(Math.random() * (tracks.length - 1));
        choose(track + offset);
    }

    function toggle() {
        enabled = !enabled;
        store();
        reconcile();
    }

    function setExam(active) {
        exam = !!active;
        if (exam && window.speechSynthesis) window.speechSynthesis.cancel();
        reconcile();
    }

    function releaseNarration() {
        gameNarration = false;
        queueMicrotask(reconcile);
    }

    function watchNarration(media) {
        let token;
        narrationMedia.add(media);
        media.addEventListener('play', () => {
            if (document.hidden || leaving || exam) { media.pause(); return; }
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
            if (document.hidden || leaving || exam) return;
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
            // Many narrators cancel immediately before queuing the next sentence.
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
        audio.preload = 'none';
        audio.loop = false;
        audio.volume = 0.45;
        audio.src = tracks[track];
        audio.addEventListener('loadedmetadata', () => {
            if (position > 0 && Number.isFinite(audio.duration)) audio.currentTime = Math.min(position, Math.max(0, audio.duration - 0.1));
        });
        audio.addEventListener('ended', () => { if (enabled) next(); });
        audio.addEventListener('error', () => {
            if (allowed() && ++failures < tracks.length) {
                playVersion++; pending = false;
                track = (track + 1) % tracks.length;
                position = 0;
                audio.src = tracks[track];
                reconcile();
            }
        });
        audio.addEventListener('play', updateUI);
        audio.addEventListener('pause', updateUI);
        if (!document.querySelector('#btn-toggle-music, #btn-music, #audio-badge')) {
            const button = document.createElement('button');
            button.id = 'site-music-toggle';
            button.type = 'button';
            button.style.cssText = 'position:fixed;bottom:16px;left:16px;z-index:9000;border:1px solid #b58b35;border-radius:24px;padding:10px 14px;background:#241b16;color:#ffe1a0;font:600 13px Arial;cursor:pointer;';
            document.body.appendChild(button);
        }
        ready = true;
        const examScreen = document.getElementById('screen-exam');
        exam = !!examScreen && examScreen.classList.contains('active');
        previousGame = gameActive();
        ['game-stage-wrapper', 'lobby-3d-modal'].forEach(id => {
            const target = document.getElementById(id);
            if (target) new MutationObserver(refresh).observe(target, { attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
        });
        reconcile();
        setInterval(store, 1000);
    }

    // Only the music controls can grant playback consent. Other clicks merely retry existing consent.
    document.addEventListener('click', event => {
        const button = event.target.closest && event.target.closest('#btn-toggle-music, #btn-music, #audio-badge, #site-music-toggle');
        if (!button) { if (enabled && !lastAllowed) refresh(); else if (enabled) reconcile(); return; }
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.detail > 1) {
            enabled = true;
            next();
        } else {
            // Invoke play in the click gesture itself (required by mobile browsers).
            toggle();
        }
    }, true);
    document.addEventListener('dblclick', event => {
        if (event.target.closest && event.target.closest('#btn-toggle-music, #btn-music, #audio-badge, #site-music-toggle')) {
            event.preventDefault(); event.stopImmediatePropagation();
        }
    }, true);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            narrationMedia.forEach(media => media.pause());
            if (window.speechSynthesis) window.speechSynthesis.cancel();
        }
        reconcile();
    });
    window.addEventListener('blur', () => { focused = false; reconcile(); });
    window.addEventListener('focus', () => { focused = true; refresh(); });
    window.addEventListener('pagehide', () => {
        leaving = true; store();
        if (audio) audio.pause();
        narrationMedia.forEach(media => media.pause());
        if (window.speechSynthesis) window.speechSynthesis.cancel();
    });
    window.addEventListener('pageshow', () => { leaving = false; focused = true; refresh(); });
    window.SiteMusic = { init, toggle, next, choose, refresh, updateUI, setExam, watchNarration, releaseNarration };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
