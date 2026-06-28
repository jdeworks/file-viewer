// ring.test.mjs — Stage 9: seed→angle determinism + ASCII ring rendering.
import assert from "node:assert/strict";
import { makeRng } from "../rng.js";
import { ringAngle, renderRing, renderRingHidden, ringChar } from "../ring.js";

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

// ── renderRing: the gap sits at the given angle; rendering is deterministic ────────────────────────
{
  const TOP = [0, 12]; // top row, centre column of the ring grid
  const gapAtTop = renderRing(0, {}).split("\n");
  const gapAtBottom = renderRing(180, {}).split("\n");
  assert.equal(gapAtTop[TOP[0]][TOP[1]], " ", "gap at 0deg leaves the 12-o'clock cell empty");
  assert.notEqual(gapAtBottom[TOP[0]][TOP[1]], " ", "gap at 180deg fills the 12-o'clock cell with ring");
  assert.equal(renderRing(0, {}), renderRing(0, {}), "renderRing is deterministic");
  assert.ok(renderRing(0, {}).replace(/[\s]/g, "").length > 8, "the ring draws solid chars");
}

// ── dark zone + hidden + ghosts ───────────────────────────────────────────────────────────────────
{
  assert.ok(renderRing(0, { darkZone: { start: 80, end: 100 } }).includes("█"), "dark zone renders as █");
  assert.ok(renderRingHidden({}).includes("?"), "hidden ring shows '?'");
  assert.ok(renderRing(0, { ghosts: [{ angle: 180, result: "miss" }] }).includes("·"), "ghost miss renders as ·");
  assert.ok(renderRing(0, { ghosts: [{ angle: 180, result: "hit" }] }).includes("⊕"), "ghost hit renders as ⊕");
}

// ── ringChar dedup parity: the shared helper (now imported by rings.js) reproduces the OLD rings.js
// implementation (which had NO leading mod360) for every angle the renderers actually iterate, so the
// unification changes ZERO rendered output. ──────────────────────────────────────────────────────────
{
  // exact copy of the former rings.js ringChar (no mod360) for the parity reference
  const angDist = (a, b) => Math.abs(((a - b) % 360 + 540) % 360 - 180);
  const inArc = (a, c, w) => angDist(a, c) <= w / 2;
  const oldRingsChar = (a) => {
    if (inArc(a, 0, 60) || inArc(a, 180, 60)) return "─";
    if (inArc(a, 90, 60) || inArc(a, 270, 60)) return "│";
    return "+";
  };
  // every angle the render loops touch: a ∈ [0,360) step 3, and the full integer sweep
  for (let a = 0; a < 360; a += 3) assert.equal(ringChar(a), oldRingsChar(a), `parity at loop angle ${a}`);
  for (let a = 0; a < 360; a += 1) assert.equal(ringChar(a), oldRingsChar(a), `parity at angle ${a}`);
  // the leading mod360 makes the shared helper safe for out-of-range inputs too (still matches)
  for (const a of [-30, -1, 360, 540, 720.5]) assert.equal(ringChar(a), oldRingsChar(a), `parity at ${a}`);
}

console.log("stage9 ring tests passed");
