// targeting.test.mjs — Stage 4 per-tower targeting modes (engine selectTarget).
import assert from 'node:assert/strict';
import { selectTarget, startWave, tick } from '../engine.js';
import { buildPath } from '../lsystem.js';
import { cycleTowerTarget, placeTower } from '../boss.js';
import { defaultState } from '../state.js';
import { TARGET_MODES } from '../towers.js';

// A fixed, unordered set of enemies at varied path positions / hp / distance from a tower at (10,10).
function enemies() {
  return [
    { id: 'a', hp: 50, pathIndex: 2, x: 10, y: 12 }, // closest (dist 2), low pathIndex
    { id: 'b', hp: 90, pathIndex: 5, x: 10, y: 16 }, // strongest hp, mid pathIndex
    { id: 'c', hp: 10, pathIndex: 8, x: 10, y: 20 }, // weakest hp, furthest along, farthest
  ];
}
const tower = { x: 10, y: 10, targetMode: 'first' };

// first → furthest along (highest pathIndex)
assert.equal(selectTarget(enemies(), { ...tower, targetMode: 'first' }).id, 'c', 'first targets furthest-along');
// last → least far along (lowest pathIndex)
assert.equal(selectTarget(enemies(), { ...tower, targetMode: 'last' }).id, 'a', 'last targets least-far-along');
// strongest → highest hp
assert.equal(selectTarget(enemies(), { ...tower, targetMode: 'strongest' }).id, 'b', 'strongest targets highest hp');
// weakest → lowest hp
assert.equal(selectTarget(enemies(), { ...tower, targetMode: 'weakest' }).id, 'c', 'weakest targets lowest hp');
// closest → smallest distance to tower
assert.equal(selectTarget(enemies(), { ...tower, targetMode: 'closest' }).id, 'a', 'closest targets nearest enemy');
// unknown mode → defaults to first (legacy leader behaviour)
assert.equal(selectTarget(enemies(), { ...tower, targetMode: 'bogus' }).id, 'c', 'unknown mode falls back to first');
assert.equal(selectTarget([], tower), null, 'empty set returns null');

// Order-independence (determinism): reversing the array yields the same pick.
assert.equal(selectTarget(enemies().reverse(), { ...tower, targetMode: 'strongest' }).id, 'b', 'selection is order-independent');

// placeTower stamps a default mode; cycleTowerTarget advances through the ring and wraps.
{
  const state = defaultState({ seed: 'alpha' });
  state.cycles = 1000;
  const r = placeTower(state, { x: 5, y: 5, type: 'pulse_node' });
  assert.equal(r.tower.targetMode, 'first', 'placed tower defaults to first');
  const seen = [r.tower.targetMode];
  for (let i = 0; i < TARGET_MODES.length; i += 1) seen.push(cycleTowerTarget(state, r.tower.id));
  // After exactly TARGET_MODES.length cycles we wrap back to the starting mode.
  assert.equal(seen[TARGET_MODES.length], 'first', 'cycling wraps around the mode ring');
  assert.equal(cycleTowerTarget(state, 'nope'), null, 'cycling an unknown tower is a no-op');
}

// Mode actually changes which enemy a real tower kills first in the tick loop.
{
  const path = buildPath('alpha', 2);
  const tile = path.tiles[4];
  const state = defaultState({ seed: 'alpha' });
  state.cycles = 1000;
  state.waveActive = true;
  // Two enemies on the tower's tile: a high-hp leader (further along) and a low-hp straggler.
  placeTower(state, { x: tile.x, y: tile.y, type: 'null_spike', targetMode: 'weakest' });
  state.enemies = [
    { id: 'strong', type: 'recursion', hp: 50, maxHp: 50, x: tile.x, y: tile.y, pathIndex: 6, speed: 0, armor: 0 },
    { id: 'weak', type: 'recursion', hp: 12, maxHp: 12, x: tile.x, y: tile.y, pathIndex: 5, speed: 0, armor: 0 },
  ];
  tick(state, 250, path.tiles); // null_spike (40 dmg) on 'weakest' kills the 12-hp straggler, not the leader
  assert.ok(!state.enemies.find((e) => e.id === 'weak'), 'weakest-mode tower killed the low-hp straggler');
  assert.ok(state.enemies.find((e) => e.id === 'strong'), 'the high-hp leader survived');
}

console.log('stage4 targeting tests passed');
