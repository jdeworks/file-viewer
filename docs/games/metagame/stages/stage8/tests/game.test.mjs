// game.test.mjs — Stage 8: the movement/level table + the mode-dispatching CROSS evaluation.
import assert from "node:assert/strict";
import {
  levelConfig, crossAttempt, crossOutcome, solveMoment, rotSpeedFor,
  missDelta, movementForLevel, modeHint, gapAngleAt, LEVELS, BOSS_LEVEL
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
}

// ── ship steering (2026-07-11): shipAngle defaults to 0 (byte-identical to every assertion above,
// none of which pass it), but a non-zero shipAngle genuinely shifts the hit window — proving `ref`
// is really threaded through crossAttempt, not just accepted and ignored. ────────────────────────────
{
  // simple (level 1): the OLD solveMoment (ref=0) misses once the ship steers away, and there exists
  // a later moment (the gap reaching the NEW ship position) that hits instead.
  const level = 1; const seed = 21;
  const zeroRefMoment = solveMoment(seed, level);
  assert.equal(crossAttempt({ seed, elapsedMs: zeroRefMoment, level, shipAngle: 0 }).hit, true, "ref=0 still hits at the old solve moment");
  assert.equal(crossAttempt({ seed, elapsedMs: zeroRefMoment, level, shipAngle: 90 }).hit, false, "steering away from the old solve moment now misses it");
  const speed = rotSpeedFor(seed, level);
  const shiftedMoment = zeroRefMoment + (90 / speed) * 1000; // the gap needs 90deg/speed more time to reach the new ship angle
  assert.equal(crossAttempt({ seed, elapsedMs: shiftedMoment, level, shipAngle: 90 }).hit, true, "the SAME steered angle hits once the gap actually arrives there");
}
// darkzone (level 15) / the boss (level 16, mode "simple" + darkZone set): the review-fixed design —
// the blackout is a RENDER-only concern (evaluate() doesn't reference cfg.darkZone at all), so a hit
// test at the darkzone's own solveMoment must still pass with a non-zero ref too (evaluate()'s hit
// logic is identical to `simple`'s — only the visual occlusion, exercised by effectiveDarkZone, is
// ref-relative; see canvas-modes.js / modes.js for the actual rendering-side proof).
{
  const level = 15; const seed = 8;
  const t = solveMoment(seed, level); // still ref=0 internally (matches the default ship position)
  assert.equal(crossAttempt({ seed, elapsedMs: t, level, shipAngle: 0 }).hit, true, "darkzone: default (unsteered) ship still hits its solved moment");
}
{
  // dual (level 9): steering the ship shifts BOTH rings' required alignment point together — pressing
  // at the OLD (ref=0) solve moment with the ship steered away now misses (neither ring "sees" ref=0
  // as aligned near it), proving `ref` isn't silently ignored for the two-ring AND-window either.
  const level = 9; const seed = 11;
  const zeroRefMoment = solveMoment(seed, level);
  assert.equal(crossAttempt({ seed, elapsedMs: zeroRefMoment, level, shipAngle: 0 }).hit, true, "dual: ref=0 still hits at the old solve moment");
  assert.equal(crossAttempt({ seed, elapsedMs: zeroRefMoment, level, shipAngle: 90 }).hit, false, "dual: steering away from the old solve moment now misses it");
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
// 2026-07-11 ship steering: hints reworded away from "the top (12 o'clock)" — the crossing point is
// now wherever the player has steered their ship, not a fixed position.
assert.match(modeHint(levelConfig(1)), /steer your ship/, "simple hint");
assert.match(modeHint(levelConfig(7)), /3 crosses in a row/, "rhythm hint names the chain length");
assert.match(modeHint(levelConfig(8)), /4 crosses in a row/, "rhythm chain length is per-level");
assert.match(modeHint(levelConfig(9)), /BOTH gaps/, "dual hint");
assert.match(modeHint(levelConfig(11)), /eye/, "stealth hint names the eye");
assert.match(modeHint(levelConfig(13)), /3 gaps/, "multigap hint names the gap count");
assert.match(modeHint(levelConfig(15)), /blackout/i, "darkzone hint names the blackout");
assert.equal(typeof modeHint(undefined), "string", "modeHint never throws on missing cfg");

// ── gapAngleAt: the single-angle presentation helper for the animated ring wheel (renderer.js) ─────
// simple/oscillating/ghostecho/rhythm/reversing/darkzone all expose angleAt — a real number every time.
assert.equal(typeof gapAngleAt("seed", 1, 500), "number", "simple (level 1) has a single gap angle");
assert.ok(Number.isFinite(gapAngleAt("seed", 1, 500)), "the angle is finite");
// stealth (level 11) exposes gapAngle instead of angleAt — gapAngleAt falls back to it.
assert.equal(typeof gapAngleAt("seed", 11, 500), "number", "stealth (level 11) falls back to gapAngle");
// dual (level 9, two rings that must BOTH align) and multigap (level 13, several gaps on one ring)
// have no single representative angle — gapAngleAt returns null so the caller can hide the wheel
// and fall back to the ASCII rendering, rather than animating something misleading.
assert.equal(gapAngleAt("seed", 9, 500), null, "dual (level 9) has no single gap angle");
assert.equal(gapAngleAt("seed", 13, 500), null, "multigap (level 13) has no single gap angle");
// Determinism: same (seed, level, elapsedMs) ⇒ same angle (matches the "pure f(seed,elapsedMs)" law).
assert.equal(gapAngleAt("seed", 1, 777), gapAngleAt("seed", 1, 777), "gapAngleAt is deterministic");

console.log("stage8 game tests passed");
