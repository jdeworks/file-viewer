// race-state.test.mjs — Stage 5: the distance + lap model (sprint vs circuit vs gauntlet).
import assert from 'node:assert/strict';
import { createRaceState, raceLengthFor } from '../race-state.js';

// ── sprint: raceLength = trackLength (falls back to tickCount) ────────────────────────────────────
{
  const r = createRaceState({ archetype: 'sprint', tickCount: 120 });
  assert.equal(r.raceLength, 120, 'sprint without trackLength uses tickCount');
  assert.equal(r.laps, 1);
  assert.equal(r.finished(), false);
  for (let i = 0; i < 120; i += 1) r.advance(1);
  assert.equal(r.distance, 120);
  assert.equal(r.finished(), true, 'sprint finishes at trackLength');
}

// ── explicit trackLength overrides tickCount for sprint/gauntlet ──────────────────────────────────
{
  const r = createRaceState({ archetype: 'gauntlet', tickCount: 100, trackLength: 250 });
  assert.equal(r.raceLength, 250);
  assert.equal(raceLengthFor({ archetype: 'gauntlet', tickCount: 100, trackLength: 250 }), 250);
}

// ── circuit: raceLength = laps × lapLength, table is one lap and the row index wraps ───────────────
{
  const r = createRaceState({ archetype: 'circuit', tickCount: 60, laps: 3 });
  assert.equal(r.raceLength, 180, 'circuit raceLength = laps × lapLength');
  assert.equal(r.laps, 3);
  assert.equal(r.lap(), 1, 'starts on lap 1');
  for (let i = 0; i < 60; i += 1) r.advance(1);
  assert.equal(r.lap(), 2, 'crosses into lap 2 after one lapLength');
  // row index wraps over the one-lap table
  assert.equal(r.rowIndex(65, 60), 5, 'tick 65 wraps to row 5 of a 60-row lap');
  assert.equal(r.rowIndex(0, 60), 0);
}

// ── distance never exceeds raceLength; progress clamps to 1 ────────────────────────────────────────
{
  const r = createRaceState({ archetype: 'sprint', tickCount: 10 });
  r.advance(100);
  assert.equal(r.distance, 10, 'advance clamps to raceLength');
  assert.equal(r.progress(), 1);
  r.reset();
  assert.equal(r.distance, 0, 'reset returns to the start line');
}

console.log('stage5 race-state tests passed');
