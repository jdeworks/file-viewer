// state.test.mjs — Stage 4 determinism: no wall-clock seed, no Math.random tower ids.
import assert from 'node:assert/strict';
import { defaultState, normalizeState } from '../state.js';

// The default board is deterministic across sessions (seed no longer falls back to Date.now()).
{
  const a = defaultState();
  const b = defaultState();
  assert.deepEqual(a.recursion.points, b.recursion.points, 'default recursion points are deterministic');
  assert.equal(a.recursion.pointSetId, b.recursion.pointSetId, 'stable point-set id');
  // An explicit seed still produces a distinct, repeatable board.
  const s1 = defaultState({ seed: 'alpha' });
  const s2 = defaultState({ seed: 'alpha' });
  assert.deepEqual(s1.recursion.points, s2.recursion.points, 'same seed ⇒ same board');
  assert.notDeepEqual(a.recursion.points, s1.recursion.points, 'different seed ⇒ different board');
}

// Tower ids are derived from type+position — deterministic, no Math.random. Towers get TD fields.
{
  const towers = [{ x: 5, y: 6 }, { x: 12, y: 3, type: 'null_spike' }];
  const a = normalizeState({ towers });
  const b = normalizeState({ towers });
  assert.deepEqual(a.towers.map((t) => t.id), b.towers.map((t) => t.id), 'tower ids are deterministic');
  assert.deepEqual(a.towers.map((t) => t.id), ['tower-pulse_node-5-6', 'tower-null_spike-12-3'], 'ids encode type+cell');
  assert.equal(a.towers[0].level, 1, 'towers default to level 1');
  assert.equal(a.towers[0].abilityReady, true, 'ability ready by default');
}

// A3: the full-TD state fields are present and stable.
{
  const s = defaultState({ seed: 'x' });
  assert.equal(s.integrity, 100, 'integrity starts at 100');
  assert.equal(s.waveNumber, 1, 'waveNumber starts at 1');
  assert.equal(s.waveActive, false, 'no wave active at start');
  assert.deepEqual(s.enemies, [], 'no live enemies at start');
  assert.equal(s.towerNextId, 1, 'tower id counter starts at 1');
  // enemies are never persisted: a save with stale enemies normalizes to [].
  assert.deepEqual(normalizeState({ enemies: [{ id: 'e1' }] }).enemies, [], 'enemies reset on normalize');
}

console.log('stage4 state tests passed');
