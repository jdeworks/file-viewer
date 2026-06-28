// ring.js — Stage 9 Observer State: the seed→angle pipeline + ASCII ring renderer (pure, no DOM/timers).
// The arena is a rotating ring with a gap; the player must CROSS when the gap faces 12 o'clock. Online
// each OBSERVE reseeds the base angle (unpredictable); offline (seed 0) the angle is fixed/learnable.

import { makeRng } from "./rng.js";

const RING_W = 25;
const RING_H = 13;
const DEFAULT_GAP_DEG = 20;

// Current gap angle [0,360): a fixed per-seed base angle plus rotation over elapsed time. Deterministic.
export function ringAngle(seed, elapsedMs, rotSpeedDegPerSec = 30) {
  const base = makeRng(seed).float() * 360;
  return mod360(base + rotSpeedDegPerSec * (Number(elapsedMs) || 0) / 1000);
}

// ASCII ring with the gap at gapAngleDeg (0 = 12 o'clock). opts: { gapWidth, darkZone:{start,end},
// ghosts:[{angle,result}], hidden }. Returns a RING_H-line string. Deterministic for the same inputs.
export function renderRing(gapAngleDeg, opts = {}) {
  const { gapWidth = DEFAULT_GAP_DEG, darkZone = null, ghosts = [], hidden = false } = opts;
  const grid = Array.from({ length: RING_H }, () => Array(RING_W).fill(" "));
  const cx = (RING_W - 1) / 2;
  const cy = (RING_H - 1) / 2;
  for (let a = 0; a < 360; a += 3) {
    const rad = (a - 90) * Math.PI / 180; // 0deg = top
    const x = Math.round(cx + cx * Math.cos(rad));
    const y = Math.round(cy + cy * Math.sin(rad));
    if (y < 0 || y >= RING_H || x < 0 || x >= RING_W) continue;
    let ch = hidden ? "?" : ringChar(a);
    if (!hidden && inArc(a, gapAngleDeg, gapWidth)) ch = " ";       // the gap
    for (const g of ghosts) if (inArc(a, g.angle, 6)) ch = (g.result === "hit" || g.hit) ? "⊕" : "·";
    if (darkZone && inZone(a, darkZone)) ch = "█";                  // blind zone (Band 6)
    grid[y][x] = ch;
  }
  return grid.map((row) => row.join("")).join("\n");
}

// Hidden ring: every ring position is '?' (the gap can't be seen). Dark zone still shows as '█'.
export function renderRingHidden(opts = {}) {
  return renderRing(0, { ...opts, hidden: true });
}

// ── internals ────────────────────────────────────────────────────────────────────────────────────

// Shared ring glyph picker (also imported by rings.js so the two renderers can't drift). The leading
// mod360 is a defensive normalization; since every caller iterates a ∈ [0,360) and inArc/angularDist
// already normalize via %360, it never changes output — it only makes the helper safe for any input.
export function ringChar(a) {
  const d = mod360(a);
  if (inArc(d, 0, 60) || inArc(d, 180, 60)) return "─"; // top/bottom arcs
  if (inArc(d, 90, 60) || inArc(d, 270, 60)) return "│"; // side arcs
  return "+";
}

function mod360(a) { return ((a % 360) + 360) % 360; }

function angularDist(a, b) {
  return Math.abs(((a - b) % 360 + 540) % 360 - 180);
}

function inArc(a, center, width) {
  return angularDist(a, center) <= width / 2;
}

function inZone(a, zone) {
  const x = mod360(a);
  const s = mod360(zone.start);
  const e = mod360(zone.end);
  return s <= e ? (x >= s && x <= e) : (x >= s || x <= e);
}
