// s4fit.test.mjs — Stage 4 board font-size scaler: the pure computeFontSize solve (no DOM).
import assert from "node:assert/strict";
import { computeFontSize, MIN_FONT, MAX_FONT } from "../s4fit.js";

const dims = { cols: 40, rows: 40 };
// A rough ui-monospace advance-width-per-px-of-font-size (matches real measured values ~0.6).
const charW = 0.6;
const lineHeight = 0.95;
const letterSpacing = 1;

// A generous host (plenty of room) clamps at MAX_FONT, not an unbounded huge size.
{
  const size = computeFontSize(4000, 4000, dims, charW, lineHeight, letterSpacing);
  assert.equal(size, MAX_FONT, "generous space clamps to the max font size");
}

// A cramped host (the old fixed-12px symptom) still returns at least MIN_FONT, never smaller/negative.
{
  const size = computeFontSize(50, 50, dims, charW, lineHeight, letterSpacing);
  assert.equal(size, MIN_FONT, "a very cramped host floors at the min font size, not smaller");
}

// A moderately sized host (bigger than the old static 12px was, per playtest complaint) lands
// meaningfully above MIN_FONT — proving the "sub-fingertip, sub-glance" 12px isn't the ceiling anymore.
{
  const size = computeFontSize(900, 900, dims, charW, lineHeight, letterSpacing);
  assert.ok(size > 12, `a reasonably sized host (900×900) should scale past the old static 12px, got ${size}`);
}

// Width and height are both respected — the binding constraint (the smaller of the two solves) wins.
{
  const wideOnly = computeFontSize(4000, 100, dims, charW, lineHeight, letterSpacing);
  const tallOnly = computeFontSize(100, 4000, dims, charW, lineHeight, letterSpacing);
  assert.ok(wideOnly < MAX_FONT, "a height-starved host is capped by height, not width");
  assert.ok(tallOnly < MAX_FONT, "a width-starved host is capped by width, not height");
}

console.log("stage4 s4fit tests passed");
