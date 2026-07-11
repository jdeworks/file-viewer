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
  assert.equal(lock.defeatPossible, false); // no towers placed yet — not a hard gate, just genuinely 0 coverage
  assert.match(lock.hint, /scattered|invisible/i);
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
  // 2026-07-11 playtest fix: the blueprint is a buff, not a gate — a tower placed on a recursion
  // point deals real damage even with zero blueprint progress, just at a lower rate than the buffed
  // (coordinates-known) hit.
  const state = defaultState({ seed: 'alpha' });
  const firstPoint = state.recursion.points[0];
  const blind = fightInfiniteLoop({ state, actions: lockedActions });
  assert.equal(blind.locked, false, 'no hard lock — just genuinely 0 coverage with no towers placed');
  assert.equal(blind.damage, 0);
  assert.equal(placeTower(state, { x: firstPoint.x, y: firstPoint.y }).ok, true);
  const blindHit = fightInfiniteLoop({ state, actions: lockedActions });
  assert.equal(blindHit.locked, false);
  assert.equal(blindHit.damage, 100, 'a blind (un-buffed) covered hit still lands, at the lower rate');
  const buffedHit = fightInfiniteLoop({ state, actions: unlockedActions });
  assert.equal(buffedHit.locked, false);
  assert.equal(buffedHit.damage, 150, 'the blueprint buff raises the same coverage to a harder hit');
  state.recursion.points.slice(1).forEach((point) => placeTower(state, { x: point.x, y: point.y }));
  assert.equal(fightInfiniteLoop({ state, actions: unlockedActions }).defeated, true);
  assert.equal(state.boss.defeated, true);
}

{
  // The boss is fully defeatable with ZERO blueprint progress — grinding blind coverage alone wins.
  const state = defaultState({ seed: 'gamma' });
  state.recursion.points.forEach((point) => placeTower(state, { x: point.x, y: point.y }));
  let result = fightInfiniteLoop({ state, actions: lockedActions });
  for (let i = 0; i < 5 && !result.defeated; i++) result = fightInfiniteLoop({ state, actions: lockedActions });
  assert.equal(result.defeated, true, 'boss falls to blind (never-read-the-blueprint) coverage alone');
}

console.log('stage4 boss tests passed');
