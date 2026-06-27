// ghost.test.mjs — Stage 5: time-trial ghosts are deterministic pacers/transcripts (no RNG, no clock).
import assert from 'node:assert/strict';
import { makeParGhost, ghostFromRecording, createRecorder, medalFor, bestRecording } from '../ghost.js';

// ── par ghost: constant pace, monotonic, finishes at raceLength/pace ────────────────────────────────
{
  const g = makeParGhost(900, 0.9);
  assert.equal(g.kind, 'par');
  assert.equal(g.finishTick, Math.ceil(900 / 0.9), 'par finish tick = length/pace');
  assert.equal(g.laneAt(0), 1, 'par rides the middle lane');
  assert.equal(g.distAt(0), 0);
  assert.ok(g.distAt(100) > g.distAt(50), 'monotonic distance');
  assert.equal(g.distAt(100000), 900, 'distance caps at raceLength');
}

// ── recorder → recording → replay ghost round-trips lane + distance ─────────────────────────────────
{
  const rec = createRecorder();
  rec.sample(0, 1);
  rec.sample(2, 2.6);
  rec.sample(1, 3.9);
  const transcript = rec.finalize(3);
  assert.equal(transcript.tick, 3);
  assert.equal(transcript.lanes, '021', 'lanes captured as a compact string');
  assert.deepEqual(transcript.dist, [1, 3, 4], 'distances rounded to ints');

  const g = ghostFromRecording(transcript, 'G');
  assert.equal(g.glyph, 'G');
  assert.equal(g.laneAt(1), 2);
  assert.equal(g.distAt(2), 4);
  assert.equal(g.laneAt(999), 1, 'out-of-range clamps to last sample');
  assert.equal(g.finishTick, 3);
}

// ── a missing recording yields no ghost (first time-trial run has no prior best) ────────────────────
assert.equal(ghostFromRecording(null), null);

// ── medals: gold under 0.85·par, silver under par, bronze at/over ───────────────────────────────────
assert.equal(medalFor(80, 100), 'gold');
assert.equal(medalFor(95, 100), 'silver');
assert.equal(medalFor(120, 100), 'bronze');

// ── bestRecording keeps the faster (lower finish tick) transcript ───────────────────────────────────
assert.equal(bestRecording({ tick: 100 }, { tick: 90 }).tick, 90);
assert.equal(bestRecording(null, { tick: 90 }).tick, 90);
assert.equal(bestRecording({ tick: 80 }, null).tick, 80);

console.log('stage5 ghost tests passed');
