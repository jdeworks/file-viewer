// targeting.test.mjs — Stage 4 per-tower targeting modes (engine selectTarget).
import assert from 'node:assert/strict';
import { selectTarget, startWave, tick } from '../engine.js';
import { buildPath } from '../lsystem.js';
import { cycleTowerTarget, placeTower } from '../boss.js';
import { defaultState } from '../state.js';
import { TARGET_MODES, TARGET_PRESETS, toPreset } from '../towers.js';

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

// NOTE (2026-07-03): the ENGINE keeps all five comparator keys (selectTarget above is unchanged) — the
// player SURFACE was reduced to 3 presets (FIRST/STRONG/CYCLE). So the cycle enumeration below now walks
// TARGET_PRESETS, not the old 5-mode ring; the selectTarget assertions above still cover every comparator.
assert.deepEqual(TARGET_PRESETS, ['first', 'strongest', 'last'], 'presets back onto existing comparators');

// toPreset migrates any legacy 5-mode value onto one of the 3 presets (additive; old saves keep working).
assert.equal(toPreset('first'), 'first');
assert.equal(toPreset('closest'), 'first', 'closest collapses to FIRST');
assert.equal(toPreset('strongest'), 'strongest');
assert.equal(toPreset('last'), 'last');
assert.equal(toPreset('weakest'), 'last', 'weakest collapses to CYCLE(last)');
assert.equal(toPreset('bogus'), 'first', 'unknown collapses to FIRST');

// placeTower stamps a default PRESET; cycleTowerTarget advances through the 3 presets and wraps.
{
  const state = defaultState({ seed: 'alpha' });
  state.cycles = 1000;
  const r = placeTower(state, { x: 5, y: 5, type: 'pulse_node' });
  assert.equal(r.tower.targetMode, 'first', 'placed tower defaults to FIRST');
  const seen = [r.tower.targetMode];
  for (let i = 0; i < TARGET_PRESETS.length; i += 1) seen.push(cycleTowerTarget(state, r.tower.id));
  assert.deepEqual(seen.slice(0, 3), ['first', 'strongest', 'last'], 'cycles FIRST → STRONG → CYCLE');
  assert.equal(seen[TARGET_PRESETS.length], 'first', 'cycling wraps around the 3 presets');
  assert.equal(cycleTowerTarget(state, 'nope'), null, 'cycling an unknown tower is a no-op');

  // A legacy tower saved with a 5-mode value migrates to a preset on the next cycle (surface reduction).
  const veteran = placeTower(state, { x: 6, y: 6, type: 'pulse_node' });
  veteran.tower.targetMode = 'weakest'; // simulate a pre-2026-07-03 save value
  assert.equal(cycleTowerTarget(state, veteran.tower.id), 'first', 'weakest(CYCLE) → next preset FIRST');
}
// TARGET_MODES stays exported for the engine comparator table / back-compat.
assert.equal(TARGET_MODES.length, 5, 'engine still knows all five comparator keys');

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

// REGRESSION (2026-07-09): enemies must walk the ROAD between sparse corner waypoints, not snap onto
// them. A depth-1 map has only 6 waypoints 12–35 cells apart; if placeOnPath quantized an enemy to
// pathTiles[floor(pathIndex)] it sat on a corner while the drawn road stayed empty, so a tower placed
// beside the road (but between corners) had dist(tower,e) > range forever and NEVER fired — the whole
// stage read as "enemies invisible + towers don't shoot". This asserts a mid-segment enemy is
// interpolated onto the road cell AND that a nearby tower actually fires at it.
{
  const path = buildPath('alpha', 1);
  const a = path.tiles[0];
  const b = path.tiles[1];              // segment 0→1 is axis-aligned (turtle moves cardinally)
  const horiz = a.y === b.y;
  const mid = { x: Math.round((a.x + b.x) / 2), y: Math.round((a.y + b.y) / 2) };
  const towerCell = horiz ? { x: mid.x, y: mid.y + 1 } : { x: mid.x + 1, y: mid.y }; // one cell off-road
  assert.ok(!path.tiles.some((t) => t.x === towerCell.x && t.y === towerCell.y), 'test tower cell is off the road');

  const state = defaultState({ seed: 'alpha' });
  state.cycles = 5000;
  state.waveActive = true;
  state.spawnQueue = [];
  const placed = placeTower(state, { x: towerCell.x, y: towerCell.y, type: 'pulse_node' });
  assert.ok(placed.ok, 'pulse_node placed beside the road');

  // Enemy sitting HALFWAY along segment 0→1 (fractional pathIndex), far from either corner waypoint.
  state.enemies = [{ id: 'walker', type: 'recursion', hp: 500, maxHp: 500, x: 0, y: 0, pathIndex: 0.5, speed: 0, armor: 0 }];
  tick(state, 250, path.tiles);
  const e = state.enemies[0];

  // Interpolation: the enemy is on the mid-segment road cell, NOT snapped back to corner `a`.
  assert.deepEqual({ x: e.x, y: e.y }, mid, 'enemy interpolated to the mid-segment road cell');
  assert.ok(!(e.x === a.x && e.y === a.y), 'enemy is NOT snapped onto the corner waypoint');

  // Firing: the adjacent tower (range 3, dist 1) shot the mid-segment enemy — the day-one bug is gone.
  assert.ok(placed.tower.lastFiredMs >= 0, 'tower fired (lastFiredMs advanced from -Infinity)');
  assert.ok(e.hp < e.maxHp, 'the mid-segment enemy took tower damage');
}

console.log('stage4 targeting tests passed');
