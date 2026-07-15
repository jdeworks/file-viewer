import assert from 'node:assert/strict';
import { fightInfiniteLoop, getBossLockState, placeTower } from '../boss.js';
import { boardText } from '../board.js';
import { defaultState } from '../state.js';

{
  const state = defaultState({ seed: 'alpha' });
  const lock = getBossLockState({ state });
  assert.equal(lock.defeatPossible, false);
  assert.equal(lock.vulnerability, 'visible');
  assert.match(lock.hint, /marked recursion point/i);
  assert.match(boardText(state, []), /R/, 'recursion points are visible on the in-game board');
}

{
  const a = defaultState({ seed: 'alpha' });
  const b = defaultState({ seed: 'beta' });
  assert.notDeepEqual(a.recursion.points, b.recursion.points);
}

{
  const state = defaultState({ seed: 'alpha' });
  const firstPoint = state.recursion.points[0];
  const miss = fightInfiniteLoop({ state });
  assert.equal(miss.locked, false);
  assert.equal(miss.damage, 0);
  assert.equal(placeTower(state, { x: firstPoint.x, y: firstPoint.y }).ok, true);
  const hit = fightInfiniteLoop({ state });
  assert.equal(hit.damage, 100, 'each covered point deals the uniform 100 damage');
  state.recursion.points.slice(1).forEach((point) => placeTower(state, { x: point.x, y: point.y }));
  let result = fightInfiniteLoop({ state });
  for (let i = 0; i < 5 && !result.defeated; i++) result = fightInfiniteLoop({ state });
  assert.equal(result.defeated, true);
  assert.equal(state.boss.defeated, true);
}

console.log('stage4 boss tests passed');
