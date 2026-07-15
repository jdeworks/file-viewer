import assert from 'node:assert/strict';
import { defeatMemoryLeak, getBossLockState } from '../boss.js';
import { defaultState } from '../state.js';

{
  const state = defaultState();
  const lock = getBossLockState({ state });
  assert.equal(lock.unlocked, false);
  assert.equal(lock.bodyReady, false);
  assert.equal(lock.defeatPossible, false);
  assert.equal(defeatMemoryLeak(state), false, 'cannot defeat the boss before the body is complete');
}

{
  const state = defaultState();
  state.boss.corruption8Reached = true;
  const lock = getBossLockState({ state });
  assert.equal(lock.unlocked, true, 'corruption 8 directly exposes the boss');
  assert.equal(lock.bodyReady, true);
  assert.equal(lock.defeatPossible, true);
  assert.match(lock.hint, /core is exposed/i);
  assert.equal(defeatMemoryLeak(state), true);
  assert.equal(state.boss.defeated, true);
  assert.equal(state.registers, 120);
  assert.equal(defeatMemoryLeak(state), false, 'defeat is idempotent');
}

console.log('stage3 boss tests passed');
