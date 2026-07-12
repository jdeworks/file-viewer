// engine.js — Stage 5 Signal Racer: frame-loop driver that fires logical ticks at a fixed ms
// cadence regardless of frame rate. Pure orchestration — no game logic. getTickMs() is read each
// tick so a future speed-burst can change the interval mid-run. Scheduling goes through the shared
// createFrameLoop (CPU budget fix 2026-07-12): the rAF wrapper is capped at 30fps and pauses when
// the tab is hidden; logical tick cadence is unchanged since getTickMs() intervals are longer than
// a frame. Browser-only (tests drive step() directly via the game-loop) — createFrameLoop's start()
// is already a no-op where rAF is unavailable.
//
// TWO CADENCES (2026-07-12, canvas racer rebuild): LOGIC runs per tick (onTick, fixed getTickMs()
// cadence); DRAWING runs per FRAME (onRender, every capped rAF frame). onRender receives the render
// interpolation factor alpha = leftover-accumulator / tickMs ∈ [0,1) — how far the visible frame is
// between the last consumed tick and the next — so the canvas draws at 30fps with positions
// interpolated between the discrete logical ticks (classic fixed-timestep interpolation). onRender is
// OPTIONAL: callers that don't draw (or run in node) simply omit it, preserving the prior API and the
// rAF-less no-op behaviour (tests still drive game-loop.step() directly).
import { createFrameLoop } from '../../shared/frame-loop.js';

export function createEngine({ onTick, onRender, getTickMs }) {
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
      // Per-frame draw with the sub-tick interpolation factor. Fired AFTER the tick loop so onRender
      // always sees the freshest logical state; skipped if a tick stopped the loop (handled above).
      if (onRender) onRender(Math.max(0, Math.min(1, acc / getTickMs())));
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
