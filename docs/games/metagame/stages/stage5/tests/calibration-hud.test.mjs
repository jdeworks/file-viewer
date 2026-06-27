// calibration-hud.test.mjs — Stage 5: the pure HUD strings (calibration progress + round intro).
import assert from 'node:assert/strict';
import { calibrationProgressStr } from '../calibration.js';
import { roundIntro, roundIntros } from '../content.js';
import { LOOP_DURATION_MS } from '../messages.js';

// ── calibrationProgressStr: state-driven, deterministic ────────────────────────────────────────────
// No progress yet → bare 'uncalibrated'.
assert.equal(
  calibrationProgressStr({ calibration: { loopMs: LOOP_DURATION_MS, continuousMs: 0, calibrated: false } }),
  'uncalibrated',
);

// Mid-listen → shows seconds elapsed toward the loop threshold (floored).
assert.equal(
  calibrationProgressStr({ calibration: { loopMs: 14000, continuousMs: 9400, calibrated: false } }),
  'uncalibrated (9 / 14s)',
);

// A sliver of progress still counts as in-progress (1ms → "0 / 14s").
assert.equal(
  calibrationProgressStr({ calibration: { loopMs: 14000, continuousMs: 1, calibrated: false } }),
  'uncalibrated (0 / 14s)',
);

// continuousMs is clamped to the loop length; never overflows the denominator.
assert.equal(
  calibrationProgressStr({ calibration: { loopMs: 14000, continuousMs: 99999, calibrated: false } }),
  'uncalibrated (14 / 14s)',
);

// Calibrated → LOCKED-IN regardless of the counter.
assert.equal(
  calibrationProgressStr({ calibration: { loopMs: 14000, continuousMs: 5000, calibrated: true } }),
  'LOCKED-IN',
);

// Defensive: missing/garbage state degrades to 'uncalibrated' (default loopMs), never throws.
assert.equal(calibrationProgressStr({}), 'uncalibrated');
assert.equal(calibrationProgressStr(null), 'uncalibrated');

// Deterministic: same input → same output.
const probe = { calibration: { loopMs: 14000, continuousMs: 7000, calibrated: false } };
assert.equal(calibrationProgressStr(probe), calibrationProgressStr(probe));

// ── roundIntro: one line per round, clamped, pure ──────────────────────────────────────────────────
assert.equal(roundIntros.length, 9, 'one intro per round (8 body + boss)');
assert.equal(roundIntro(6), roundIntros[6], 'time-trial intro by index');
assert.equal(roundIntro(0), roundIntros[0]);
assert.equal(roundIntro(99), roundIntros[8], 'out-of-range clamps to the last round');
assert.equal(roundIntro(-5), roundIntros[0], 'negative clamps to the first round');
assert.ok(roundIntros.every((line) => typeof line === 'string' && line.length > 0), 'all intros non-empty');

console.log('stage5 calibration-hud tests passed');
