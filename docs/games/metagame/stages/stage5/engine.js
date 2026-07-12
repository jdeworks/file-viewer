// engine.js — Stage 5 Signal Racer: frame-loop driver that fires logical ticks at a fixed ms
// cadence regardless of frame rate. Pure orchestration — no game logic. getTickMs() is read each
// tick so a future speed-burst can change the interval mid-run. Scheduling goes through the shared
// createFrameLoop (CPU budget fix 2026-07-12): the rAF wrapper is capped at 30fps and pauses when
// the tab is hidden; logical tick cadence is unchanged since getTickMs() intervals are longer than
// a frame. Browser-only (tests drive step() directly via the game-loop) — createFrameLoop's start()
// is already a no-op where rAF is unavailable.
import { createFrameLoop } from '../../shared/frame-loop.js';

export function createEngine({ onTick, getTickMs }) {
  let last = null;
  let acc = 0;
  let tick = 0;

  const loop = createFrameLoop({
    onFrame(ts) {
      if (last === null) last = ts;
      acc += Math.max(0, ts - last);
      last = ts;
      // Backpressure cap: if a backgrounded tab left us > 8 ticks behind, clamp the accumulator instead
      // of silently dropping the excess inside the guarded loop — explicit, and consistent with guard<8.
      // (Also absorbs the large ts gap after a visibilitychange resume.)
      acc = Math.min(acc, 8 * getTickMs());
      let guard = 0;
      while (acc >= getTickMs() && guard < 8) {
        acc -= getTickMs();
        guard += 1;
        onTick(tick);
        tick += 1;
        if (!loop.running) return; // onTick may stop us (round ended)
      }
    },
  });

  return {
    start() {
      if (loop.running) return;
      last = null;
      acc = 0;
      loop.start();
    },
    stop() {
      loop.stop();
    },
    get running() { return loop.running; },
  };
}
