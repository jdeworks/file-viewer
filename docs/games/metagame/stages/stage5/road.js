// road.js — Stage 5 Signal Racer: the PURE pseudo-3D road model (OutRun / Jake-Gordon segment road).
// No DOM, no canvas, no timers — just the geometry the canvas layers draw. Node-testable in isolation.
//
// A track is an array of fixed-length SEGMENTS laid down the +z axis. Each segment carries a `curve`
// scalar; curves are faked (as in Gordon's engine) by accumulating a horizontal offset (x += dx;
// dx += curve) at render time rather than by moving the segments in world space, so the road bends
// toward the horizon while the near road stays put — the classic arcade look, no per-pixel texturing.
//
// PROJECTION: perspective divide by camera-space z. cameraDepth = 1/tan(fov/2) sets the focal length;
// a point's on-screen scale is cameraDepth / camera.z, and x/y/width are that scale times the world
// offsets mapped into the viewport. Coords are integer-rounded (crisp flat-colour trapezoids, no
// sub-pixel shimmer). Point objects are PRE-ALLOCATED and reprojected in place each frame (zero GC).

import { makeRng } from './rng.js';

export const SEGMENT_LENGTH = 200;      // world units per road segment
export const ROAD_WIDTH = 2000;         // HALF the road width in world units (road spans -ROAD_WIDTH..+ROAD_WIDTH)
export const CAMERA_HEIGHT = 1000;      // eye height above the road
export const FOV = 100;                 // field of view, degrees
export const CAMERA_DEPTH = 1 / Math.tan((FOV / 2) * Math.PI / 180); // focal length ≈ 0.839
export const DRAW_DISTANCE = 120;       // segments projected/drawn ahead (a small embed horizon)
export const RUMBLE_LENGTH = 3;         // segments per rumble-stripe colour band (free speed illusion)
export const ROAD_SEGMENTS = 480;       // looping track length in segments (480 × 200 = 96000 z)

// The three discrete game lanes as normalised road offsets (road edges at ±1): left, centre, right.
export const LANE_OFFSETS = [-2 / 3, 0, 2 / 3];

// How many road segments one logical game row spans. Tuned so a row of hazards (one game tick apart)
// approaches over ~SEG_PER_ROW segments — spaced enough to read the reaction window the ASCII game
// had at the same tick cadence, dense enough that each tick visibly advances the road a few stripes.
export const SEG_PER_ROW = 3;
export const ROW_SPACING_Z = SEG_PER_ROW * SEGMENT_LENGTH; // 600 world units per game row

function easeInOut(a, b, p) { return a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5); }

function makePoint(z) {
  return {
    world: { x: 0, y: 0, z },
    camera: { x: 0, y: 0, z: 0 },
    screen: { x: 0, y: 0, w: 0, scale: 0 },
  };
}

// Deterministic curve profile for the whole loop: ease-in → hold → ease-out sections seeded from the
// round, padded with an opening + closing straight so the track joins itself cleanly when it wraps.
function buildCurves(seed) {
  const rng = makeRng(`${seed}:road`);
  const CURVES = [2, -2, 3, -3, 4, -4, 5, -5];
  const out = [];
  const addTween = (len, from, to) => { for (let i = 0; i < len; i += 1) out.push(easeInOut(from, to, i / len)); };
  const TAIL = 24; // closing straight, forced below so the loop joins itself cleanly on wrap
  addTween(24, 0, 0); // opening straight
  while (out.length < ROAD_SEGMENTS - TAIL) {
    const c = rng.pick(CURVES);
    const enter = rng.int(16, 40);
    const hold = rng.int(20, 60);
    const leave = rng.int(16, 40);
    addTween(enter, 0, c);
    for (let i = 0; i < hold; i += 1) out.push(c);
    addTween(leave, c, 0);
  }
  const curves = out.slice(0, ROAD_SEGMENTS);
  for (let i = ROAD_SEGMENTS - TAIL; i < ROAD_SEGMENTS; i += 1) curves[i] = 0; // straighten the tail
  return curves;
}

// buildRoad(seed) → { segments, length, findSegment }. Segments and their point objects are built
// ONCE per round; the render loop only reprojects them.
export function buildRoad(seed) {
  const curves = buildCurves(seed);
  const n = curves.length;
  const segments = [];
  for (let i = 0; i < n; i += 1) {
    segments.push({
      index: i,
      curve: curves[i],
      dark: Math.floor(i / RUMBLE_LENGTH) % 2 === 1, // alternating rumble/road shade band
      looped: false,
      p1: makePoint(i * SEGMENT_LENGTH),
      p2: makePoint((i + 1) * SEGMENT_LENGTH),
    });
  }
  const length = n * SEGMENT_LENGTH;
  function findSegment(z) {
    const i = Math.floor(z / SEGMENT_LENGTH);
    return segments[((i % n) + n) % n];
  }
  return { segments, length, findSegment };
}

// Perspective-project a pre-allocated point in place, given the camera world position + viewport size.
export function project(p, cameraX, cameraY, cameraZ, width, height) {
  p.camera.x = (p.world.x || 0) - cameraX;
  p.camera.y = (p.world.y || 0) - cameraY;
  p.camera.z = (p.world.z || 0) - cameraZ;
  p.screen.scale = CAMERA_DEPTH / p.camera.z;
  p.screen.x = Math.round((width / 2) + (p.screen.scale * p.camera.x * width / 2));
  p.screen.y = Math.round((height / 2) - (p.screen.scale * p.camera.y * height / 2));
  p.screen.w = Math.round(p.screen.scale * ROAD_WIDTH * width / 2);
  return p;
}

// Screen x of a normalised lane/road offset at an already-projected point (road edges at ±1).
export function offsetScreenX(point, offset, width) {
  return point.screen.x + point.screen.scale * offset * ROAD_WIDTH * (width / 2);
}

// Exponential distance fog: 1 = clear (near), → 0 at the horizon. Overlay alpha is (1 - fog).
export function fog(distanceRatio, density) {
  return 1 / Math.exp(Math.pow(distanceRatio, 2) * density);
}
