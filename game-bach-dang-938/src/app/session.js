import { createRiverState, stepRiver, riverSnapshot } from '../sim/vessel.js';
import { createFixedClock, frameDelta } from '../core/clock.js';
import { createInput } from './input.js';
import { metrics, listen } from './diagnostics.js';

export function createSession({ root, scene, data, heroId, vesselType = 'light', scenarioId = 'harbor', onPause, onCamera, onClock, onStatus = () => {} }) {
  const scope = new AbortController();
  const config = data.riverConfig;
  let state = createRiverState(config, { heroId, vesselType, scenarioId }), previous = { ...state };
  let disposed = false, running = false, raf = 0, lastTime = null, frames = 0, lastSecond = -1, actionSequence = 0, backlogMs = 0;
  const pending = [];
  const clock = createFixedClock(config.tickHz, config.maxCatchUpTicks);
  metrics.sessionsCreated++;
  function action(type) { if (running && ['anchor', 'recover', 'repair', 'pump', 'unload'].includes(type)) pending.push({ id: `action:${++actionSequence}`, type }); }
  const input = createInput({ scope, canvas: scene.canvas, root, enabled: () => running, onCamera, onPause, onAction: action });
  function frame(now) {
    if (!running || disposed) return;
    const elapsed = frameDelta(now, lastTime); lastTime = now;
    const result = clock.advance(elapsed, () => {
      previous = { ...state };
      stepRiver(state, { ...input.read(), actions: pending.splice(0) });
    });
    backlogMs = result.backlogMs;
    scene.render(state, previous, result.alpha); frames++;
    if (result.ticks > 0 && state.tick % (config.tickHz / config.hudHz) < result.ticks) onStatus(riverSnapshot(state), backlogMs);
    const second = Math.floor(state.tick / config.tickHz);
    if (second !== lastSecond) { onClock(second); lastSecond = second; }
    raf = requestAnimationFrame(frame);
  }
  function pause() {
    if (running) { running = false; cancelAnimationFrame(raf); raf = 0; metrics.activeLoops--; }
    input.clear(); pending.length = 0; scene.releaseControls(); scene.render(state);
  }
  listen(scope, window, 'blur', () => { if (running) onPause('focusLost'); });
  listen(scope, document, 'visibilitychange', () => { if (document.hidden && running) onPause('hidden'); });
  scene.render(state);
  onStatus(riverSnapshot(state), 0);
  return {
    start() { if (disposed || running) return; running = true; input.clear(); clock.reset(); lastTime = null; metrics.activeLoops++; raf = requestAnimationFrame(frame); scene.canvas.focus({ preventScroll: true }); },
    action,
    pause,
    toggleCamera() { const mode = scene.toggleCamera(); scene.canvas.focus({ preventScroll: true }); return mode; },
    snapshot() { return { running, disposed, tick: state?.tick ?? 0, seconds: Math.floor((state?.tick ?? 0) / config.tickHz), x: state?.x, z: state?.z, heroId, frames, backlogMs, river: state ? riverSnapshot(state) : null, scene: disposed ? null : scene.stats() }; },
    dispose() { if (disposed) return; pause(); disposed = true; scope.abort(); scene.dispose(); state = null; previous = null; metrics.sessionsDisposed++; },
  };
}
