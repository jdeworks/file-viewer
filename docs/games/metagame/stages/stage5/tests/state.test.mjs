// state.test.mjs — Stage 5 determinism: the calibration seed no longer depends on the wall clock.
import assert from 'node:assert/strict';
import { defaultState } from '../state.js';

{
  const a = defaultState();
  const b = defaultState();
  assert.equal(a.calibration.seed, b.calibration.seed, 'default calibration seed is deterministic');
  assert.ok(/^signal-\w+$/.test(a.calibration.seed), 'seed is a well-formed fixed label');
  // An explicit seed is honoured and repeatable, and differs from the default.
  assert.equal(defaultState({ seed: 'abc' }).calibration.seed, defaultState({ seed: 'abc' }).calibration.seed, 'same seed ⇒ same label');
  assert.notEqual(defaultState({ seed: 'abc' }).calibration.seed, a.calibration.seed, 'explicit seed differs from default');
}

console.log('stage5 state tests passed');
