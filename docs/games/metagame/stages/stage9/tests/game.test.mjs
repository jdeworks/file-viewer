// game.test.mjs — Stage 9: the movement/level table + the mode-dispatching CROSS evaluation.
import assert from "node:assert/strict";
import {
  levelConfig, crossAttempt, solveMoment, rotSpeedFor, renderLevel,
  movementForLevel, LEVELS, BOSS_LEVEL
} from "../game.js";

// ── movement structure: 10 levels, boss last, learnable front / onlineUnstable back third ──────────
assert.equal(LEVELS, 10, "ten levels");
assert.equal(BOSS_LEVEL, 10, "boss is the last level");
assert.equal(levelConfig(10).isBoss, true, "level 10 is the boss");
assert.equal(levelConfig(1).onlineUnstable || false, false, "level 1 learnable online");
assert.equal(levelConfig(6).onlineUnstable || false, false, "level 6 learnable online");
assert.equal(levelConfig(7).onlineUnstable, true, "back third (7) is onlineUnstable");
assert.equal(levelConfig(9).onlineUnstable, true, "back third (9) is onlineUnstable");
assert.equal(levelConfig(10).onlineUnstable, true, "boss is onlineUnstable");
assert.equal(movementForLevel(1).name, "Signal");
assert.equal(movementForLevel(10).name, "Observer");

// ── each movement introduces a distinct mode (bands are now load-bearing) ──────────────────────────
assert.equal(levelConfig(1).mode, "simple");
assert.equal(levelConfig(3).mode, "oscillating");
assert.equal(levelConfig(5).mode, "dual");
assert.equal(levelConfig(7).mode, "reversing");
assert.equal(levelConfig(8).mode, "multigap");

// ── tolerance tightens toward the boss ──────────────────────────────────────────────────────────────
assert.ok(levelConfig(10).tolerance < levelConfig(1).tolerance, "the boss is tighter than level 1");
assert.ok(levelConfig(6).tolerance < levelConfig(2).tolerance, "tolerance tightens with depth");

// ── crossAttempt dispatches per mode + is deterministic; each level's solveMoment is a real hit ─────
for (let level = 1; level <= BOSS_LEVEL; level += 1) {
  const seed = level * 13 + 1;
  const t = solveMoment(seed, level);
  assert.equal(crossAttempt({ seed, elapsedMs: t, level }).hit, true, `level ${level}: solveMoment hits`);
  const a = crossAttempt({ seed, elapsedMs: 1234, level });
  const b = crossAttempt({ seed, elapsedMs: 1234, level });
  assert.deepEqual(a, b, `level ${level}: crossAttempt deterministic`);
  assert.ok(renderLevel(seed, level, t).length > 8, `level ${level}: renders`);
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

console.log("stage9 game tests passed");
