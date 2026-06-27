// rounds.test.mjs — Stage 5: the race archetypes are distinct and the boss stays gate-clean.
import assert from 'node:assert/strict';
import { ROUNDS, FINAL_ROUND_ID, isBossRound } from '../rounds.js';

// ── 7 rounds preserved (6 body + boss); the general-lane playtime script + smoke depend on this ─────
assert.equal(ROUNDS.length, 7, 'still 7 rounds');
assert.equal(FINAL_ROUND_ID, 7);
assert.equal(isBossRound(6), true);

// ── ≥3 DISTINCT body archetypes ────────────────────────────────────────────────────────────────────
{
  const body = ROUNDS.filter((r) => r.id < FINAL_ROUND_ID);
  const kinds = new Set(body.map((r) => r.archetype));
  assert.ok(kinds.size >= 3, `≥3 distinct body archetypes (got ${[...kinds].join(', ')})`);
  assert.ok(kinds.has('sprint') && kinds.has('circuit') && kinds.has('gauntlet'), 'sprint + circuit + gauntlet present');
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
  const boss = ROUNDS[6];
  assert.equal(boss.archetype, 'boss');
  assert.ok(!boss.hasPowerups, 'boss has no powerups (repair/shield would weaken the suppression gate)');
}

console.log('stage5 rounds tests passed');
