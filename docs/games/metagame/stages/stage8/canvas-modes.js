// canvas-modes.js — Stage 8 Observer State: per-archetype gap geometry drawing (pure canvas 2D calls,
// no DOM/timers beyond the passed-in ctx). Split out of canvas-ring.js to stay under the repo's LOC
// caps. Each function draws ONLY the ring + gap(s)/eye/decoys for one archetype family; the ring
// OUTLINE convention (colors, line width) is shared via the constants below so every mode reads as
// the same rotor. Ship marker, path trail, and the launch animation are drawn by canvas-ring.js on
// top of whatever these functions draw — they never touch those layers.
//
// Angle convention throughout this stage: 0deg = 12 o'clock, increasing clockwise (matches every
// mode's motion math in modes.js). toRad() below converts that into canvas's native angle system
// (0 = 3 o'clock, increasing clockwise) — see canvas-ring.js's polar() for the point-form equivalent.

const RING_COLOR = "#5dcaa5";
const RING_COLOR_DIM = "#2a2a2a";
const GAP_BG = "#000";
const DARKZONE_COLOR = "#f5a623";
const GHOST_HIT = "#8ef7d1";
const GHOST_MISS = "#666";
const EYE_COLOR = "rgba(93, 202, 165, 0.28)";
const EYE_DOT = "#dfffef";

function toRad(deg) { return (deg - 90) * Math.PI / 180; }
function mod360(a) { return ((a % 360) + 360) % 360; }

// Stroke a full ring (no gap) — the base rotor line every mode draws first.
function strokeFullRing(ctx, { cx, cy, r }, color, lineWidth) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}

// Cut a gap wedge out of a ring at `centerDeg` ± `widthDeg/2`, by painting the background color over
// that span — simpler and just as correct as arc-splicing the stroke, and composes cleanly with the
// darkzone overlay (painted on top, see paintZone below) since both are just "paint a wedge".
function paintWedge(ctx, { cx, cy, r }, centerDeg, widthDeg, lineWidth, color) {
  const half = Math.max(1, widthDeg) / 2;
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth + 2; // slightly wider than the ring stroke so it fully erases/overlays it
  ctx.arc(cx, cy, r, toRad(centerDeg - half), toRad(centerDeg + half));
  ctx.stroke();
}

function ringLineWidth(r) { return Math.max(4, r * 0.13); }

// ── single gap: simple / oscillating / reversing / ghostecho / rhythm / darkzone ───────────────────
// opts: { angle, tolerance, darkZone: {start,end}|null, ghosts: [{angle,result}] }
export function drawSingleGap(ctx, geom, opts) {
  const { angle, tolerance, darkZone, ghosts = [] } = opts;
  const lw = ringLineWidth(geom.r);
  strokeFullRing(ctx, geom, RING_COLOR, lw);
  paintWedge(ctx, geom, angle, tolerance, lw, GAP_BG);
  if (darkZone) {
    const span = angularSpan(darkZone);
    paintWedge(ctx, geom, span.center, span.width, lw, DARKZONE_COLOR);
  }
  for (const g of ghosts) {
    const p = polarPoint(geom, g.angle, geom.r);
    ctx.beginPath();
    ctx.fillStyle = (g.result === "hit" || g.hit) ? GHOST_HIT : GHOST_MISS;
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── dual: two concentric rings, each with its own gap; BOTH must align to win ───────────────────────
// opts: { inner, outer, tolerance }
export function drawDualGap(ctx, geom, opts) {
  const { inner, outer, tolerance } = opts;
  const outerGeom = geom;
  const innerGeom = { cx: geom.cx, cy: geom.cy, r: geom.r * 0.55 };
  const lwOuter = ringLineWidth(outerGeom.r);
  const lwInner = ringLineWidth(innerGeom.r);
  strokeFullRing(ctx, outerGeom, RING_COLOR, lwOuter);
  paintWedge(ctx, outerGeom, outer, tolerance, lwOuter, GAP_BG);
  strokeFullRing(ctx, innerGeom, RING_COLOR_DIM, lwInner);
  ctx.globalAlpha = 0.8;
  strokeFullRing(ctx, innerGeom, RING_COLOR, lwInner * 0.7);
  ctx.globalAlpha = 1;
  paintWedge(ctx, innerGeom, inner, tolerance + 6, lwInner, GAP_BG);
}

// ── multigap: one ring, several look-identical gaps (only one is real — the CALLER doesn't get told
// which; the caller only ever passes the full list, matching the ASCII original's "decoys drawn
// identically" design). opts: { gaps: number[], tolerance }
export function drawMultiGap(ctx, geom, opts) {
  const { gaps, tolerance } = opts;
  const lw = ringLineWidth(geom.r);
  strokeFullRing(ctx, geom, RING_COLOR, lw);
  for (const g of gaps) paintWedge(ctx, geom, g, tolerance, lw, GAP_BG);
}

// ── stealth: one ring + gap, plus a sweeping "eye" beam whose blind window must NOT cover the ship's
// crossing point at press time. opts: { gap, eye, tolerance, blind }
export function drawStealthGap(ctx, geom, opts) {
  const { gap, eye, tolerance, blind } = opts;
  const lw = ringLineWidth(geom.r);
  strokeFullRing(ctx, geom, RING_COLOR, lw);
  paintWedge(ctx, geom, gap, tolerance, lw, GAP_BG);
  // Eye sweep band: a translucent wide arc showing where the eye is currently watching.
  ctx.beginPath();
  ctx.strokeStyle = EYE_COLOR;
  ctx.lineWidth = lw + 6;
  const half = blind / 2;
  ctx.arc(geom.cx, geom.cy, geom.r, toRad(eye - half), toRad(eye + half));
  ctx.stroke();
  // The eye itself, as a bright dot at its exact position.
  const p = polarPoint(geom, eye, geom.r);
  ctx.beginPath();
  ctx.fillStyle = EYE_DOT;
  ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
  ctx.fill();
}

// darkZone {start,end} → {center, width} handling the wrap-through-0 case (e.g. start=340, end=20).
// Exported (not just internal to drawSingleGap) so its wrap-around math stays unit-testable without
// a browser/canvas — see tests/ring.test.mjs.
export function angularSpan(zone) {
  const s = mod360(zone.start);
  const e = mod360(zone.end);
  const width = mod360(e - s);
  const center = mod360(s + width / 2);
  return { center, width: Math.max(width, 1) };
}

export function polarPoint({ cx, cy, r }, deg, radius = r) {
  const rad = toRad(deg);
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}
