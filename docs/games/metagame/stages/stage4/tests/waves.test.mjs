// waves.test.mjs — Stage 4 wave compositions (waves 1–5 + fallback).
import assert from "node:assert/strict";
import { waveComposition, waveEnemyCount, FINAL_WAVE } from "../waves.js";

assert.equal(waveComposition(1, "x").enemies[0].type, "recursion", "wave 1 spawns recursion enemies");
assert.equal(waveEnemyCount(1, "x"), 6, "wave 1 has 6 enemies");
assert.ok(waveEnemyCount(5, "x") >= 18, "wave 5 has at least 18 enemies");

// Counts escalate across the authored waves.
const counts = [1, 2, 3, 4, 5].map((w) => waveEnemyCount(w, "x"));
for (let i = 1; i < counts.length; i++) assert.ok(counts[i] > counts[i - 1], `wave ${i + 1} is bigger than wave ${i}`);

// Unauthored waves fall back deterministically (no crash) and keep growing.
{
  const a = waveComposition(9, "x");
  const b = waveComposition(9, "x");
  assert.deepEqual(a, b, "fallback wave is deterministic");
  assert.ok(waveEnemyCount(9, "x") > waveEnemyCount(5, "x"), "fallback waves keep scaling");
}

assert.equal(FINAL_WAVE, 31, "the boss is wave 31");

console.log("stage4 waves tests passed");
