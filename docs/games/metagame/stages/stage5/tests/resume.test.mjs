// resume.test.mjs — Stage 5: a checkpointed run resumes by deterministic transcript replay, and the
// shared run-state slot round-trips the snapshot. Reconstruction must be byte-identical to a
// continuous run (same seed → same table/rivals; recorded inputs → same path).
import assert from 'node:assert/strict';
import { createGameLoop } from '../game-loop.js';
import { defaultState } from '../state.js';
import { ROUNDS } from '../rounds.js';
import { createRun } from '../../../shared/run-state.js';

const forkIdx = ROUNDS.findIndex((r) => r.archetype === 'fork'); // exercise channel replay too

// ── full run vs (replay prefix → continue): identical outcome + integrity + finish tick ─────────────
{
  const full = defaultState();
  const loopFull = createGameLoop({ state: full, seed: 'rsm', roundIdx: forkIdx, calibrated: false });
  const outFull = loopFull.autoSolve();
  const snap = loopFull.path();
  const finishTick = loopFull.tick;
  assert.ok(snap.lanes.length > 50, 'a transcript was recorded');

  const T = Math.floor(snap.lanes.length / 2);
  const resume = { tick: T, lanes: snap.lanes.slice(0, T), channels: snap.channels.slice(0, T) };

  const resumed = defaultState();
  const loopResume = createGameLoop({ state: resumed, seed: 'rsm', roundIdx: forkIdx, calibrated: false, resume });
  assert.equal(loopResume.tick, T, 'resume fast-forwarded to the checkpoint tick');
  const outResume = loopResume.autoSolve();

  assert.equal(outResume, outFull, 'resumed run reaches the same outcome');
  assert.equal(loopResume.tick, finishTick, 'resumed run finishes at the same tick');
  assert.equal(resumed.run.integrity, full.run.integrity, 'resumed run ends with identical integrity');
  assert.equal(resumed.run.gatesThisRound, full.run.gatesThisRound, 'identical gates harvested');
}

// ── the shared run-state slot round-trips a checkpoint and reset() clears it ─────────────────────────
{
  const save = { stageState: { 5: {} }, runs: {}, global: {} };
  const run = createRun({ save, stageId: 5, slot: 'race', debounceMs: 0 });
  run.checkpoint({ roundIdx: forkIdx, lanes: '0120', channels: 'llhh', tick: 4 });
  run.flush();
  const restored = run.restore();
  assert.equal(restored.tick, 4, 'snapshot restored from the race slot');
  assert.equal(restored.lanes, '0120');
  run.reset();
  assert.equal(run.restore(), null, 'reset clears the resume checkpoint');
}

console.log('stage5 resume tests passed');
