// Body length + difficulty schedule (round 4): BODY_SOLVES = 20 spreads the four mechanical tiers so
// each gets a fair introduction-and-practice window, the corruption thresholds still line up with the
// mechanic gates and the boss gate, and EVERY generated body puzzle remains uniquely solvable.
import assert from "node:assert/strict";
import { BODY_SOLVES, corruptionForRun, sizeForRun, puzzleForRun } from "../board.js";
import { solve } from "../nonogram.js";
import { colorSolve } from "../s3twocolor.js";
import { VOLATILE_AT } from "../s3volatile.js";
import { ALIASED_AT, aliasedTotal, solveWithHidden } from "../s3aliased.js";
import { DECAY_AT } from "../s3decay.js";
import { TWOCOLOR_AT } from "../s3twocolor.js";

// The extended body.
assert.equal(BODY_SOLVES, 20, "BODY_SOLVES extended to 20");

// Corruption schedule (floor(solvedCount·8/20)) lines up with EACH mechanic gate and the boss gate.
const corr = (s) => corruptionForRun({ solvedCount: s });
assert.equal(corr(4), VOLATILE_AT - 1, "solves 0-4 are pre-volatile tutorial");
assert.equal(corr(5), VOLATILE_AT, "volatile cells engage at solve 5");
assert.equal(corr(7), VOLATILE_AT, "volatile stays solo through solve 7 (before aliased)");
assert.equal(corr(8), ALIASED_AT, "aliased clues stack at solve 8");
assert.equal(corr(10), DECAY_AT, "decay clock engages at solve 10");
assert.equal(corr(15), TWOCOLOR_AT, "two-colour snapshots take over at solve 15");
assert.equal(corr(19), 7, "corruption is still below 8 one solve before the gate");
assert.equal(corr(BODY_SOLVES), 8, "corruption peaks at 8 exactly at the boss gate (solve 20)");

// Per-mechanic learning windows: how many body snapshots are played at each corruption level.
const counts = {};
for (let s = 0; s < BODY_SOLVES; s += 1) { const c = corr(s); counts[c] = (counts[c] || 0) + 1; }
const tutorial = Object.entries(counts).filter(([c]) => Number(c) < VOLATILE_AT).reduce((n, [, v]) => n + v, 0);
const volatileSolo = Object.entries(counts).filter(([c]) => Number(c) >= VOLATILE_AT && Number(c) < ALIASED_AT).reduce((n, [, v]) => n + v, 0);
const twoColour = Object.entries(counts).filter(([c]) => Number(c) >= TWOCOLOR_AT).reduce((n, [, v]) => n + v, 0);
assert.equal(tutorial, 5, "5 pure-tutorial snapshots before any mechanic");
assert.equal(volatileSolo, 3, "volatile gets 3 snapshots alone before aliased stacks");
assert.equal(twoColour, 5, "two-colour gets a 5-snapshot window before the boss");

// Size still ramps 5 → 12 across the longer body and clamps.
assert.equal(sizeForRun({ solvedCount: 0 }), 5, "size starts at 5");
assert.equal(sizeForRun({ solvedCount: BODY_SOLVES }), 12, "size reaches 12 by the gate");
assert(sizeForRun({ solvedCount: 100 }) === 12, "size clamps at 12");

// EVERY body snapshot is deterministic AND uniquely solvable (the Leiden line-solve-to-completion
// guarantee), across both mono/aliased and two-colour tiers.
for (let index = 0; index < BODY_SOLVES; index += 1) {
  const run = { seed: "s3-run0", index, solvedCount: index };
  const p = puzzleForRun(run, {});
  const p2 = puzzleForRun(run, {});
  assert.equal(JSON.stringify(p.solution), JSON.stringify(p2.solution), `snapshot ${index} is deterministic`);
  if (p.twoColor) {
    const res = colorSolve(p.rowClues, p.colClues);
    assert(res && res.solved, `two-colour snapshot ${index} is uniquely line-solvable`);
  } else {
    const res = solve(p.rowClues, p.colClues);
    assert(res && res.solved, `mono snapshot ${index} is uniquely line-solvable`);
    // Aliased lines (when present) must STILL be fully deducible with their clue suppressed.
    if (aliasedTotal(p) > 0) {
      const ok = solveWithHidden(p.rowClues, p.colClues, new Set(p.aliased.rows), new Set(p.aliased.cols));
      assert(ok, `aliased snapshot ${index} stays deducible with its “?” lines hidden`);
    }
  }
}

console.log("stage3 body schedule + uniqueness tests passed");
