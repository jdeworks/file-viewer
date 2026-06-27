// rivals.test.mjs — Stage 5: precomputed seeded AI ghosts are deterministic + consume ZERO live RNG.
import assert from 'node:assert/strict';
import { buildRivals, finishPosition, positionMultiplier } from '../rivals.js';
import { buildObstacleTable } from '../track.js';
import { ROUNDS } from '../rounds.js';
import { createRaceState } from '../race-state.js';

const round = { ...ROUNDS[2], rivals: 3, archetype: 'sprint', trackLength: ROUNDS[2].tickCount };
const table = buildObstacleTable('s5', round);
const race = createRaceState(round);

// ── determinism: same seed ⇒ identical ghosts ─────────────────────────────────────────────────────
{
  const a = buildRivals({ seed: 'rseed', round, table, raceLength: race.raceLength });
  const b = buildRivals({ seed: 'rseed', round, table, raceLength: race.raceLength });
  assert.equal(a.length, 3, 'builds round.rivals ghosts');
  for (let i = 0; i < a.length; i += 1) {
    for (let t = 0; t < race.raceLength; t += 5) {
      assert.equal(a[i].laneAt(t), b[i].laneAt(t), `rival ${i} lane@${t} reproducible`);
      assert.equal(a[i].distAt(t), b[i].distAt(t), `rival ${i} dist@${t} reproducible`);
    }
    assert.equal(a[i].finishTick, b[i].finishTick, `rival ${i} finishTick reproducible`);
  }
  // A different seed yields a different field.
  const c = buildRivals({ seed: 'other', round, table, raceLength: race.raceLength });
  const same = c.every((r, i) => r.finishTick === a[i].finishTick);
  assert.ok(!same, 'different seed → different ghosts');
}

// ── ghosts stay in-bounds, advance monotonically, and eventually finish ────────────────────────────
{
  const rivals = buildRivals({ seed: 'q', round, table, raceLength: race.raceLength });
  for (const r of rivals) {
    assert.ok(r.laneAt(0) >= 0 && r.laneAt(0) <= 2, 'lane in [0,2]');
    assert.ok(r.distAt(0) <= r.distAt(50), 'distance is monotonic');
    assert.ok(Number.isFinite(r.finishTick), 'rival finishes within the tick cap');
    assert.ok(r.glyph && typeof r.glyph === 'string', 'has a glyph');
  }
}

// ── finishPosition / positionMultiplier ────────────────────────────────────────────────────────────
{
  const rivals = [{ finishTick: 50 }, { finishTick: 200 }, { finishTick: 90 }];
  assert.equal(finishPosition(rivals, 100), 3, 'two rivals (50,90) finished before tick 100 → 3rd');
  assert.equal(finishPosition(rivals, 40), 1, 'beat them all → 1st');
  assert.equal(finishPosition([], 100), 1, 'no rivals → 1st');
  assert.equal(positionMultiplier(1, 4), 1, 'first pays full');
  assert.equal(positionMultiplier(4, 4), 0.6, 'last pays the floor');
  assert.ok(positionMultiplier(2, 4) > positionMultiplier(3, 4), 'closer to first pays more');
  assert.equal(positionMultiplier(1, 1), 1, 'a solo race pays full');
}

console.log('stage5 rivals tests passed');
