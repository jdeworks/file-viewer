// rings.js — Stage 9 Observer State: extra ASCII renderers for the richer archetypes (pure, no DOM).
// ring.js draws ONE ring; this draws two concentric rings (dual mode) and a single ring with several
// gaps (multi-gap / phantom-decoy mode). Deterministic for the same inputs.

import { ringChar } from "./ring.js"; // shared glyph picker — kept single-source so the two can't drift

const RING_W = 33; // densified raster (UX audit #3) — must match ring.js
const RING_H = 17;

// Two concentric rings: outer at full radius, inner at ~55% radius, each with its own gap. Used by the
// dual mode where BOTH gaps must face the top at once. opts: { gapWidth, darkZone }.
export function renderConcentric(innerAngleDeg, outerAngleDeg, opts = {}) {
  const { gapWidth = 22, darkZone = null } = opts;
  const grid = blankGrid();
  const cx = (RING_W - 1) / 2;
  const cy = (RING_H - 1) / 2;
  // outer ring — solid █; inner ring — lighter ▓ so the two rotors stay distinguishable (UX audit #3)
  plotRing(grid, cx, cy, cx, cy, outerAngleDeg, gapWidth, "█", darkZone);
  plotRing(grid, cx, cy, cx * 0.55, cy * 0.55, innerAngleDeg, gapWidth + 6, "▓", darkZone);
  return gridToString(grid);
}

// One ring with a gap PLUS a scanning "eye" beam (stealth mode). The beam (▓) sweeps the ring; a CROSS
// only counts when the gap is at the top AND the eye is NOT covering the top lane (the blind window).
// gapAngleDeg/eyeAngleDeg are deterministic angles; opts: { gapWidth, blind } (eye beam width in deg).
export function renderStealth(gapAngleDeg, eyeAngleDeg, opts = {}) {
  const { gapWidth = 20, blind = 60 } = opts;
  const grid = blankGrid();
  const cx = (RING_W - 1) / 2;
  const cy = (RING_H - 1) / 2;
  for (let a = 0; a < 360; a += 3) {
    const { x, y } = project(cx, cy, cx, cy, a);
    if (offGrid(x, y)) continue;
    const inGap = inArc(a, gapAngleDeg, gapWidth);
    let ch = inGap ? " " : ringChar(a);
    if (inArc(a, eyeAngleDeg, blind)) ch = inGap ? "░" : "▒"; // eye beam sweep (lighter than the solid ring; gap-under-beam = ░)
    grid[y][x] = ch;
  }
  const ep = project(cx, cy, cx, cy, eyeAngleDeg);
  if (!offGrid(ep.x, ep.y)) grid[ep.y][ep.x] = "@"; // the eye itself
  return gridToString(grid);
}

// One ring with several gaps (one real, the rest phantom decoys — drawn identically so the player must
// learn which slot is safe). gapAngles is the list of gap centre angles. opts: { gapWidth, darkZone }.
export function renderMultiGap(gapAngles = [], opts = {}) {
  const { gapWidth = 20, darkZone = null } = opts;
  const grid = blankGrid();
  const cx = (RING_W - 1) / 2;
  const cy = (RING_H - 1) / 2;
  for (let a = 0; a < 360; a += 3) {
    const { x, y } = project(cx, cy, cx, cy, a);
    if (offGrid(x, y)) continue;
    let ch = ringChar(a);
    for (const g of gapAngles) if (inArc(a, g, gapWidth)) ch = " ";
    if (darkZone && inZone(a, darkZone)) ch = "█";
    grid[y][x] = ch;
  }
  return gridToString(grid);
}

// ── internals ──────────────────────────────────────────────────────────────────────────────────────

function plotRing(grid, cx, cy, rx, ry, gapAngle, gapWidth, glyph, darkZone) {
  for (let a = 0; a < 360; a += 3) {
    const { x, y } = project(cx, cy, rx, ry, a);
    if (offGrid(x, y)) continue;
    let ch = glyph;
    if (inArc(a, gapAngle, gapWidth)) ch = " ";
    if (darkZone && inZone(a, darkZone)) ch = "█";
    grid[y][x] = ch;
  }
}

function project(cx, cy, rx, ry, a) {
  const rad = (a - 90) * Math.PI / 180; // 0deg = top
  return { x: Math.round(cx + rx * Math.cos(rad)), y: Math.round(cy + ry * Math.sin(rad)) };
}

function blankGrid() { return Array.from({ length: RING_H }, () => Array(RING_W).fill(" ")); }
function gridToString(grid) { return grid.map((row) => row.join("")).join("\n"); }
function offGrid(x, y) { return y < 0 || y >= RING_H || x < 0 || x >= RING_W; }
function mod360(a) { return ((a % 360) + 360) % 360; }
function angularDist(a, b) { return Math.abs(((a - b) % 360 + 540) % 360 - 180); }
function inArc(a, center, width) { return angularDist(a, center) <= width / 2; }
function inZone(a, zone) {
  const x = mod360(a); const s = mod360(zone.start); const e = mod360(zone.end);
  return s <= e ? (x >= s && x <= e) : (x >= s || x <= e);
}
