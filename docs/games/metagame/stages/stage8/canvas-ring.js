// canvas-ring.js — Stage 8 Observer State: the canvas renderer core (dpr/resize setup, the draw()
// dispatcher, ring outline, ship marker, path trail, and the CROSS launch animation). Replaces the
// old dual ASCII-<pre>+CSS-conic-gradient rendering pipeline (2026-07-11) — the <pre> was rebuilt
// from scratch every rAF frame even though it was only a dimmed 0.22-opacity fallback layer under
// the real visual, the CSS wheel; this single canvas draw is the actual per-frame cost fix, and gives
// a natural surface for the new steerable ship + its trail. See modes.js's header comment for the
// ship-steering design and canvas-modes.js for the per-archetype gap geometry this dispatches to.
//
// Coordinate convention: 0deg = 12 o'clock, positive = clockwise (matches every mode's angle math).
// All draw calls happen in CSS-pixel space (prepCanvas below sets a dpr transform once per frame so
// callers never think about device pixels).

import { getMode, effectiveDarkZone } from "./modes.js";
import { drawSingleGap, drawDualGap, drawMultiGap, drawStealthGap, polarPoint } from "./canvas-modes.js";

const UNKNOWN_RING_COLOR = "#444";
// The ring is drawn INSIDE the ship's orbit (design fix 2026-07-12: ship and ring at the same radius
// made the ship read as part of the ring). The ship keeps the outermost orbit; the rotor shrinks.
const RING_RADIUS_FACTOR = 0.8;
const SHIP_COLOR = "#8ef7d1";
const SHIP_GLOW = "rgba(142, 247, 209, 0.9)";
const TRAIL_COLOR = "142, 247, 209"; // rgb triple, alpha applied per-sample by age
const TRAIL_MS = 4000; // how far back the fading path trail reaches
const LAUNCH_MS = 380; // launch-animation duration on CROSS

// dpr-aware canvas setup (same pattern as docs/types/media/spectrum-draw.js's prepCanvas) — returns
// null if the canvas has no layout box yet (e.g. mid-mount), so callers can just skip that frame.
function prepCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (w === 0 || h === 0) return null;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

// Main entry point — draws one full frame. `frame`:
//   { cfg, seed, ms, shipAngle, shipPath, launchAnim, ghosts, shipIntensity }
// cfg/seed/ms select the mode + its current geometry; shipAngle/shipPath/launchAnim are the new
// player-steering state (renderer.js owns them); ghosts is ghostecho's attempt history (unchanged
// from before); shipIntensity (0..1) is the existing "ready to cross" brighten (overlay.js).
export function drawArena(canvas, frame) {
  const prepped = prepCanvas(canvas);
  if (!prepped) return;
  const { ctx, w, h } = prepped;
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const r = Math.max(8, Math.min(w, h) / 2 - 10);
  // Two radii: the SHIP orbits at r (outermost); the ring/gap geometry draws on a smaller rotor so
  // the two never overlap. Ship, trail and launch burst share the ship's orbit.
  const geom = { cx, cy, r };
  const ringGeom = { cx, cy, r: r * RING_RADIUS_FACTOR };

  const { cfg, seed, ms, shipAngle = 0, shipPath = [], launchAnim = null, ghosts = [], shipIntensity = 0 } = frame;
  if (cfg.display === "hidden") {
    drawUnknownRing(ctx, ringGeom);
  } else {
    drawGapGeometry(ctx, ringGeom, cfg, seed, ms, shipAngle, ghosts);
  }
  drawTrail(ctx, geom, shipPath, ms);
  drawShip(ctx, geom, shipAngle, shipIntensity);
  if (launchAnim) drawLaunchAnim(ctx, geom, launchAnim, ms);
}

