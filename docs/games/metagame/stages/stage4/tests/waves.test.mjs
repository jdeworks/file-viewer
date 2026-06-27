// waves.test.mjs — Stage 4 wave compositions (waves 1–5 + fallback).
import assert from "node:assert/strict";
import { waveComposition, waveEnemyCount, FINAL_WAVE } from "../waves.js";

assert.equal(waveComposition(1, "x").enemies[0].type, "recursion", "wave 1 spawns recursion enemies");
assert.equal(waveEnemyCount(1, "x"), 6, "wave 1 has 6 enemies");
assert.ok(waveEnemyCount(5, "x") >= 18, "wave 5 has at least 18 enemies");

// Counts escalate across the authored waves.
const counts = [1, 2, 3, 4, 5].map((w) => waveEnemyCount(w, "x"));
for (let i = 1; i < counts.length; i++) assert.ok(counts[i] > counts[i - 1], `wave ${i + 1} is bigger than wave ${i}`);

// Unauthored waves (>31, e.g. prestige overflow) fall back deterministically and keep growing.
{
  const a = waveComposition(35, "x");
  const b = waveComposition(35, "x");
  assert.deepEqual(a, b, "fallback wave is deterministic");
  assert.ok(waveEnemyCount(35, "x") > waveEnemyCount(5, "x"), "fallback waves keep scaling");
}

// Waves 6–10 (MATCH) introduce the fast/armored enemy types.
{
  const types = (w) => waveComposition(w, "x").enemies.map((e) => e.type);
  assert.ok(types(6).includes("pattern_crawler"), "wave 6 introduces pattern crawlers");
  assert.ok(types(8).includes("null_packet"), "wave 8 introduces null packets");
  assert.ok(types(10).includes("pattern_crawler") && types(10).includes("null_packet"), "wave 10 mixes both");
  assert.ok(waveEnemyCount(10, "x") >= waveEnemyCount(6, "x"), "later MATCH waves are not smaller");
}

// Waves 11–30 add the remaining enemy types; wave 25 fields every type; wave 31 is the boss.
{
  const types = (w) => waveComposition(w, "x").enemies.map((e) => e.type);
  assert.ok(types(11).includes("fractal_host"), "wave 11 introduces fractal hosts");
  assert.ok(types(16).includes("resonance_ghost"), "wave 16 introduces resonance ghosts");
  assert.ok(types(20).includes("depth_crawler"), "wave 20 fields depth-crawler elites");
  const w25 = new Set(types(25));
  for (const t of ["recursion", "pattern_crawler", "null_packet", "resonance_ghost", "fractal_host", "depth_crawler"]) {
    assert.ok(w25.has(t), `wave 25 includes ${t}`);
  }
  const boss = waveComposition(31, "x");
  assert.equal(boss.isBoss, true, "wave 31 is the boss");
  assert.equal(boss.enemies.length, 0, "the boss wave spawns no trash");
}

assert.equal(FINAL_WAVE, 31, "the boss is wave 31");

console.log("stage4 waves tests passed");
