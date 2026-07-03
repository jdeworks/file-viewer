// game.test.mjs — Stage 9: the movement/level table + the mode-dispatching CROSS evaluation.
import assert from "node:assert/strict";
import {
  levelConfig, crossAttempt, crossOutcome, solveMoment, rotSpeedFor, renderLevel,
  missDelta, movementForLevel, modeHint, LEVELS, BOSS_LEVEL
} from "../game.js";

// ── movement structure: 16 levels, boss last, learnable front / onlineUnstable back third ──────────
assert.equal(LEVELS, 16, "sixteen levels");
assert.equal(BOSS_LEVEL, 16, "boss is the last level");
assert.equal(levelConfig(16).isBoss, true, "level 16 is the boss");
assert.equal(levelConfig(1).onlineUnstable || false, false, "level 1 learnable online");
assert.equal(levelConfig(11).onlineUnstable || false, false, "level 11 (Surveillance) learnable online");
assert.equal(levelConfig(12).onlineUnstable, true, "back third (12) is onlineUnstable");
assert.equal(levelConfig(15).onlineUnstable, true, "back third (15) is onlineUnstable");
assert.equal(levelConfig(16).onlineUnstable, true, "boss is onlineUnstable");
assert.equal(movementForLevel(1).name, "Signal");
assert.equal(movementForLevel(16).name, "Observer");

// ── each movement introduces a distinct mode (bands are load-bearing, incl. the round-2 archetypes) ──
assert.equal(levelConfig(1).mode, "simple");
assert.equal(levelConfig(3).mode, "oscillating");
assert.equal(levelConfig(5).mode, "ghostecho");
assert.equal(levelConfig(7).mode, "rhythm");
assert.equal(levelConfig(9).mode, "dual");
assert.equal(levelConfig(11).mode, "stealth");
assert.equal(levelConfig(12).mode, "reversing");
assert.equal(levelConfig(13).mode, "multigap");
assert.equal(levelConfig(15).mode, "darkzone");

// ── tolerance tightens toward the boss ──────────────────────────────────────────────────────────────
assert.ok(levelConfig(16).tolerance < levelConfig(1).tolerance, "the boss is tighter than level 1");
assert.ok(levelConfig(6).tolerance < levelConfig(2).tolerance, "tolerance tightens with depth");

// ── crossAttempt dispatches per mode + is deterministic; each level's solveMoment is a real hit ─────
// (rhythm's solveMoment returns the press-time ARRAY — every beat must be a genuine hit.)
for (let level = 1; level <= BOSS_LEVEL; level += 1) {
  const seed = level * 13 + 1;
  const sol = solveMoment(seed, level);
  const moments = Array.isArray(sol) ? sol : [sol];
  for (const t of moments) {
    assert.equal(crossAttempt({ seed, elapsedMs: t, level }).hit, true, `level ${level}: solveMoment hits`);
  }
  const a = crossAttempt({ seed, elapsedMs: 1234, level });
  const b = crossAttempt({ seed, elapsedMs: 1234, level });
  assert.deepEqual(a, b, `level ${level}: crossAttempt deterministic`);
  assert.ok(renderLevel(seed, level, moments[0]).length > 8, `level ${level}: renders`);
}

// ── a full rotation on a single-ring level has both hit and miss windows ─────────────────────────────
{
  let hits = 0; let misses = 0;
  for (let ms = 0; ms <= 13000; ms += 50) {
    if (crossAttempt({ seed: 0, elapsedMs: ms, level: 1 }).hit) hits += 1; else misses += 1;
  }
  assert.ok(hits > 0 && misses > 0, "level 1 has both a hit window and a miss window");
}

assert.equal(rotSpeedFor(0, 7), rotSpeedFor(0, 7), "rotSpeed deterministic per seed/level");

// ── crossOutcome: drives the arena hit/miss flash (pure classification of a CROSS result) ────────────
assert.equal(crossOutcome(null), "miss", "no result is a miss");
assert.equal(crossOutcome({ hit: false, distance: 40, tolerance: 30 }), "miss", "a non-hit is a miss");
assert.equal(crossOutcome({ hit: true, distance: 2, tolerance: 30 }), "perfect", "inner quarter is perfect");
assert.equal(crossOutcome({ hit: true, distance: 7.5, tolerance: 30 }), "perfect", "exactly tol/4 is perfect");
assert.equal(crossOutcome({ hit: true, distance: 12, tolerance: 30 }), "hit", "outer half is an ordinary hit");
assert.equal(crossOutcome({ hit: true, distance: 0, tolerance: 0 }), "hit", "missing tolerance never crashes");
// Every real solveMoment is a successful press, so it flashes positive ("perfect" or "hit"), never "miss".
for (let level = 1; level <= BOSS_LEVEL; level += 1) {
  const seed = level * 13 + 1;
  const sol = solveMoment(seed, level);
  const t = Array.isArray(sol) ? sol[0] : sol;
  assert.notEqual(crossOutcome(crossAttempt({ seed, elapsedMs: t, level })), "miss", `level ${level}: solve never flashes miss`);
}

// ── missDelta (UX audit #6): the early/late ±ms readout is a pure function of the gap angle + speed ───
// On a top-pass it reads ~0ms; pressing after it reads LATE, before it reads EARLY, and the magnitude
// recovers the press offset (deltaMs ≈ how far off in time the press was).
{
  const level = 1; const seed = 5;
  const speed = rotSpeedFor(seed, level);
  const period = 360000 / speed;
  const base = solveMoment(seed, level) + period; // a genuine top-pass, safely > 0 for the ±300 probes
  assert.ok(missDelta({ seed, elapsedMs: base, level }).deltaMs <= 20, "on the beat ⇒ ~0ms");
  const late = missDelta({ seed, elapsedMs: base + 300, level });
  assert.equal(late.dir, "late", "pressing after the top-pass reads late");
  assert.ok(Math.abs(late.deltaMs - 300) <= 40, `late delta ≈ press offset (${late.deltaMs}ms)`);
  const early = missDelta({ seed, elapsedMs: base - 300, level });
  assert.equal(early.dir, "early", "pressing before the top-pass reads early");
  assert.ok(Math.abs(early.deltaMs - 300) <= 40, `early delta ≈ press offset (${early.deltaMs}ms)`);
}

// ── modeHint: each archetype announces its actual verb (onboarding for the unmarked spikes) ───────────
assert.match(modeHint(levelConfig(1)), /CROSS when it faces the top/, "simple hint");
assert.match(modeHint(levelConfig(7)), /3 crosses in a row/, "rhythm hint names the chain length");
assert.match(modeHint(levelConfig(8)), /4 crosses in a row/, "rhythm chain length is per-level");
assert.match(modeHint(levelConfig(9)), /BOTH gaps/, "dual hint");
assert.match(modeHint(levelConfig(11)), /eye/, "stealth hint names the eye");
assert.match(modeHint(levelConfig(13)), /3 gaps/, "multigap hint names the gap count");
assert.match(modeHint(levelConfig(15)), /blackout/i, "darkzone hint names the blackout");
assert.equal(typeof modeHint(undefined), "string", "modeHint never throws on missing cfg");

console.log("stage9 game tests passed");
