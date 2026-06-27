// rounds.test.mjs — Stage 5: the race archetypes are distinct and the boss stays gate-clean.
import assert from 'node:assert/strict';
import { ROUNDS, FINAL_ROUND_ID, isBossRound } from '../rounds.js';

// ── 9 rounds (8 body + boss); boss is always the LAST entry and gate-clean ───────────────────────────
assert.equal(ROUNDS.length, 9, 'now 9 rounds (added TIME TRIAL + FORK RELAY)');
assert.equal(FINAL_ROUND_ID, 9);
assert.equal(isBossRound(ROUNDS.length - 1), true);
assert.equal(ROUNDS[ROUNDS.length - 1].archetype, 'boss', 'boss stays last');

// ── ≥5 DISTINCT body archetypes (sprint + circuit + gauntlet + time-trial + fork) ───────────────────
{
  const body = ROUNDS.filter((r) => r.id < FINAL_ROUND_ID);
  const kinds = new Set(body.map((r) => r.archetype));
  assert.ok(kinds.size >= 5, `≥5 distinct body archetypes (got ${[...kinds].join(', ')})`);
  for (const k of ['sprint', 'circuit', 'gauntlet', 'time-trial', 'fork']) {
    assert.ok(kinds.has(k), `${k} archetype present`);
  }
}

// ── the time-trial round declares a par pace; the fork round declares a fork span ───────────────────
{
  const tt = ROUNDS.find((r) => r.archetype === 'time-trial');
  assert.ok(tt && Number(tt.parPace) > 0, 'time-trial round has a parPace');
  const fork = ROUNDS.find((r) => r.archetype === 'fork');
  assert.ok(fork && fork.hasFork && Number(fork.forkSpan) > 0, 'fork round has a fork span');
}

// ── circuits declare laps; sprint/gauntlet declare a trackLength ────────────────────────────────────
for (const r of ROUNDS) {
  if (r.archetype === 'circuit') assert.ok(Number(r.laps) >= 2, `round ${r.id} circuit has laps`);
  else assert.ok(Number(r.trackLength) > 0, `round ${r.id} has a trackLength`);
}

// ── every body round fields rivals; the boss has NO powerups (the calibration un-cheat is the gate) ──
{
  const body = ROUNDS.filter((r) => r.id < FINAL_ROUND_ID);
  assert.ok(body.every((r) => Number(r.rivals) > 0), 'every body round has AI rivals');
  const boss = ROUNDS[ROUNDS.length - 1];
  assert.equal(boss.archetype, 'boss');
  assert.ok(!boss.hasPowerups, 'boss has no powerups (repair/shield would weaken the suppression gate)');
}

console.log('stage5 rounds tests passed');
