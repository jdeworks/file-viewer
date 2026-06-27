// game-loop.test.mjs — Stage 5: round resolution + the load-bearing boss suppression gate.
import assert from 'node:assert/strict';
import { createGameLoop } from '../game-loop.js';
import { defaultState } from '../state.js';
import { ROUNDS } from '../rounds.js';

const BOSS_IDX = ROUNDS.length - 1;

// ── optimal play clears every non-boss round with integrity to spare ──────────────────────────────
for (let roundIdx = 0; roundIdx < BOSS_IDX; roundIdx += 1) {
  const state = defaultState();
  const loop = createGameLoop({ state, seed: 's5', roundIdx, calibrated: false });
  const outcome = loop.autoSolve();
  assert.equal(outcome, 'clear', `round ${roundIdx + 1} (${ROUNDS[roundIdx].archetype}) clears with optimal play`);
  assert.ok(state.run.integrity > 0, `round ${roundIdx + 1} survives`);
  assert.ok(state.run.roundComplete, 'roundComplete set');
}

// ── time-trial: optimal play beats par AND banks a replay-ghost recording ──────────────────────────
{
  const ttIdx = ROUNDS.findIndex((r) => r.archetype === 'time-trial');
  const state = defaultState();
  const loop = createGameLoop({ state, seed: 's5', roundIdx: ttIdx, calibrated: false });
  let rec = null;
  const loop2 = createGameLoop({ state, seed: 's5', roundIdx: ttIdx, calibrated: false, onEnd: (e) => { rec = e; } });
  void loop;
  loop2.autoSolve();
  assert.equal(rec.result, 'clear', 'optimal time-trial beats the par ghost');
  assert.ok(rec.ghostRecording && rec.ghostRecording.lanes.length > 0, 'a replay-ghost transcript was recorded');
  assert.ok(rec.finishTick <= rec.parTick, 'finished before par');
  assert.ok(['gold', 'silver', 'bronze'].includes(rec.medal), 'a medal was awarded');
}

// ── paint payload exposes beatOpen so the renderer can drive the beat-pulse glow ───────────────────
{
  const state = defaultState();
  // Round 2 has a burstPattern, so beatOpen genuinely toggles across ticks (not always-open).
  const seen = new Set();
  const loop = createGameLoop({
    state, seed: 's5', roundIdx: 1, calibrated: false,
    onPaint: (view) => seen.add(view.beatOpen),
  });
  loop.paint();
  for (let i = 0; i < 12 && !loop.done; i += 1) loop.step();
  assert.ok(seen.has(true) && seen.has(false), 'beatOpen toggles in the paint payload over a burst cycle');
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
  const loop = createGameLoop({ state, seed: 's5', roundIdx: BOSS_IDX, calibrated: false });
  assert.equal(loop.isBoss, true);
  assert.equal(loop.suppressionActive, true, 'uncalibrated boss has active suppression');
  const outcome = loop.autoSolve();
  assert.equal(outcome, 'fail', 'an uncalibrated boss run runs out of integrity');
  assert.equal(state.run.integrity, 0);
}

// ── boss IS winnable once the counter-wave is calibrated ──────────────────────────────────────────
{
  const state = defaultState();
  const loop = createGameLoop({ state, seed: 's5', roundIdx: BOSS_IDX, calibrated: true });
  assert.equal(loop.suppressionActive, false, 'calibration cancels suppression');
  const outcome = loop.autoSolve();
  assert.equal(outcome, 'clear', 'a calibrated boss run survives with optimal play');
}

// ── vehicle upgrades fold into the run: chassis raises the starting hull cap ────────────────────────
{
  const state = defaultState();
  state.shop = { chassis: 3 };
  createGameLoop({ state, seed: 's5', roundIdx: 0, calibrated: false });
  assert.equal(state.run.maxIntegrity, 136, 'chassis L3 → 136 max integrity');
  assert.equal(state.run.integrity, 136, 'run starts at the raised hull cap');
}

// ── determinism: same seed ⇒ same outcome + integrity ─────────────────────────────────────────────
{
  const a = defaultState(); createGameLoop({ state: a, seed: 'x', roundIdx: 2, calibrated: false }).autoSolve();
  const b = defaultState(); createGameLoop({ state: b, seed: 'x', roundIdx: 2, calibrated: false }).autoSolve();
  assert.equal(a.run.integrity, b.run.integrity, 'deterministic integrity');
}

console.log('stage5 game-loop tests passed');
