import assert from 'node:assert/strict';
import {
  defeatMemoryLeak,
  getBossLockState,
  tryRestoreDiffKey,
} from '../boss.js';
import { defaultState } from '../state.js';
import { diffKeyFromState, memoryV1Text, memoryV2Text, memoryV3Text } from '../content.js';

// Parse `sector NN: restoration chunk VALUE` lines from a log into { sectorNN: value }.
function restorationSectors(text) {
  const out = {};
  for (const m of text.matchAll(/sector (\d+): restoration chunk (\S+)/g)) out[m[1]] = m[2];
  return out;
}

const lockedActions = { hasAction: () => false, setAction() {} };

{
  const state = defaultState({ now: 1234 });
  const lock = getBossLockState({ actions: lockedActions, state });
  assert.equal(lock.unlocked, false);
  assert.equal(lock.bodyReady, false);
  assert.equal(lock.columnClues, 'missing');
  assert.equal(lock.defeatPossible, false);
}

{
  // Boss-never-from-start: the diff key is REFUSED until the body is played to corruption 8, and even
  // a correct key cannot unlock the boss before then.
  const state = defaultState({ now: 1234 });
  const early = tryRestoreDiffKey({ state, actions: lockedActions, input: diffKeyFromState(state) });
  assert.equal(early.ok, false);
  assert.equal(early.locked, true);
  assert.equal(state.boss.unlocked, false);
  assert.equal(defeatMemoryLeak(state), false, 'cannot defeat the boss before the body is complete');
}

{
  // The key is SEED-DERIVED (3 chunks). It is recoverable ONLY by a THREE-WAY diff of the logs:
  //   v1 — all three chunks intact (the backup)
  //   v2 — pieces[0] lost (intact→[missing]); pieces[1], pieces[2] still present
  //   v3 — only pieces[2] (the survivor) intact; the other two [missing]
  const state = defaultState({ now: 1234 });
  const key = diffKeyFromState(state);
  const [a, b, c] = state.memoryPair.pieces;
  assert.equal(key, a + b + c);
  assert.equal(key.length, 9);

  const s1 = restorationSectors(memoryV1Text(state));
  const s2 = restorationSectors(memoryV2Text(state));
  const s3 = restorationSectors(memoryV3Text(state));

  const v1vals = Object.values(s1);
  assert.equal(v1vals.length, 3, 'v1 lists three restoration sectors');
  assert(v1vals.every((v) => v !== '[missing]'), 'v1 carries all three chunks intact');
  assert(v1vals.includes(a) && v1vals.includes(b) && v1vals.includes(c), 'v1 carries every chunk');

  const present = (sectors) => Object.values(sectors).filter((v) => v !== '[missing]');
  assert.equal(present(s2).length, 2, 'v2 has exactly two chunks intact (one lost since v1)');
  assert.equal(present(s3).length, 1, 'v3 has exactly one chunk intact (the survivor)');

  // Reconstruct the key by the corruption-order rule, proving the 3-way diff is load-bearing.
  const lostV1V2 = Object.keys(s1).find((sec) => s1[sec] !== '[missing]' && s2[sec] === '[missing]');
  const lostV2V3 = Object.keys(s2).find((sec) => s2[sec] !== '[missing]' && s3[sec] === '[missing]');
  const survivor = Object.keys(s3).find((sec) => s3[sec] !== '[missing]');
  assert(lostV1V2 && lostV2V3 && survivor, 'each corruption step changed a distinct sector');
  const recovered = s1[lostV1V2] + s2[lostV2V3] + s3[survivor];
  assert.equal(recovered, key, 'three-way diff (in corruption order) reconstructs the restoration key');

  // Reading any single log top-to-bottom must NOT trivially give the key (display order is shuffled).
  // (At least guard that the diff is actually required for >0 of the seeds we exercise.)
}

{
  const state = defaultState({ now: 1234 });
  state.boss.corruption8Reached = true; // body played to peak corruption
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
  state.boss.corruption8Reached = true;
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
