// s5dev.test.mjs — Stage 5: unit tests for dev-menu cheat mutations.
// All cheats are pure (state in, mutate) so every assertion runs without a DOM.
// The dev(id) → persistAndPaint() call-path in renderer.js is DOM-only and is not tested here.

import assert from 'node:assert/strict';
import {
  applyDev,
  BOSS_IDX,
  devGivePackets,
  devRepair,
  devClearAllRounds,
  devInstantCalibrate,
} from '../s5dev.js';
import { defaultState } from '../state.js';
import { getBossLockState } from '../boss.js';
import { ACTION_NAME } from '../messages.js';

// ── devGivePackets ─────────────────────────────────────────────────────────────────────────────────

{
  const state = defaultState();
  const before = state.packets;
  devGivePackets(state, 200);
  assert.equal(state.packets, before + 200, 'give 200 packets adds to existing total');
}

{
  const state = defaultState();
  const before = state.packets;
  devGivePackets(state);              // default amount
  assert.equal(state.packets, before + 200, 'default amount is 200');
}

// ── devRepair ──────────────────────────────────────────────────────────────────────────────────────

{
  const state = defaultState();
  state.run.integrity = 23;
  devRepair(state);
  assert.equal(state.run.integrity, 100, 'repair restores integrity to 100');
}

{
  const state = defaultState();
  state.run.integrity = 100;         // already full — must stay 100
  devRepair(state);
  assert.equal(state.run.integrity, 100, 'repair on full integrity is idempotent');
}

// ── devClearAllRounds ──────────────────────────────────────────────────────────────────────────────

{
  const state = defaultState();
  assert.equal(Number(state.run.clearedRounds), 0, 'fresh state has 0 cleared rounds');
  devClearAllRounds(state);
  assert.equal(state.run.clearedRounds, BOSS_IDX, 'clear-runs sets clearedRounds to BOSS_IDX');
  // Boss-round gating predicate in renderer.js: locked = cleared < BOSS_IDX.
  // After the cheat, cleared === BOSS_IDX, so locked === false.
  assert.ok(state.run.clearedRounds >= BOSS_IDX, 'boss-round gate is now open');
}

{
  // BOSS_IDX is one less than ROUND_COUNT — sanity check it is a valid round index.
  assert.ok(BOSS_IDX >= 1, 'BOSS_IDX is at least 1');
}

// ── devInstantCalibrate — state mutation ───────────────────────────────────────────────────────────

{
  const state = defaultState();
  assert.equal(state.calibration.calibrated, false, 'calibration starts false');
  const calls = [];
  const actions = { setAction: (...args) => calls.push(args) };
  devInstantCalibrate(state, actions);
  assert.equal(state.calibration.calibrated, true, 'calibrate sets calibrated=true');
  assert.ok(
    state.calibration.continuousMs >= (state.calibration.loopMs || 14000),
    'continuousMs reaches the loop threshold',
  );
  assert.equal(calls.length, 1, 'setAction was called exactly once');
  assert.equal(calls[0][0], 5, 'setAction stage is 5');
  assert.equal(calls[0][1], ACTION_NAME, 'setAction action is ACTION_NAME');
  assert.equal(calls[0][2].source, 'dev-cheat', 'setAction payload records dev-cheat source');
}

// ── devInstantCalibrate — boss now reachable per getBossLockState ──────────────────────────────────

{
  const state = defaultState();
  // Simulate the real actions system: record setAction calls, then answer hasAction from them.
  const registered = new Map();
  const actions = {
    setAction: (stage, action) => registered.set(`${stage}:${action}`, true),
    hasAction: (stage, action) => Boolean(registered.get(`${stage}:${action}`)),
  };
  // Before calibration the boss is locked.
  assert.equal(getBossLockState({ actions, state }).unlocked, false, 'boss locked before cheat');
  devInstantCalibrate(state, actions);
  // After calibration the same predicate that getBossLockState uses returns unlocked.
  const lock = getBossLockState({ actions, state });
  assert.equal(lock.unlocked, true, 'boss is unlocked after instant-calibrate');
  assert.equal(lock.defeatPossible, true, 'defeatPossible matches unlocked');
}

// ── devInstantCalibrate — null/undefined actions is safe ──────────────────────────────────────────

{
  const state = defaultState();
  assert.doesNotThrow(() => devInstantCalibrate(state, null), 'null actions does not throw');
  assert.equal(state.calibration.calibrated, true, 'state still mutated even with null actions');
}

// ── applyDev dispatch ──────────────────────────────────────────────────────────────────────────────

{
  const state = defaultState();
  state.packets = 0;
  const handled = applyDev('packets', state, {});
  assert.equal(handled, true, 'applyDev returns true for known id');
  assert.equal(state.packets, 200, 'applyDev dispatches to devGivePackets');
}

{
  const state = defaultState();
  state.run.integrity = 10;
  assert.equal(applyDev('repair', state, {}), true);
  assert.equal(state.run.integrity, 100, 'applyDev dispatches to devRepair');
}

{
  const state = defaultState();
  assert.equal(applyDev('clear-runs', state, {}), true);
  assert.equal(state.run.clearedRounds, BOSS_IDX, 'applyDev dispatches to devClearAllRounds');
}

{
  const state = defaultState();
  const calls = [];
  const handled = applyDev('calibrate', state, { setAction: (...a) => calls.push(a) });
  assert.equal(handled, true, 'applyDev returns true for calibrate');
  assert.equal(state.calibration.calibrated, true, 'applyDev dispatches to devInstantCalibrate');
  assert.equal(calls.length, 1, 'setAction was called via applyDev');
}

{
  const state = defaultState();
  const before = JSON.stringify(state);
  const handled = applyDev('unknown-id', state, {});
  assert.equal(handled, false, 'applyDev returns false for unknown id');
  assert.equal(JSON.stringify(state), before, 'unknown id leaves state unchanged');
}

console.log('stage5 s5dev tests passed');
