// game-loop.test.mjs — Stage 5: round resolution + the load-bearing boss suppression gate.
import assert from 'node:assert/strict';
import { createGameLoop } from '../game-loop.js';
import { defaultState } from '../state.js';

// ── optimal play clears every non-boss round with integrity to spare ──────────────────────────────
for (let roundIdx = 0; roundIdx < 6; roundIdx += 1) {
  const state = defaultState();
  const loop = createGameLoop({ state, seed: 's5', roundIdx, calibrated: false });
  const outcome = loop.autoSolve();
  assert.equal(outcome, 'clear', `round ${roundIdx + 1} clears with optimal play`);
  assert.ok(state.run.integrity > 0, `round ${roundIdx + 1} survives`);
  assert.ok(state.run.roundComplete, 'roundComplete set');
}

// ── packets are awarded on clear ─────────────────────────────────────────────────────────────────
{
  const state = defaultState();
  const before = state.packets;
  const loop = createGameLoop({ state, seed: 's5', roundIdx: 0, calibrated: false });
  loop.autoSolve();
  assert.ok(state.packets > before, 'clearing a round pays packets');
}

// ── boss is unwinnable UNCALIBRATED (suppression chips integrity to zero) ─────────────────────────
{
  const state = defaultState();
  const loop = createGameLoop({ state, seed: 's5', roundIdx: 6, calibrated: false });
  assert.equal(loop.isBoss, true);
  assert.equal(loop.suppressionActive, true, 'uncalibrated boss has active suppression');
  const outcome = loop.autoSolve();
  assert.equal(outcome, 'fail', 'an uncalibrated boss run runs out of integrity');
  assert.equal(state.run.integrity, 0);
}

// ── boss IS winnable once the counter-wave is calibrated ──────────────────────────────────────────
{
  const state = defaultState();
  const loop = createGameLoop({ state, seed: 's5', roundIdx: 6, calibrated: true });
  assert.equal(loop.suppressionActive, false, 'calibration cancels suppression');
  const outcome = loop.autoSolve();
  assert.equal(outcome, 'clear', 'a calibrated boss run survives with optimal play');
}

// ── determinism: same seed ⇒ same outcome + integrity ─────────────────────────────────────────────
{
  const a = defaultState(); createGameLoop({ state: a, seed: 'x', roundIdx: 2, calibrated: false }).autoSolve();
  const b = defaultState(); createGameLoop({ state: b, seed: 'x', roundIdx: 2, calibrated: false }).autoSolve();
  assert.equal(a.run.integrity, b.run.integrity, 'deterministic integrity');
}

console.log('stage5 game-loop tests passed');
