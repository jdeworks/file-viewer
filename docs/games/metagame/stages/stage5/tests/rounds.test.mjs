// rounds.test.mjs — Stage 5: the race archetypes are distinct and the boss stays gate-clean.
import assert from 'node:assert/strict';
import { ROUNDS, FINAL_ROUND_ID, isBossRound } from '../rounds.js';

// ── 8 rounds (7 body + boss); boss is always the LAST entry and gate-clean ──────────────────────────
assert.equal(ROUNDS.length, 8, 'now 8 rounds (added TIME TRIAL)');
assert.equal(FINAL_ROUND_ID, 8);
assert.equal(isBossRound(ROUNDS.length - 1), true);
assert.equal(ROUNDS[ROUNDS.length - 1].archetype, 'boss', 'boss stays last');

// ── ≥4 DISTINCT body archetypes (sprint + circuit + gauntlet + time-trial) ──────────────────────────
{
  const body = ROUNDS.filter((r) => r.id < FINAL_ROUND_ID);
  const kinds = new Set(body.map((r) => r.archetype));
  assert.ok(kinds.size >= 4, `≥4 distinct body archetypes (got ${[...kinds].join(', ')})`);
  assert.ok(kinds.has('sprint') && kinds.has('circuit') && kinds.has('gauntlet') && kinds.has('time-trial'),
    'sprint + circuit + gauntlet + time-trial present');
}

// ── the time-trial round declares a par pace (the beat-the-clock gate) ──────────────────────────────
{
  const tt = ROUNDS.find((r) => r.archetype === 'time-trial');
  assert.ok(tt && Number(tt.parPace) > 0, 'time-trial round has a parPace');
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
