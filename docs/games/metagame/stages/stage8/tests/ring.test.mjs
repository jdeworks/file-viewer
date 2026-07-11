// ring.test.mjs — Stage 8: seed→angle determinism + ASCII ring rendering.
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
// Raster densified to 33×17 (UX audit #3): centre column is (33-1)/2 = 16, top row is 0.
{
  const TOP = [0, 16]; // top row, centre column of the 33×17 ring grid
  const lines = renderRing(0, {}).split("\n");
  assert.equal(lines.length, 17, "densified raster is 17 rows tall");
  assert.ok(lines.every((l) => l.length === 33), "densified raster is 33 columns wide");
  const gapAtTop = renderRing(0, {}).split("\n");
  const gapAtBottom = renderRing(180, {}).split("\n");
  assert.equal(gapAtTop[TOP[0]][TOP[1]], " ", "gap at 0deg leaves the 12-o'clock cell empty");
  assert.notEqual(gapAtBottom[TOP[0]][TOP[1]], " ", "gap at 180deg fills the 12-o'clock cell with ring");
  assert.equal(renderRing(0, {}), renderRing(0, {}), "renderRing is deterministic");
  assert.ok(renderRing(0, {}).replace(/[\s]/g, "").length > 8, "the ring draws solid chars");
  // Block glyphs (#3): the ring is drawn with solid █ / ▓ and no ragged `─│+` segments remain.
  assert.ok(/[█▓]/.test(renderRing(180, {})), "ring draws with block glyphs");
  assert.ok(!/[─│+]/.test(renderRing(180, {})), "no legacy line glyphs remain");
}

// ── dark zone + hidden + ghosts ───────────────────────────────────────────────────────────────────
{
  assert.ok(renderRing(0, { darkZone: { start: 80, end: 100 } }).includes("█"), "dark zone renders as █");
  assert.ok(renderRingHidden({}).includes("?"), "hidden ring shows '?'");
  assert.ok(renderRing(0, { ghosts: [{ angle: 180, result: "miss" }] }).includes("·"), "ghost miss renders as ·");
  assert.ok(renderRing(0, { ghosts: [{ angle: 180, result: "hit" }] }).includes("⊕"), "ghost hit renders as ⊕");
}

// ── ringChar block-glyph mapping (UX audit #3): the shared helper (imported by rings.js so the two
// renderers can't drift) returns solid █ on the cardinal arcs and a lighter ▓ on the diagonals, and the
// leading mod360 keeps it safe for out-of-range inputs. ────────────────────────────────────────────────
{
  const angDist = (a, b) => Math.abs(((a - b) % 360 + 540) % 360 - 180);
  const inArc = (a, c, w) => angDist(a, c) <= w / 2;
  const ref = (a) => {
    const d = ((a % 360) + 360) % 360;
    return (inArc(d, 0, 60) || inArc(d, 180, 60) || inArc(d, 90, 60) || inArc(d, 270, 60)) ? "█" : "▓";
  };
  for (let a = 0; a < 360; a += 1) assert.equal(ringChar(a), ref(a), `block-glyph mapping at ${a}`);
  for (const a of [-30, -1, 360, 540, 720.5]) assert.equal(ringChar(a), ref(a), `block-glyph mapping at ${a}`);
  assert.equal(ringChar(0), "█", "top is a solid block");
  assert.equal(ringChar(45), "▓", "the diagonal is the lighter block");
}

console.log("stage8 ring tests passed");
