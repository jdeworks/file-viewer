// track.test.mjs — Stage 5: obstacle-table generation invariants.
import assert from 'node:assert/strict';
import { buildObstacleTable, isBlock, isGate } from '../track.js';
import { ROUNDS, roundByIdx, isBossRound } from '../rounds.js';

const R1 = ROUNDS[0];

// ── shape + determinism ─────────────────────────────────────────────────────────────────────────
{
  const a = buildObstacleTable('test', R1);
  const b = buildObstacleTable('test', R1);
  assert.equal(a.length, R1.tickCount, 'table length = tickCount');
  assert.deepEqual(a, b, 'same seed → same table');
  const c = buildObstacleTable('other', R1);
  assert.notDeepEqual(a, c, 'different seed → different table');
}

// ── always an escape: never all 3 lanes blocked, on every round ───────────────────────────────────
for (const round of ROUNDS) {
  const table = buildObstacleTable('escape', round);
  for (const row of table) {
    const blocked = row.lanes.filter(isBlock).length;
    assert.ok(blocked < 3, `round ${round.id}: a row blocked all 3 lanes`);
  }
}

// ── round 1 only draws ░ ───────────────────────────────────────────────────────────────────────
{
  const table = buildObstacleTable('glyphs', R1);
  for (const row of table) {
    for (const g of row.lanes) if (g !== null) assert.equal(g, '░', 'round 1 only uses ░');
  }
}

// ── gates only appear in rounds with hasGates, never sharing a lane with a ▓ ─────────────────────
{
  const r1 = buildObstacleTable('gates', ROUNDS[0]); // no gates
  assert.ok(!r1.some((row) => row.lanes.some(isGate)), 'round 1 has no boost gates');
  const r5 = buildObstacleTable('gates', ROUNDS[4]); // hasGates
  assert.ok(r5.some((row) => row.lanes.some(isGate)), 'round 5 produces boost gates');
  for (const row of r5) {
    row.lanes.forEach((g, lane) => { if (isGate(g)) assert.ok(!isBlock(row.lanes[lane]), 'gate lane is otherwise clear'); });
  }
}

// ── beatOpen follows burstPattern; round 1 (no pattern) is always open ─────────────────────────────
{
  const r1 = buildObstacleTable('beat', ROUNDS[0]);
  assert.ok(r1.every((row) => row.beatOpen === true), 'round 1 is always beat-open');
  const r2 = buildObstacleTable('beat', ROUNDS[1]); // burst [1,1,1,0,0]
  assert.equal(r2[0].beatOpen, false, 'burst tick 0 closed');
  assert.equal(r2[3].beatOpen, true, 'gap tick 3 open');
}

// ── counter-phase lane shifts on schedule for rounds that have it ─────────────────────────────────
{
  const r4 = buildObstacleTable('cp', ROUNDS[3]); // shift 8
  assert.equal(r4[0].counterPhaseLane, 0, 'cp lane starts at 0');
  assert.equal(r4[8].counterPhaseLane, 1, 'cp lane shifts after 8 ticks');
  assert.equal(buildObstacleTable('cp', ROUNDS[0])[0].counterPhaseLane, null, 'round 1 has no counter-phase');
}

// ── rounds helpers ────────────────────────────────────────────────────────────────────────────
assert.equal(roundByIdx(0).id, 1);
assert.equal(isBossRound(ROUNDS.length - 1), true, 'last idx is the boss round');
assert.equal(isBossRound(0), false);

console.log('stage5 track tests passed');
