import assert from 'node:assert/strict';
import { getBossLockState, raceTheJammer } from '../boss.js';
import { applyCalibrationTick, runCalibrationTimeline } from '../calibration.js';
import { defaultState } from '../state.js';
import { TRANSMISSION_HUM_PATH } from '../messages.js';

const lockedActions = { hasAction: () => false };
const unlockedActions = { hasAction: (stage, action) => stage === 5 && action === 'counter_wave_calibrated' };

{
  const state = defaultState({ seed: 'alpha' });
  const lock = getBossLockState({ actions: lockedActions, state });
  assert.equal(lock.unlocked, false);
  assert.equal(lock.defeatPossible, false);
  assert.equal(lock.playerCounterWave, 'absent');
}

{
  const state = defaultState({ seed: 'alpha' });
  const actions = [];
  applyCalibrationTick({
    state,
    actions: { setAction: (...args) => actions.push(args) },
    file: TRANSMISSION_HUM_PATH,
    deltaMs: 13999,
    active: true,
  });
  assert.equal(state.calibration.calibrated, false);
  assert.equal(actions.length, 0);
  applyCalibrationTick({
    state,
    actions: { setAction: (...args) => actions.push(args) },
    file: TRANSMISSION_HUM_PATH,
    deltaMs: 1,
    active: true,
  });
  assert.equal(state.calibration.calibrated, true);
  assert.equal(actions[0][0], 5);
  assert.equal(actions[0][1], 'counter_wave_calibrated');
  assert.equal(actions[0][2].durationMs, 14000);
}

{
  const state = defaultState({ seed: 'alpha' });
  const actions = [];
  runCalibrationTimeline({
    state,
    actions: { setAction: (...args) => actions.push(args) },
    file: TRANSMISSION_HUM_PATH,
    samples: [
      { atMs: 0, active: true },
      { atMs: 7000, active: true },
      { atMs: 7001, active: false },
      { atMs: 14000, active: true },
    ],
  });
  assert.equal(state.calibration.calibrated, false);
  assert.equal(actions.length, 0);
}

{
  const state = defaultState({ seed: 'alpha' });
  const actions = [];
  runCalibrationTimeline({
    state,
    actions: { setAction: (...args) => actions.push(args) },
    file: TRANSMISSION_HUM_PATH,
    samples: [
      { atMs: 0, active: true },
      { atMs: 5000, active: true },
      { atMs: 10000, active: true },
      { atMs: 14000, active: true },
    ],
  });
  assert.equal(state.calibration.calibrated, true);
  assert.equal(actions.length, 1);
}

{
  const state = defaultState({ seed: 'alpha' });
  const lockedResult = raceTheJammer({ state, actions: lockedActions });
  assert.equal(lockedResult.locked, true);
  assert.equal(state.boss.defeated, false);
  const result = raceTheJammer({ state, actions: unlockedActions });
  assert.equal(result.defeated, true);
  assert.equal(state.boss.defeated, true);
  assert.equal(state.run.roundComplete, true);
}

console.log('stage5 boss tests passed');