// Dispatch to the right per-archetype drawer (canvas-modes.js) based on which geometry accessor(s)
// the level's mode actually exposes — mirrors game.js's gapAngleAt() dispatch logic, but pulls full
// per-mode geometry (every gap's angle) since a real draw needs more than one representative angle.
function drawGapGeometry(ctx, geom, cfg, seed, ms, shipAngle, ghosts) {
  const mode = getMode(cfg.mode);
  if (cfg.mode === "dual") {
    const { inner, outer } = mode.anglesAt(cfg, seed, ms);
    drawDualGap(ctx, geom, { inner, outer, tolerance: cfg.tolerance });
    return;
  }
  if (cfg.mode === "multigap") {
    drawMultiGap(ctx, geom, { gaps: mode.gapsAt(cfg, seed, ms), tolerance: cfg.tolerance });
    return;
  }
  if (cfg.mode === "stealth") {
    const gap = mode.gapAngle(cfg, seed, ms);
    const eye = mode.eyeAngle(cfg, seed, ms);
    drawStealthGap(ctx, geom, { gap, eye, tolerance: cfg.tolerance, blind: cfg.blind || 60 });
    return;
  }
  // simple / oscillating / reversing / ghostecho / rhythm / darkzone all expose angleAt(); darkzone's
  // (and the boss's, mode "simple" with cfg.darkZone set) occlusion is a rendering-only overlay
  // computed by the shared effectiveDarkZone() — see modes.js for why it re-centers on shipAngle.
  const angle = mode.angleAt(cfg, seed, ms);
  const darkZone = effectiveDarkZone(cfg, shipAngle);
  drawSingleGap(ctx, geom, { angle, tolerance: cfg.tolerance, darkZone, ghosts });
}

// The "gap can't be seen at all" state (cfg.display === "hidden") — a solid dim ring, no gap drawn.
function drawUnknownRing(ctx, { cx, cy, r }) {
  ctx.beginPath();
  ctx.strokeStyle = UNKNOWN_RING_COLOR;
  ctx.lineWidth = Math.max(4, r * 0.13);
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}

// The player-steered ship: a small triangle marker at (shipAngle, r) on its own orbit OUTSIDE the
// ring, pointing inward at the rotor it crosses. Glows toward SHIP_GLOW as `intensity` (0..1, the
// existing overlay.js markerIntensity ramp) approaches 1.
function drawShip(ctx, geom, shipAngle, intensity) {
  const p = polarPoint(geom, shipAngle, geom.r);
  const rad = (shipAngle - 90) * Math.PI / 180;
  const size = 9;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(rad - Math.PI / 2); // point the triangle inward, toward the ring it dives through
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.7, size * 0.7);
  ctx.lineTo(-size * 0.7, size * 0.7);
  ctx.closePath();
  const glow = Math.max(0, Math.min(1, Number(intensity) || 0));
  ctx.fillStyle = glow > 0.05 ? SHIP_GLOW : SHIP_COLOR;
  if (glow > 0.05) {
    ctx.shadowColor = SHIP_GLOW;
    ctx.shadowBlur = 6 + glow * 10;
  }
  ctx.fill();
  ctx.restore();
}

// Fading path trail: one dot per recent {angle, ms} sample, opacity falling off linearly with age.
// Bounded by TRAIL_MS — renderer.js also caps the array length, this is a second (cheap) belt-and-
// suspenders guard against ever drawing stale/huge histories after a level/OBSERVE reset race.
function drawTrail(ctx, geom, shipPath, nowMs) {
  for (const sample of shipPath) {
    const age = nowMs - sample.ms;
    if (age < 0 || age > TRAIL_MS) continue;
    const alpha = 0.5 * (1 - age / TRAIL_MS);
    if (alpha <= 0.01) continue;
    const p = polarPoint(geom, sample.angle, geom.r);
    ctx.beginPath();
    ctx.fillStyle = `rgba(${TRAIL_COLOR}, ${alpha.toFixed(3)})`;
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Short traveling burst on CROSS: an outward-expanding ring (hit) or a fizzling spark (miss) from the
// ship's position at press time. Purely presentational — renderer.js clears launchAnim once expired.
function drawLaunchAnim(ctx, geom, launchAnim, nowMs) {
  const t = nowMs - launchAnim.startMs;
  if (t < 0 || t > LAUNCH_MS) return;
  const progress = t / LAUNCH_MS;
  const p = polarPoint(geom, launchAnim.fromAngle, geom.r);
  const color = launchAnim.hit ? "142, 247, 209" : "192, 57, 43";
  ctx.beginPath();
  ctx.strokeStyle = `rgba(${color}, ${(1 - progress).toFixed(3)})`;
  ctx.lineWidth = 2.5;
  ctx.arc(p.x, p.y, 4 + progress * 22, 0, Math.PI * 2);
  ctx.stroke();
}

// Does launchAnim need clearing this frame? (renderer.js calls this so it never has to duplicate the
// duration constant.)
export function launchAnimExpired(launchAnim, nowMs) {
  return !launchAnim || (nowMs - launchAnim.startMs) > LAUNCH_MS;
}
