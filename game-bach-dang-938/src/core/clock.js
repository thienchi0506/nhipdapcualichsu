// Wall-clock scheduling is separate from simulation. Excess debt is retained.
export function frameDelta(now, previous) { return previous === null ? 0 : Math.max(0, now - previous); }

export function createFixedClock(hz, maxTicks) {
  const stepMs = 1000 / hz;
  let debtMs = 0;
  return {
    advance(elapsedMs, step) {
      if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new Error('Invalid frame time');
      debtMs += elapsedMs;
      let count = 0;
      while (debtMs + 1e-7 >= stepMs && count < maxTicks) { step(); debtMs -= stepMs; count++; }
      debtMs = Math.max(0, debtMs);
      return { ticks: count, alpha: Math.min(1, debtMs / stepMs), backlogMs: debtMs };
    },
    reset() { debtMs = 0; },
  };
}
