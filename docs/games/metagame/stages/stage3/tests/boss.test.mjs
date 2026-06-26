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
  // The key is SEED-DERIVED (3 chunks), carried by v1 and stripped from v2 — recoverable only by
  // diffing the two logs.
  const state = defaultState({ now: 1234 });
  const key = diffKeyFromState(state);
  const [a, b, c] = state.memoryPair.pieces;
  assert.equal(key, a + b + c);
  assert.equal(key.length, 9);
  const v1 = memoryV1Text(state);
  assert(v1.includes(a) && v1.includes(b) && v1.includes(c), 'v1 carries the chunks');
  const v2 = memoryV2Text(state);
  assert(v2.includes('[missing]') && !v2.includes(a), 'v2 strips the chunks');
}

{
  const state = defaultState({ now: 1234 });
  const actions = [];
  const result = tryRestoreDiffKey({
    state,
    actions: { setAction: (...args) => actions.push(args) },
    achievements: { unlockAchievement() {} },
    bell: { showBell() {} },
    input: diffKeyFromState(state), // the recovered key
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
