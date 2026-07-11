import assert from 'node:assert/strict';
import { getBossLockState, raceTheJammer } from '../boss.js';
import { applyCalibrationTick, runCalibrationTimeline } from '../calibration.js';
import { createGameLoop } from '../game-loop.js';
import { autoSolve } from '../drive.js';
import { defaultState } from '../state.js';
import { TRANSMISSION_HUM_PATH } from '../messages.js';

const lockedActions = { hasAction: () => false };
const unlockedActions = { hasAction: (stage, action) => stage === 5 && action === 'counter_wave_calibrated' };

{
  // 2026-07-11 playtest fix: calibration is an optional buff now, not a gate — the boss race is
  // always attemptable/winnable (defeatPossible), just far harder without the buff.
  const state = defaultState({ seed: 'alpha' });
  const lock = getBossLockState({ actions: lockedActions, state });
  assert.equal(lock.unlocked, false);
  assert.equal(lock.defeatPossible, true);
  assert.equal(lock.playerCounterWave, 'absent');
}

{
  // The real winnability lives in game-loop.js's interval-based suppression drain: a near-maxed rig
  // (Hull + Engine) survives an uncalibrated boss race with a real (if tight) margin; a fresh,
  // un-upgraded run cannot — calibration remains a big, but no longer mandatory, buff.
  const BOSS_ROUND_IDX = 8;
  function race(shop, calibrated, seed) {
    const state = defaultState({ seed });
    state.shop = shop;
    const loop = createGameLoop({ state, seed, roundIdx: BOSS_ROUND_IDX, calibrated });
    autoSolve(loop);
    return state.run.roundComplete;
  }
  for (let i = 0; i < 5; i++) {
    assert.equal(race({ hull: 7, engine: 7 }, false, `boss-uncal-${i}`), true, `seed ${i}: maxed rig should survive the uncalibrated jammer`);
    assert.equal(race({}, false, `boss-uncal-${i}`), false, `seed ${i}: a fresh, unupgraded run should still lose uncalibrated`);
    assert.equal(race({}, true, `boss-uncal-${i}`), true, `seed ${i}: calibration alone (even fresh) should still win`);
  }
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
  // raceTheJammer itself is only ever called by renderer.js AFTER the real race already reports a
  // clean finish (same pattern as every other round) — it no longer gates the win a second time.
  const state = defaultState({ seed: 'alpha' });
  const result = raceTheJammer({ state, actions: lockedActions });
  assert.equal(result.locked, false);
  assert.equal(result.defeated, true);
  assert.equal(state.boss.defeated, true);
  assert.equal(state.run.roundComplete, true);
}

console.log('stage5 boss tests passed');
