// engine.js — Stage 5 Signal Racer: requestAnimationFrame driver that fires logical ticks at a fixed
// ms cadence regardless of frame rate. Pure orchestration — no game logic. getTickMs() is read each
// tick so a future speed-burst can change the interval mid-run. Browser-only (tests drive step()
// directly via the game-loop), so it degrades to a no-op where rAF is unavailable.
export function createEngine({ onTick, getTickMs }) {
  const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : null;
  const caf = typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : () => {};
  let handle = null;
  let last = null;
  let acc = 0;
  let tick = 0;
  let running = false;

  function frame(ts) {
    if (!running) return;
    if (last === null) last = ts;
    acc += Math.max(0, ts - last);
    last = ts;
    let guard = 0;
    while (acc >= getTickMs() && guard < 8) {
      acc -= getTickMs();
      guard += 1;
      onTick(tick);
      tick += 1;
      if (!running) return; // onTick may stop us (round ended)
    }
    if (running && raf) handle = raf(frame);
  }

  return {
    start() {
      if (running || !raf) return;
      running = true;
      last = null;
      acc = 0;
      handle = raf(frame);
    },
    stop() {
      running = false;
      if (handle) caf(handle);
      handle = null;
    },
    get running() { return running; },
  };
}
