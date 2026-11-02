import { listen } from './diagnostics.js';

export function createInput({ scope, canvas, root, enabled, onCamera, onPause, onAction, onOrbit = () => {}, onZoom = () => {}, onPick = () => null, movementYaw = () => 0 }) {
  const keys = new Set();
  const pointers = new Map();
  const gestures = new Map();
  const mapping = { KeyW: 'forward', ArrowUp: 'forward', KeyS: 'back', ArrowDown: 'back', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', KeyQ:'guard',KeyJ:'attack',ShiftLeft:'sprint',ShiftRight:'sprint' };
  function clear() {
    keys.clear();
    for (const id of [...pointers.keys()]) for (const button of root.querySelectorAll('[data-move],[data-combat-held]')) {
      if (button.hasPointerCapture(id)) button.releasePointerCapture(id);
    }
    pointers.clear();
    for(const id of gestures.keys())if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
    gestures.clear();
    root.querySelectorAll('[data-move],[data-combat-held]').forEach(button => {
      button.dataset.held = 'false';
    });
  }
  listen(scope, canvas, 'keydown', event => {
    if (!enabled() || event.ctrlKey || event.altKey || event.metaKey) return;
    if (mapping[event.code]) { keys.add(mapping[event.code]); event.preventDefault(); }
    if (event.code === 'KeyC' && !event.repeat) { event.preventDefault(); onCamera(); }
    if (event.code === 'Escape' && !event.repeat) { event.preventDefault(); onPause(); }
    const actions = { Space: 'contextJump', KeyF: 'contextF', KeyR: 'repair', KeyB: 'pump', KeyX: 'unload',KeyE:'interact',KeyG:'board',KeyV:'dodge',KeyL:'lock',KeyM:'map' };
    if (actions[event.code] && !event.repeat) { event.preventDefault(); onAction(actions[event.code]); }
  });
  listen(scope, canvas, 'keyup', event => { if (mapping[event.code]) keys.delete(mapping[event.code]); });
  listen(scope, canvas, 'blur', clear);
  for (const button of root.querySelectorAll('[data-move],[data-combat-held]')) {
    listen(scope, button, 'pointerdown', event => {
      if (!enabled()) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, button.dataset.move||button.dataset.combatHeld);
      button.dataset.held = 'true';
    });
    const release = event => {
      pointers.delete(event.pointerId);
      button.dataset.held = String([...pointers.values()].includes(button.dataset.move||button.dataset.combatHeld));
      if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
    };
    listen(scope, button, 'pointerup', release);
    listen(scope, button, 'pointercancel', release);
    listen(scope, button, 'lostpointercapture', release);
  }
  listen(scope,canvas,'pointerdown',event=>{
    if(!enabled())return;
    canvas.focus({preventScroll:true});canvas.setPointerCapture(event.pointerId);
    gestures.set(event.pointerId,{x:event.clientX,y:event.clientY,lastX:event.clientX,moved:false,button:event.button});
  });
  listen(scope,canvas,'pointermove',event=>{
    const p=gestures.get(event.pointerId);if(!p||!enabled())return;
    if(Math.hypot(event.clientX-p.x,event.clientY-p.y)>8)p.moved=true;
    if(p.moved){onOrbit((event.clientX-p.lastX)*-0.008);p.lastX=event.clientX;}
  });
  listen(scope,canvas,'pointerup',event=>{
    const p=gestures.get(event.pointerId);
    if(p&&!p.moved&&p.button===0&&enabled()){const id=onPick(event.clientX,event.clientY);if(id)onAction('select',{targetId:id});}
    gestures.delete(event.pointerId);if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
  });
  for(const type of ['pointercancel','lostpointercapture'])listen(scope,canvas,type,event=>gestures.delete(event.pointerId));
  listen(scope,canvas,'wheel',event=>{if(!enabled()||event.ctrlKey||event.metaKey)return;event.preventDefault();onZoom(event.deltaY);},{passive:false});
  listen(scope,canvas,'contextmenu',event=>event.preventDefault());
  scope.signal.addEventListener('abort', clear, { once: true });
  return {
    clear,
    read() { const values = new Set([...keys, ...pointers.values()]); return { forward: values.has('forward'), back: values.has('back'), left: values.has('left'), right: values.has('right'),attack:values.has('attack'),guard:values.has('guard'),sprint:values.has('sprint'),viewYaw:movementYaw() }; },
  };
}
