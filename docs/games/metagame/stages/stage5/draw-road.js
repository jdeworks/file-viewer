// draw-road.js — Stage 5 Signal Racer: canvas drawing of the road itself (flat-colour trapezoids) plus
// the procedural parallax background. Impure by nature (it paints a 2D context) but takes the PURE road
// model from road.js and a plain palette, so all geometry stays testable there. No allocation storms:
// the road model's point objects are reprojected in place; only the returned draw-order array is fresh.

import {
  SEGMENT_LENGTH, CAMERA_HEIGHT, CAMERA_DEPTH, DRAW_DISTANCE, project, fog,
} from './road.js';

const LANES = 3;

function polygon(ctx, x1, y1, x2, y2, x3, y3, x4, y4, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.lineTo(x4, y4);
  ctx.closePath();
  ctx.fill();
}

// Procedural parallax sky: a vertical gradient + two ridge silhouettes that slide horizontally against
// the accumulated curve×speed (bgOffset). Pure math (summed sines) — deterministic, no RNG, cheap.
export function drawSky(ctx, width, horizonY, bgOffset, palette) {
  const grad = ctx.createLinearGradient(0, 0, 0, horizonY);
  grad.addColorStop(0, palette.skyTop);
  grad.addColorStop(1, palette.skyBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, horizonY);
  drawRidge(ctx, width, horizonY, bgOffset * 0.12, 0.010, horizonY * 0.32, palette.ridgeFar);
  drawRidge(ctx, width, horizonY, bgOffset * 0.28, 0.016, horizonY * 0.20, palette.ridgeNear);
}

function drawRidge(ctx, width, horizonY, offset, freq, amp, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  for (let sx = 0; sx <= width; sx += 8) {
    const phase = (sx + offset) * freq;
    const y = horizonY - amp * (0.55 + 0.45 * Math.sin(phase) * Math.sin(phase * 0.37 + 1.3));
    ctx.lineTo(sx, y);
  }
  ctx.lineTo(width, horizonY);
  ctx.closePath();
  ctx.fill();
}

// Project every visible segment (in place) and paint the road front-to-back. Returns the projected
// segments in draw order (index 0 = nearest) so the sprite layer can anchor entities to them.
export function renderRoad(ctx, road, position, width, height, palette) {
  const segments = road.segments;
  const n = segments.length;
  const baseSegment = road.findSegment(position);
  const basePercent = (position % SEGMENT_LENGTH) / SEGMENT_LENGTH;
  let dx = -(baseSegment.curve * basePercent);
  let x = 0;
  let maxy = height;
  const projected = new Array(DRAW_DISTANCE);
  for (let i = 0; i < DRAW_DISTANCE; i += 1) {
    const seg = segments[(baseSegment.index + i) % n];
    seg.looped = seg.index < baseSegment.index;
    const camZ = position - (seg.looped ? road.length : 0);
    project(seg.p1, -x, CAMERA_HEIGHT, camZ, width, height);
    project(seg.p2, -x - dx, CAMERA_HEIGHT, camZ, width, height);
    x += dx;
    dx += seg.curve;
    projected[i] = seg;
    // Skip DRAWING (but keep the projection, for sprite anchoring) if the near edge is behind the
    // camera plane or the far edge is already occluded by a nearer segment.
    if (seg.p1.camera.z <= CAMERA_DEPTH || seg.p2.screen.y >= maxy) continue;
    drawSegment(ctx, seg, width, fog(i / DRAW_DISTANCE, palette.fogDensity), palette);
    maxy = seg.p2.screen.y;
  }
  return projected;
}

function rumbleWidth(w) { return w / Math.max(6, 2 * LANES); }
function laneMarkerWidth(w) { return w / Math.max(32, 8 * LANES); }

function drawSegment(ctx, seg, width, fogFactor, palette) {
  const s1 = seg.p1.screen;
  const s2 = seg.p2.screen;
  const dark = seg.dark;
  const grass = dark ? palette.grassDark : palette.grassLight;
  const rumble = dark ? palette.rumbleDark : palette.rumbleLight;
  const road = dark ? palette.roadDark : palette.roadLight;
  const r1 = rumbleWidth(s1.w);
  const r2 = rumbleWidth(s2.w);

  ctx.fillStyle = grass;
  ctx.fillRect(0, s2.y, width, s1.y - s2.y);
  // Rumble shoulders (left + right).
  polygon(ctx, s1.x - s1.w - r1, s1.y, s1.x - s1.w, s1.y, s2.x - s2.w, s2.y, s2.x - s2.w - r2, s2.y, rumble);
  polygon(ctx, s1.x + s1.w + r1, s1.y, s1.x + s1.w, s1.y, s2.x + s2.w, s2.y, s2.x + s2.w + r2, s2.y, rumble);
  // Road surface.
  polygon(ctx, s1.x - s1.w, s1.y, s1.x + s1.w, s1.y, s2.x + s2.w, s2.y, s2.x - s2.w, s2.y, road);
  // Lane dashes on the lighter band only (the alternation reads as motion).
  if (!dark) {
    const l1 = laneMarkerWidth(s1.w);
    const l2 = laneMarkerWidth(s2.w);
    const lw1 = (s1.w * 2) / LANES;
    const lw2 = (s2.w * 2) / LANES;
    let lx1 = s1.x - s1.w + lw1;
    let lx2 = s2.x - s2.w + lw2;
    for (let lane = 1; lane < LANES; lane += 1, lx1 += lw1, lx2 += lw2) {
      polygon(ctx, lx1 - l1 / 2, s1.y, lx1 + l1 / 2, s1.y, lx2 + l2 / 2, s2.y, lx2 - l2 / 2, s2.y, palette.lane);
    }
  }
  // Exponential distance fog toward the horizon.
  if (fogFactor < 1) {
    ctx.globalAlpha = 1 - fogFactor;
    ctx.fillStyle = palette.fog;
    ctx.fillRect(0, s2.y, width, s1.y - s2.y);
    ctx.globalAlpha = 1;
  }
}
