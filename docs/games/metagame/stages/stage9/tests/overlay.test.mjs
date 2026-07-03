// overlay.test.mjs — Stage 9: the pure presentation helpers for the arena overlays (UX audit #2/#4).
import assert from "node:assert/strict";
import { markerReady, markerIntensity, beatPhase } from "../overlay.js";

// #2 — markerReady: true when the gap is within readyDeg of the top, false beyond it.
{
  assert.equal(markerReady(0), true, "dead-centre is ready");
  assert.equal(markerReady(29, 30), true, "just inside the window is ready");
  assert.equal(markerReady(31, 30), false, "just outside the window is not ready");
  assert.equal(markerReady(NaN), false, "non-finite distance is not ready");
}

// #2 — markerIntensity: 1 at the crossing point, ramping to 0 at readyDeg, 0 beyond it (and monotone).
{
  assert.equal(markerIntensity(0, 30), 1, "peak brightness at the top");
  assert.equal(markerIntensity(30, 30), 0, "zero at the edge of the window");
  assert.equal(markerIntensity(45, 30), 0, "zero beyond the window");
  assert.ok(markerIntensity(10, 30) > markerIntensity(20, 30), "brightness rises as the gap approaches");
  assert.equal(markerIntensity(NaN, 30), 0, "non-finite ⇒ 0");
}

// #4 — beatPhase: 0 at each top-pass, climbing to ~1 just before the next; wraps every period.
{
  assert.equal(beatPhase(0, 1000), 0, "phase 0 at the beat");
  assert.ok(Math.abs(beatPhase(500, 1000) - 0.5) < 1e-9, "half a period ⇒ phase 0.5");
  assert.equal(beatPhase(1000, 1000), 0, "one full period wraps back to 0");
  assert.equal(beatPhase(100, 0), 0, "a zero/invalid period never divides by zero");
}

console.log("stage9 overlay tests passed");
