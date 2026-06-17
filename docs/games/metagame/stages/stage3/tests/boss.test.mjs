import assert from 'node:assert/strict';
import {
  defeatMemoryLeak,
  getBossLockState,
  tryRestoreDiffKey,
} from '../boss.js';
import { defaultState } from '../state.js';
import { diffKeyFromState, memoryV1Text, memoryV2Text } from '../content.js';

const lockedActions = { hasAction: () => false, setAction() {} };

{
  const state = defaultState({ now: 1234 });
  const lock = getBossLockState({ actions: lockedActions, state });
  assert.equal(lock.unlocked, false);
  assert.equal(lock.columnClues, 'missing');
  assert.equal(lock.defeatPossible, false);
}

{
  const state = defaultState({ now: 1234 });
  const key = diffKeyFromState(state);
  assert.equal(key, '<secretkey>');
  assert(memoryV1Text(state).includes('<sec'));
  assert(memoryV1Text(state).includes('ret'));
  assert(memoryV1Text(state).includes('key>'));
  assert(!memoryV2Text(state).includes('<sec'));
}

{
  const state = defaultState({ now: 1234 });
  const actions = [];
  const result = tryRestoreDiffKey({
    state,
    actions: { setAction: (...args) => actions.push(args) },
    achievements: { unlockAchievement() {} },
    bell: { showBell() {} },
    input: '<secretkey>',
  });
  assert.equal(result.ok, true);
  assert.equal(state.boss.unlocked, true);
  assert.equal(actions[0][0], 3);
  assert.equal(actions[0][1], 'diff_key_restored');
}

{
  const state = defaultState({ now: 1234 });
  const result = tryRestoreDiffKey({ state, actions: lockedActions, input: 'wrong' });
  assert.equal(result.ok, false);
  assert.equal(state.boss.unlocked, false);
  assert.equal(defeatMemoryLeak(state), false);
  state.boss.unlocked = true;
  assert.equal(defeatMemoryLeak(state), true);
  assert.equal(state.boss.defeated, true);
  assert.equal(state.registers, 120);
}

console.log('stage3 boss tests passed');
