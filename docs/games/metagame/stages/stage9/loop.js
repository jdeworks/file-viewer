// loop.js — Stage 9 Observer State: animation driver. startLoop(onFrame) calls onFrame(dtMs) once per
// frame with the real elapsed delta (via requestAnimationFrame; setTimeout fallback) and returns
// { stop }. A per-frame delta (~16ms) instead of a coarse 100ms tick gives fine CROSS resolution for
// the tight tolerances of the later movements. Motion stays DETERMINISTIC: the renderer accumulates
// elapsedMs and the gap angle is a pure function of (seed, elapsedMs) — the delta only paces the clock.
export function startLoop(onFrame) {
  const now = () => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now());
  const hasRAF = typeof requestAnimationFrame === "function";
  let last = now();
  let stopped = false;
  let handle = null;

  function frame() {
    if (stopped) return;
    const t = now();
    let dt = t - last;
    last = t;
    if (!(dt >= 0)) dt = 0;
    if (dt > 100) dt = 100; // clamp tab-away jumps so the clock can't leap a full rotation at once
    try { onFrame(dt); } catch { /* ignore frame errors */ }
    schedule();
  }

  function schedule() {
    if (stopped) return;
    handle = hasRAF ? requestAnimationFrame(frame) : setTimeout(frame, 16);
  }

  schedule();
  return {
    stop() {
      stopped = true;
      if (handle == null) return;
      if (hasRAF) cancelAnimationFrame(handle); else clearTimeout(handle);
    }
  };
}
