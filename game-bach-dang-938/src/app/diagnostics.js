// Module-scoped ownership counters, also read by local browser tests. No window API.
export const metrics = {
  sessionsCreated: 0, sessionsDisposed: 0, activeLoops: 0, activeLoads: 0,
  sessionListeners: 0, observers: 0, renderers: 0, geometries: 0, materials: 0,
};

export function listen(scope, target, type, callback, options) {
  if (scope.signal.aborted) return;
  target.addEventListener(type, callback, options);
  metrics.sessionListeners++;
  scope.signal.addEventListener('abort', () => {
    target.removeEventListener(type, callback, options);
    metrics.sessionListeners--;
  }, { once: true });
}
