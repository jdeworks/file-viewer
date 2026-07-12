// frame-loop.js — shared capped rAF driver for every metagame render loop (CPU-budget fix,
// 2026-07-12: an uncapped 60fps rAF per stage was a real machine-load problem in playtests).
//
// createFrameLoop({ onFrame, fps = 30, pauseWhenHidden = true }) schedules on requestAnimationFrame
// but fires onFrame(ts) at most `fps` times per second — callers keep computing their own dt from
// the timestamps they already use, so game SPEED is unchanged; only draw/tick frequency is capped.
// pauseWhenHidden cancels scheduling while document.hidden (rAF already pauses in background tabs;
// this makes the pause explicit and covers in-page hiding) and resumes on visibilitychange. Callers
// must clamp their dt across a resume (every current caller already does).
//
// rAF-only by design: where requestAnimationFrame is unavailable (node unit tests), start() is a
// no-op — tests drive the underlying step/tick functions directly, never a wall-clock loop.
export function createFrameLoop({ onFrame, fps = 30, pauseWhenHidden = true }) {
  const hasRAF = typeof requestAnimationFrame === 'function';
  const hasDoc = typeof document !== 'undefined';
  const minMs = 1000 / Math.max(1, Number(fps) || 30);
  let handle = null;
  let running = false;
  let lastFire = 0;

  function frame(ts) {
    if (!running) return;
    // -0.5ms slack so a 60Hz rAF cadence lands cleanly on every 2nd frame instead of every 3rd.
    if (ts - lastFire >= minMs - 0.5) {
      lastFire = ts;
      onFrame(ts);
      if (!running) return; // onFrame may stop the loop
    }
    handle = requestAnimationFrame(frame);
  }

  function cancel() {
    if (handle != null) cancelAnimationFrame(handle);
    handle = null;
  }

  function onVisibility() {
    if (!running) return;
    cancel();
    if (!document.hidden) handle = requestAnimationFrame(frame);
  }

  return {
    start() {
      if (running || !hasRAF) return;
      running = true;
      lastFire = 0;
      if (pauseWhenHidden && hasDoc) document.addEventListener('visibilitychange', onVisibility);
      if (!(pauseWhenHidden && hasDoc && document.hidden)) handle = requestAnimationFrame(frame);
    },
    stop() {
      if (!running) return;
      running = false;
      cancel();
      if (pauseWhenHidden && hasDoc) document.removeEventListener('visibilitychange', onVisibility);
    },
    get running() { return running; },
  };
}

// Guard helper for the interval-based stages (stage1 idle tick, stage2 monster clocks): intervals —
// unlike rAF — keep firing in a hidden tab (browsers only throttle them to ~1s). Call at the top of
// the interval callback to skip work while hidden; state catch-up on return is each caller's concern.
export function hiddenTab() {
  return typeof document !== 'undefined' && document.hidden === true;
}
