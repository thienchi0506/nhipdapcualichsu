import { listen } from './diagnostics.js';

export function createInput({ scope, canvas, root, enabled, onCamera, onPause, onAction }) {
  const keys = new Set();
  const pointers = new Map();
  const mapping = { KeyW: 'forward', ArrowUp: 'forward', KeyS: 'back', ArrowDown: 'back', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };
  function clear() {
    keys.clear();
    for (const id of [...pointers.keys()]) for (const button of root.querySelectorAll('[data-move]')) {
      if (button.hasPointerCapture(id)) button.releasePointerCapture(id);
    }
    pointers.clear();
    root.querySelectorAll('[data-move]').forEach(button => {
      button.dataset.held = 'false';
    });
  }
  listen(scope, canvas, 'keydown', event => {
    if (!enabled() || event.ctrlKey || event.altKey || event.metaKey) return;
    if (mapping[event.code]) { keys.add(mapping[event.code]); event.preventDefault(); }
    if (event.code === 'KeyC' && !event.repeat) { event.preventDefault(); onCamera(); }
    if (event.code === 'Escape' && !event.repeat) { event.preventDefault(); onPause(); }
    const actions = { Space: 'anchor', KeyF: 'recover', KeyR: 'repair', KeyB: 'pump', KeyX: 'unload' };
    if (actions[event.code] && !event.repeat) { event.preventDefault(); onAction(actions[event.code]); }
  });
  listen(scope, canvas, 'keyup', event => { if (mapping[event.code]) keys.delete(mapping[event.code]); });
  listen(scope, canvas, 'blur', clear);
  for (const button of root.querySelectorAll('[data-move]')) {
    listen(scope, button, 'pointerdown', event => {
      if (!enabled()) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, button.dataset.move);
      button.dataset.held = 'true';
    });
    const release = event => {
      pointers.delete(event.pointerId);
      button.dataset.held = 'false';
      if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
    };
    listen(scope, button, 'pointerup', release);
    listen(scope, button, 'pointercancel', release);
    listen(scope, button, 'lostpointercapture', release);
  }
  scope.signal.addEventListener('abort', clear, { once: true });
  return {
    clear,
    read() { const values = new Set([...keys, ...pointers.values()]); return { forward: values.has('forward'), back: values.has('back'), left: values.has('left'), right: values.has('right') }; },
  };
}
