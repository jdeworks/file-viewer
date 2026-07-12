// road.test.mjs — Stage 5: the pure pseudo-3D road model (projection + segment/curve build). No DOM.
import assert from 'node:assert/strict';
import {
  buildRoad, project, offsetScreenX, fog,
  SEGMENT_LENGTH, ROAD_SEGMENTS, DRAW_DISTANCE, CAMERA_DEPTH, ROW_SPACING_Z, SEG_PER_ROW, LANE_OFFSETS,
} from '../road.js';

// ── build: shape + determinism ──────────────────────────────────────────────────────────────────
{
  const a = buildRoad('seedA');
  const b = buildRoad('seedA');
  assert.equal(a.segments.length, ROAD_SEGMENTS, 'segment count = ROAD_SEGMENTS');
  assert.equal(a.length, ROAD_SEGMENTS * SEGMENT_LENGTH, 'track length = segments × segmentLength');
  assert.deepEqual(a.segments.map((s) => s.curve), b.segments.map((s) => s.curve), 'same seed → same curves');
  const c = buildRoad('seedB');
  assert.notDeepEqual(a.segments.map((s) => s.curve), c.segments.map((s) => s.curve), 'different seed → different curves');
  // opening + closing straights so the loop joins cleanly
  assert.equal(a.segments[0].curve, 0, 'track opens straight');
  assert.equal(a.segments[ROAD_SEGMENTS - 1].curve, 0, 'track closes straight (clean wrap)');
  // rumble bands alternate every RUMBLE_LENGTH segments
  assert.equal(a.segments[0].dark, false);
  assert.equal(a.segments[3].dark, true, 'rumble shade flips after RUMBLE_LENGTH');
}

// ── findSegment wraps and indexes by z ────────────────────────────────────────────────────────────
{
  const road = buildRoad('idx');
  assert.equal(road.findSegment(0).index, 0);
  assert.equal(road.findSegment(SEGMENT_LENGTH * 5 + 10).index, 5, 'z maps to its segment');
  assert.equal(road.findSegment(road.length + SEGMENT_LENGTH * 2 + 5).index, 2, 'z wraps around the loop');
  assert.equal(road.findSegment(-SEGMENT_LENGTH + 5).index, ROAD_SEGMENTS - 1, 'negative z wraps');
}

// ── projection: nearer points are bigger + lower on screen; width scales with distance ─────────────
{
  const road = buildRoad('proj');
  const width = 1000;
  const height = 600;
  const near = road.segments[2].p1;  // world z = 400
  const far = road.segments[80].p1;  // world z = 16000
  project(near, 0, 1000, 0, width, height);
  project(far, 0, 1000, 0, width, height);
  assert.ok(near.screen.scale > far.screen.scale, 'nearer point projects larger');
  assert.ok(near.screen.w > far.screen.w, 'nearer road is wider on screen');
  assert.ok(near.screen.y > far.screen.y, 'nearer point sits lower (higher y) on screen');
  // centred camera on a straight point → road centred horizontally
  assert.equal(near.screen.x, width / 2, 'a centred straight point projects to screen centre');
  // integer-rounded screen coords
  assert.ok(Number.isInteger(near.screen.x) && Number.isInteger(near.screen.y) && Number.isInteger(near.screen.w));
  // scale = cameraDepth / camera.z
  assert.ok(Math.abs(near.screen.scale - CAMERA_DEPTH / 400) < 1e-9, 'scale = cameraDepth / camera.z');
}

// ── lane offset → screen x fans out with the projected width ───────────────────────────────────────
{
  const road = buildRoad('lane');
  const p = road.segments[4].p1;
  project(p, 0, 1000, 0, 800, 600);
  const left = offsetScreenX(p, LANE_OFFSETS[0], 800);
  const mid = offsetScreenX(p, LANE_OFFSETS[1], 800);
  const right = offsetScreenX(p, LANE_OFFSETS[2], 800);
  assert.ok(left < mid && mid < right, 'lanes order left < centre < right');
  assert.equal(mid, p.screen.x, 'centre lane sits on the road centre');
  assert.ok(Math.abs((mid - left) - (right - mid)) < 1e-6, 'left/right lanes are symmetric about centre');
}

// ── fog: clear near, → 0 at the horizon, monotonic ────────────────────────────────────────────────
{
  assert.equal(fog(0, 5), 1, 'no fog at distance 0');
  assert.ok(fog(1, 5) < 0.05, 'heavy fog at the horizon');
  assert.ok(fog(0.3, 5) > fog(0.7, 5), 'fog thickens with distance');
}

// ── row/segment constants are consistent ──────────────────────────────────────────────────────────
{
  assert.equal(ROW_SPACING_Z, SEG_PER_ROW * SEGMENT_LENGTH, 'a game row spans SEG_PER_ROW segments');
  assert.ok(DRAW_DISTANCE > SEG_PER_ROW * 8, 'draw distance covers a full look-ahead window of rows');
}

console.log('stage5 road tests passed');
