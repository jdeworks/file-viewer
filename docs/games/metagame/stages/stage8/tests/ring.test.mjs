// ring.test.mjs — Stage 8: seed→angle determinism (ring.js) + the pure geometry math the canvas
// renderer depends on (canvas-modes.js's polarPoint/angularSpan). 2026-07-11: the ASCII grid renderer
// this file used to test (renderRing/renderRingHidden/ringChar) was deleted in the canvas rewrite —
// see canvas-ring.js/canvas-modes.js for the replacement, and modes.test.mjs for evaluate()-level
// coverage of the darkzone re-centering fix. CanvasRenderingContext2D calls themselves aren't
// testable outside a browser, so this file only covers the PURE math canvas-modes.js keeps separable
// from the actual ctx.arc()/ctx.fill() calls.
import assert from "node:assert/strict";
import { makeRng } from "../rng.js";
import { ringAngle } from "../ring.js";
import { polarPoint, angularSpan } from "../canvas-modes.js";

// ── rng determinism ────────────────────────────────────────────────────────────────────────────
assert.equal(makeRng(0).float(), makeRng(0).float(), "same seed ⇒ same first float");

// ── ringAngle: deterministic, in range, rotates with elapsed ──────────────────────────────────────
{
  assert.equal(ringAngle(0, 0, 30), ringAngle(0, 0, 30), "deterministic for the same inputs");
  const a0 = ringAngle(0, 0, 30);
  assert.ok(a0 >= 0 && a0 < 360, "angle in [0,360)");
  const a1 = ringAngle(0, 1000, 30);
  assert.ok(Math.abs(((a1 - a0 + 360) % 360) - 30) < 1e-6, "rotates 30deg in 1s");
  // online reseeding moves the base angle (different seeds → (almost always) different angle)
  assert.notEqual(ringAngle(1, 0, 30), ringAngle(2, 0, 30), "different seed ⇒ different base angle");
}

// ── polarPoint: 0deg = 12 o'clock (straight up from center), matching every mode's angle math ─────
{
  const geom = { cx: 100, cy: 100, r: 50 };
  const top = polarPoint(geom, 0);
  assert.ok(Math.abs(top.x - 100) < 1e-6, "0deg sits on the vertical centerline");
  assert.ok(top.y < geom.cy, "0deg is ABOVE center (12 o'clock, canvas y grows downward)");
  assert.ok(Math.abs(top.y - (geom.cy - geom.r)) < 1e-6, "0deg is exactly `r` above center");

  const bottom = polarPoint(geom, 180);
  assert.ok(Math.abs(bottom.y - (geom.cy + geom.r)) < 1e-6, "180deg is exactly `r` below center");

  const right = polarPoint(geom, 90);
  assert.ok(Math.abs(right.x - (geom.cx + geom.r)) < 1e-6, "90deg is directly right of center (clockwise from top)");

  // an explicit radius overrides geom.r (used for the ship marker sitting slightly inside the ring, etc.)
  const inner = polarPoint(geom, 0, 20);
  assert.ok(Math.abs(inner.y - (geom.cy - 20)) < 1e-6, "an explicit radius argument overrides geom.r");
}

// ── angularSpan: darkZone {start,end} → {center,width}, including the wrap-through-0 case ─────────
{
  // A zone that does NOT wrap through 0 (e.g. 80..100): center 90, width 20.
  const plain = angularSpan({ start: 80, end: 100 });
  assert.equal(plain.center, 90, "non-wrapping zone: center is the midpoint");
  assert.equal(plain.width, 20, "non-wrapping zone: width is end-start");

  // A zone that wraps through 0 (e.g. 320..40, as used by Stage 8's own darkzone levels): the true
  // center is 0 (the top), and the width is the SHORT way around (80deg), not naively end-start.
  const wrapped = angularSpan({ start: 320, end: 40 });
  assert.equal(wrapped.center, 0, "wrapping zone (320..40): center is 0 (the top), not a naive midpoint");
  assert.equal(wrapped.width, 80, "wrapping zone (320..40): width is the short way around (80deg)");

  // The boss's own zone (300..60): center 0, width 120 — matches modes.js's effectiveDarkZone() math
  // (half-span 60 on each side), proving the two independent computations agree.
  const boss = angularSpan({ start: 300, end: 60 });
  assert.equal(boss.center, 0, "boss zone (300..60): center is 0");
  assert.equal(boss.width, 120, "boss zone (300..60): width is 120 (±60 half-span)");
}

console.log("stage8 ring tests passed");
