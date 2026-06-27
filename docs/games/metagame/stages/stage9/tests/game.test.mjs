// game.test.mjs — Stage 9: band configs + CROSS evaluation.
import assert from "node:assert/strict";
import { levelConfig, bandForLevel, crossAttempt, rotSpeedFor, BOSS_LEVEL } from "../game.js";

// ── band mapping + escalation ─────────────────────────────────────────────────────────────────────
assert.equal(bandForLevel(1), 1, "level 1 → band 1");
assert.equal(bandForLevel(3), 1, "level 3 → band 1");
assert.equal(bandForLevel(4), 2, "level 4 → band 2");
assert.equal(bandForLevel(18), 6, "level 18 → band 6");
assert.equal(levelConfig(18).isBoss, true, "level 18 is the boss");
assert.ok(levelConfig(7).baseSpeed > levelConfig(1).baseSpeed, "later bands rotate faster");
assert.ok(levelConfig(5).tolerance < levelConfig(1).tolerance, "later bands are tighter");
assert.equal(levelConfig(7).display, "dual"); // band 3 = levels 7–9
assert.ok(levelConfig(18).darkZone, "the boss band has a dark zone");

// ── crossAttempt: a full rotation has both hit and miss windows; deterministic ─────────────────────
{
  let hits = 0; let misses = 0;
  for (let t = 0; t <= 13000; t += 50) {
    const r = crossAttempt({ seed: 0, elapsedMs: t, level: 1 });
    if (r.hit) hits += 1; else misses += 1;
  }
  assert.ok(hits > 0, "there is a window where CROSS lands");
  assert.ok(misses > 0, "and a window where it misses");
  const a = crossAttempt({ seed: 0, elapsedMs: 1234, level: 1 });
  const b = crossAttempt({ seed: 0, elapsedMs: 1234, level: 1 });
  assert.deepEqual(a, b, "crossAttempt is deterministic");
}

// ── tighter tolerance at the boss ⇒ a narrower hit window than band 1 ───────────────────────────────
{
  const countHits = (level) => {
    let n = 0;
    for (let t = 0; t <= 13000; t += 25) if (crossAttempt({ seed: 0, elapsedMs: t, level }).hit) n += 1;
    return n;
  };
  assert.ok(countHits(BOSS_LEVEL) < countHits(1), "the boss hit window is narrower than band 1");
}

// ── speed variance is seeded (deterministic per seed) ──────────────────────────────────────────────
assert.equal(rotSpeedFor(0, 4), rotSpeedFor(0, 4), "rotSpeed deterministic per seed/level");

console.log("stage9 game tests passed");
