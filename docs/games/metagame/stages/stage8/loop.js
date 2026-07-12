// loop.js — Stage 8 Observer State: animation driver. startLoop(onFrame) calls onFrame(dtMs) once per
// fired frame with the real elapsed delta and returns { stop }. Driven by the shared createFrameLoop
// (rAF capped at 30fps, paused while hidden) — CPU-budget fix 2026-07-12: the old uncapped rAF ran at
// ~60fps per stage; at 30fps CROSS timing quantization worsens from ~16ms to ~33ms, which is within
// every level's tolerance. Motion stays DETERMINISTIC: the renderer accumulates elapsedMs and the gap
// angle is a pure function of (seed, elapsedMs) — the delta only paces the clock. No setTimeout
// fallback: where rAF is unavailable (node), the loop simply never runs — tests drive the game logic
// directly.
import { createFrameLoop } from "../../shared/frame-loop.js";

export function startLoop(onFrame) {
  const now = () => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now());
  let last = now();

  const loop = createFrameLoop({
    onFrame() {
      const t = now();
      let dt = t - last;
      last = t;
      if (!(dt >= 0)) dt = 0;
      if (dt > 100) dt = 100; // clamp tab-away jumps so the clock can't leap a full rotation at once
      try { onFrame(dt); } catch { /* ignore frame errors */ }
    }
  });
  loop.start();
  return { stop: () => loop.stop() };
}
