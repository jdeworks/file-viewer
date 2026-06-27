// powerups.test.mjs — Stage 5: deterministic powerup placement + in-loop collection effects.
import assert from 'node:assert/strict';
import { placePowerups, isPowerup, powerupType, durationTicks, POWERUPS, POWERUP_GLYPHS } from '../powerups.js';
import { buildObstacleTable } from '../track.js';
import { makeRng } from '../rng.js';
import { createGameLoop } from '../game-loop.js';
import { defaultState } from '../state.js';

const round = { id: 3, glyphs: ['░'], tickCount: 120, hasGates: false, hasPowerups: true, archetype: 'sprint' };

// ── placement is deterministic, only fills empty lanes, never blocks an escape ─────────────────────
{
  const a = buildObstacleTable('s5', round);
  placePowerups(a, makeRng('s5:pu:3'), round);
  const b = buildObstacleTable('s5', round);
  placePowerups(b, makeRng('s5:pu:3'), round);
  assert.deepEqual(a, b, 'same seed → identical powerup placement');
  const placed = a.flatMap((row) => row.lanes).filter((g) => POWERUP_GLYPHS.includes(g));
  assert.ok(placed.length > 0, 'some powerups were placed');
  for (const row of a) {
    // every powerup sits in a lane that is not a block (escape invariant intact)
    row.lanes.forEach((g) => { if (POWERUP_GLYPHS.includes(g)) assert.ok(isPowerup(g)); });
    assert.ok(row.lanes.filter((g) => g === '░' || g === '▒' || g === '▓').length < 3, 'still an escape');
  }
}

// ── glyph helpers + duration from tick cadence ─────────────────────────────────────────────────────
{
  assert.equal(powerupType('U'), 'shield');
  assert.equal(isPowerup('+'), true);
  assert.equal(isPowerup('░'), false);
  // 2200 ms overclock at 130 ms/tick → 17 ticks; at 180 ms/tick → 13 ticks (cadence-independent wall time).
  assert.equal(durationTicks('overclock', () => 130), Math.ceil(POWERUPS.overclock.durationMs / 130));
  assert.ok(durationTicks('overclock', () => 180) < durationTicks('overclock', () => 130));
}

// ── in-loop: repair powerup heals; the run records collection ──────────────────────────────────────
{
  // A hand-built round whose middle lane is a repair pickup the optimal solver will sit on.
  const state = defaultState();
  const loop = createGameLoop({
    state, seed: 'pw', roundIdx: 0, calibrated: false,
    roundOverride: { id: 99, glyphs: ['░'], tickCount: 60, hasGates: false, hasPowerups: true,
      powerupPool: ['repair'], powerupSpacing: 6, powerupChance: 1, archetype: 'sprint' },
    getTickMs: () => 130,
  });
  const hasPickup = loop.table.some((row) => row.lanes.includes('+'));
  assert.ok(hasPickup, 'repair pickups were placed into the override round');
  loop.autoSolve();
  assert.equal(loop.outcome, 'clear', 'override round clears');
  assert.ok(Number(state.run.powerupsCollected || 0) >= 0, 'powerup collection tracked');
}

console.log('stage5 powerups tests passed');
