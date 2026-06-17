import assert from 'node:assert/strict';
import {
  applyRecursionBlueprintOpen,
  fightInfiniteLoop,
  getBossLockState,
  placeTower,
} from '../boss.js';
import { recursionBlueprintData, recursionBlueprintContent } from '../content.js';
import { defaultState } from '../state.js';

const lockedActions = { hasAction: () => false, setAction() {} };
const unlockedActions = { hasAction: (stage, action) => stage === 4 && action === 'recursion_blueprint_read' };

{
  const state = defaultState({ seed: 'alpha' });
  const lock = getBossLockState({ actions: lockedActions, state });
  assert.equal(lock.unlocked, false);
  assert.equal(lock.defeatPossible, false);
  assert.match(lock.hint, /bastion|folds/i);
}

{
  const a = defaultState({ seed: 'alpha' });
  const b = defaultState({ seed: 'beta' });
  assert.notDeepEqual(a.recursion.points, b.recursion.points);
  const data = recursionBlueprintData(a);
  assert.deepEqual(data.recursion_points, a.recursion.points);
  assert.equal(data.boss_vulnerability.point_set_id, a.recursion.pointSetId);
  assert.equal(JSON.parse(recursionBlueprintContent(a)).recursion_points[0].id, a.recursion.points[0].id);
}

{
  const state = defaultState({ seed: 'alpha' });
  const actions = [];
  assert.equal(applyRecursionBlueprintOpen({
    state,
    actions: { setAction: (...args) => actions.push(args) },
    achievements: { unlockAchievement() {} },
    bell: { showBell() {} },
    path: '/docs/examples/metagame/stage4/waves.json',
  }), false);
  assert.equal(actions.length, 0);
  assert.equal(applyRecursionBlueprintOpen({
    state,
    actions: { setAction: (...args) => actions.push(args) },
    achievements: { unlockAchievement() {} },
    bell: { showBell() {} },
    path: '/docs/examples/metagame/stage4/towers/upgrades/tier3_blueprints/recursion_points.json',
  }), true);
  assert.equal(actions[0][0], 4);
  assert.equal(actions[0][1], 'recursion_blueprint_read');
  assert.equal(actions[0][2].pointSetId, state.recursion.pointSetId);
}

{
  const state = defaultState({ seed: 'alpha' });
  const firstPoint = state.recursion.points[0];
  assert.equal(fightInfiniteLoop({ state, actions: lockedActions }).locked, true);
  assert.equal(placeTower(state, { x: firstPoint.x, y: firstPoint.y }).ok, true);
  const result = fightInfiniteLoop({ state, actions: unlockedActions });
  assert.equal(result.locked, false);
  assert.equal(result.damage, 120);
  state.recursion.points.slice(1).forEach((point) => placeTower(state, { x: point.x, y: point.y }));
  assert.equal(fightInfiniteLoop({ state, actions: unlockedActions }).defeated, true);
  assert.equal(state.boss.defeated, true);
}

console.log('stage4 boss tests passed');
