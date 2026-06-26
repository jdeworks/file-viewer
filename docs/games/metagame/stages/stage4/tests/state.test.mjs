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

// Tower ids are derived from position — deterministic, no Math.random.
{
  const towers = [{ x: 5, y: 6 }, { x: 12, y: 3 }];
  const a = normalizeState({ towers });
  const b = normalizeState({ towers });
  assert.deepEqual(a.towers.map((t) => t.id), b.towers.map((t) => t.id), 'tower ids are deterministic');
  assert.deepEqual(a.towers.map((t) => t.id), ['tower-5-6', 'tower-12-3'], 'ids encode the cell');
}

console.log('stage4 state tests passed');
