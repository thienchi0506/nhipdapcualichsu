/* Shared game clock, pausable tasks and player settings. No network/storage data beyond preferences. */
(function (global) {
    'use strict';
    const STEP = 1 / 60;
    const presets = {
        low: { dpr: 1, particles: 0.35, shadows: false, fps: 30 },
        medium: { dpr: 1.25, particles: 0.65, shadows: true, fps: 60 },
        high: { dpr: 1.5, particles: 1, shadows: true, fps: 60 }
    };
    let stored = {};
    try { stored = JSON.parse(localStorage.getItem('history-game-settings') || '{}'); } catch (_) {}
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const settings = {
        quality: ['auto', 'low', 'medium', 'high'].includes(stored.quality) ? stored.quality : 'auto',
        reducedMotion: typeof stored.reducedMotion === 'boolean' ? stored.reducedMotion : reduced,
        shake: typeof stored.shake === 'boolean' ? stored.shake : !reduced,
        grid: !!stored.grid, stats: !!stored.stats
    };
    function resolveQuality(requested) {
        const chosen = requested === 'auto' ? (isMobile() ? 'low' : 'medium') : requested;
        return isMobile() && chosen === 'high' ? 'medium' : chosen;
    }
    function qualityProfile() {
        const base = presets[effectiveQuality] || presets.medium;
        if (!isMobile()) return base;
        return {
            ...base,
            dpr: Math.min(base.dpr, 1.25),
            particles: Math.min(base.particles, 0.55),
            shadows: false,
            fps: Math.min(base.fps, 45)
        };
    }
    let effectiveQuality = resolveQuality(settings.quality);
    const loops = new Map(), tasks = new Map(), reasons = new Set(), listeners = new Set();
    let frame = 0, last = null, accumulator = 0, time = 0, taskId = 0, sampleIndex = 0;
    let sampleCount = 0, frameCount = 0, droppedSteps = 0, nextQualityCheck = 10, healthyWindows = 0;
    const samples = new Float32Array(600);
    const renderSamples = [];
    let renderedFrames=0, lastPaint=null;
    function recordRender(){
        const now=performance.now();
        if(lastPaint!==null){renderSamples.push(now-lastPaint);if(renderSamples.length>300)renderSamples.shift();}
        lastPaint=now;renderedFrames++;
    }
    function isMobile() {
        return !!navigator.userAgentData?.mobile || /Android|iPhone|iPad|iPod|Windows Phone|Mobile/i.test(navigator.userAgent);
    }
    function emit() {
        document.documentElement.classList.toggle('hg-reduced-motion', settings.reducedMotion);
        document.documentElement.classList.toggle('hg-no-shake', !settings.shake);
        const quality = qualityProfile();
        for (const listener of listeners) listener(quality, settings);
        global.dispatchEvent(new CustomEvent('history-game-settings', {detail: {quality, settings}}));
    }
    function percentile(q) {
        if (!sampleCount) return 0;
        const values = Array.from(samples.subarray(0, sampleCount)).sort((a,b)=>a-b);
        return values[Math.min(values.length-1, Math.floor(values.length*q))];
    }
    function snapshot() {
        return {time, paused: reasons.size > 0 || document.hidden, reasons: Array.from(reasons),
            quality: effectiveQuality, requestedQuality: settings.quality, frames: frameCount,
            frameP50: percentile(.5), frameP95: percentile(.95), tasks: tasks.size,
            loops: Array.from(loops.keys()), droppedSteps, renderedFrames,
            renderP50: renderSamples.length ? [...renderSamples].sort((a,b)=>a-b)[Math.floor(renderSamples.length*.5)] : 0,
            renderP95: renderSamples.length ? [...renderSamples].sort((a,b)=>a-b)[Math.floor(renderSamples.length*.95)] : 0};
    }
    function schedule() {
        if (!frame && !document.hidden && !reasons.size && loops.size) frame = requestAnimationFrame(tick);
    }
    function resetClock() { last = null; lastPaint=null; accumulator = 0; }
    function pause(reason = 'player') {
        reasons.add(reason); cancelAnimationFrame(frame); frame = 0; resetClock();
        global.dispatchEvent(new CustomEvent('history-game-pause', {detail: true}));
    }
    function resume(reason = 'player') {
        reasons.delete(reason); resetClock(); schedule();
        if (!reasons.size && !document.hidden) global.dispatchEvent(new CustomEvent('history-game-pause', {detail: false}));
    }
    function tick(now) {
        frame = 0;
        if (document.hidden || reasons.size) { resetClock(); return; }
        const raw = last === null ? STEP : Math.max(0, (now-last)/1000);
        last = now;
        if (raw > 0 && raw < .5) { samples[sampleIndex++ % samples.length] = raw*1000; sampleCount=Math.min(samples.length,sampleCount+1); }
        accumulator += Math.min(raw, .1);
        let steps = 0;
        while (accumulator + 1e-9 >= STEP && steps < 3) {
            time += STEP; accumulator -= STEP; steps++;
            for (const [id, task] of tasks) {
                if (time + 1e-9 < task.due) continue;
                if (task.every) task.due = time + task.every; else tasks.delete(id);
                try { task.fn(); } catch (error) { console.error('Game task:', error); }
            }
            for (const loop of loops.values()) if (loop.update) {
                try { loop.update(STEP, time); }
                catch(error) { if(loop.lastError!==error.message)console.error('Game update:',error);loop.lastError=error.message; }
            }
        }
        if (accumulator >= STEP) { droppedSteps += Math.floor(accumulator/STEP); accumulator %= STEP; }
        for (const loop of loops.values()) {
            if (!loop.render) continue;
            const requestedFps = typeof loop.fps === 'function' ? loop.fps(settings, qualityProfile()) : loop.fps;
            const interval = 1 / Math.max(1, requestedFps || qualityProfile().fps);
            if (now - loop.lastRender + .1 < interval*1000) continue;
            const delta = loop.lastRender ? Math.min(.1, (now-loop.lastRender)/1000) : STEP;
            loop.lastRender = now;
            try { loop.render(delta, time, accumulator/STEP); }
            catch(error) { if(loop.lastError!==error.message)console.error('Game render:',error);loop.lastError=error.message; }
        }
        frameCount++;
        if (settings.quality === 'auto' && time > nextQualityCheck && sampleCount >= 120) {
            nextQualityCheck = time + 10;
            const p95 = percentile(.95);
            if (p95 > 38 && effectiveQuality !== 'low') {
                effectiveQuality = effectiveQuality === 'high' ? 'medium' : 'low'; healthyWindows = 0; emit();
            } else if (p95 < 20 && effectiveQuality !== (isMobile() ? 'medium' : 'high')) {
                if (++healthyWindows >= 3) { effectiveQuality = effectiveQuality === 'low' ? 'medium' : 'high'; healthyWindows=0; emit(); }
            } else healthyWindows=0;
        }
        schedule();
    }
    function delay(fn, ms, repeat) {
        const id = 'hg-' + (++taskId), seconds = Math.max(STEP, Number(ms)/1000 || STEP);
        tasks.set(id, {fn, due: time+seconds, every: repeat ? seconds : 0}); schedule(); return id;
    }
    function cancel(id) {
        if (typeof id === 'string') tasks.delete(id);
        else { global.clearTimeout(id); global.clearInterval(id); }
    }
    function configure(change) {
        if (change.quality && ['auto','low','medium','high'].includes(change.quality)) {
            settings.quality=change.quality;
            effectiveQuality=resolveQuality(change.quality);
            nextQualityCheck=time+10; healthyWindows=0;
        }
        ['reducedMotion','shake','grid','stats'].forEach(k=> { if (typeof change[k]==='boolean') settings[k]=change[k]; });
        try { localStorage.setItem('history-game-settings',JSON.stringify(settings)); } catch (_) {}
        emit();
    }
    function mountControls() {
        if (document.getElementById('hg-settings')) return;
        const panel=document.createElement('dialog'); panel.id='hg-settings'; panel.className='interactive';
        panel.innerHTML='<form method="dialog"><button class="hg-close" aria-label="Đóng tùy chỉnh">×</button></form><h2>Tùy chỉnh sa bàn</h2>'+
            '<label>Đồ họa <select id="hg-quality"><option value="auto">Tự động</option><option value="low">Tiết kiệm</option><option value="medium">Cân bằng</option><option value="high">Chi tiết</option></select></label>'+
            '<label><input id="hg-motion" type="checkbox"> Giảm chuyển động trang trí</label>'+
            '<label><input id="hg-shake" type="checkbox"> Rung khi trúng đòn</label>'+
            '<label><input id="hg-grid" type="checkbox"> Hiện lưới chiến thuật 2D</label>'+
            '<label><input id="hg-stats" type="checkbox"> Hiện số liệu khung hình</label>'+
            '<p>Chọn quân và ra lệnh bằng chuột. Phím P: tạm dừng / tiếp tục. Esc: đóng bảng này.</p>';
        const dock=document.createElement('div'); dock.id='hg-controls'; dock.className='interactive';
        dock.innerHTML='<output id="hg-meter" hidden></output><button type="button" id="hg-pause" aria-pressed="false">⏸ Tạm dừng</button><button type="button" id="hg-open" aria-haspopup="dialog">⚙ Tùy chỉnh</button>';
        document.body.append(dock,panel);
        const select=panel.querySelector('#hg-quality'); select.value=settings.quality;
        select.onchange=()=>configure({quality:select.value});
        [['motion','reducedMotion'],['shake','shake'],['grid','grid'],['stats','stats']].forEach(([id,key])=>{
            const input=panel.querySelector('#hg-'+id); input.checked=settings[key]; input.onchange=()=>configure({[key]:input.checked});
        });
        const button=dock.querySelector('#hg-pause');
        function togglePause() {
            const paused=reasons.has('player'); paused?resume():pause();
            button.textContent=paused?'⏸ Tạm dừng':'▶ Tiếp tục'; button.setAttribute('aria-pressed',String(!paused));
        }
        button.onclick=togglePause;
        dock.querySelector('#hg-open').onclick=()=>{pause('settings');panel.showModal();};
        panel.addEventListener('close',()=>resume('settings'));
        document.addEventListener('keydown',e=>{
            if (e.repeat || e.ctrlKey || e.altKey || e.metaKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || panel.open) return;
            if(e.code==='KeyP'){e.preventDefault();togglePause();}
        });
        let meterTimer = 0;
        function clearMeterTimer() {
            if (meterTimer) global.clearTimeout(meterTimer);
            meterTimer = 0;
        }
        function refreshMeter() {
            const meter=dock.querySelector('#hg-meter'); meter.hidden=!settings.stats;
            if (!settings.stats || document.hidden || !dock.isConnected) { clearMeterTimer(); return; }
            const s=snapshot(); meter.textContent=`${s.paused?'Tạm dừng':Math.round(1000/(s.renderP50||16.67))+' FPS'} · p95 ${s.renderP95.toFixed(1)} ms`;
            clearMeterTimer(); meterTimer=global.setTimeout(refreshMeter,1000);
        }
        global.addEventListener('history-game-settings', refreshMeter);
        document.addEventListener('visibilitychange', refreshMeter);
        global.addEventListener('pagehide', clearMeterTimer);
        global.addEventListener('pageshow', refreshMeter);
        refreshMeter();
    }
    global.HistoryGame = {
        settings, presets, snapshot, isMobile, pause, resume, configure, recordRender,
        get paused(){return reasons.size>0||document.hidden;},
        get quality(){return qualityProfile();},
        now:()=>time*1000,
        addLoop(name, options) { if(loops.has(name)) return; loops.set(name,{...options,lastRender:0}); schedule(); },
        removeLoop(name) { loops.delete(name); if(!loops.size){cancelAnimationFrame(frame);frame=0;resetClock();} },
        delay:(fn,ms)=>delay(fn,ms,false), every:(fn,ms)=>delay(fn,ms,true), cancel,
        resetScene(){tasks.clear();resetClock();global.dispatchEvent(new Event('history-game-scene-reset'));},
        onSettings(fn){listeners.add(fn);fn(qualityProfile(),settings);return ()=>listeners.delete(fn);},
        mountControls,
        active(unit){return !!unit && Number.isFinite(unit.hp) && unit.hp>0 && !unit.sunk && !unit.surrendered;},
        healthPercent(unit){return Math.max(0,Math.min(100,(Number(unit?.hp)||0)/(Number(unit?.maxHp)||100)*100));},
        dispose(object){
            if(!object)return;
            object.parent?.remove(object);
            const geometries=new Set(), materials=new Set();
            object.traverse?.(node=>{if(node.geometry)geometries.add(node.geometry);if(node.material)(Array.isArray(node.material)?node.material:[node.material]).forEach(m=>materials.add(m));});
            geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
        }
    };
    document.addEventListener('visibilitychange',()=>{
        if(document.hidden)pause('hidden');else resume('hidden');
    });
    global.addEventListener('pagehide',()=>pause('pagehide'));
    global.addEventListener('pageshow',()=>resume('pagehide'));
    // Pausing must block combat input as well as movement and timers.
    ['pointerdown','pointerup','click','contextmenu','keydown','keyup'].forEach(type=>document.addEventListener(type,e=>{
        if(!reasons.size || e.target.closest('#hg-controls,#hg-settings,#hg-defeat,dialog,[role="dialog"],[data-allow-when-paused],a[href]') || e.code==='KeyP')return;
        e.preventDefault();e.stopImmediatePropagation();
    },true));
    emit();
})(window);
