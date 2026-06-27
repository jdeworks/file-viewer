// roster.test.mjs — Stage 4 expanded tower roster: chain / global mortar / gravity pull / on-hit
// statuses, plus the placeTower cost fix (reads the real per-tower cost).
import assert from 'node:assert/strict';
import { tick } from '../engine.js';
import { placeTower } from '../boss.js';
import { defaultState } from '../state.js';
import { buildPath } from '../lsystem.js';
import { TOWER_TYPES } from '../towers.js';

assert.equal(Object.keys(TOWER_TYPES).length, 14, 'roster expanded to 14 towers');

function arena(towers, enemies) {
  return { cycles: 0, integrity: 100, recursion: { pointSetId: 'x' }, log: [],
    towers, enemies, waveActive: true, combatClockMs: 0, enemyNextId: 1, damageMult: 1 };
}
const path = buildPath('alpha', 1);
const tileAt = (i) => path.tiles[i];

// ── chain_resonator hits the 3 nearest, leaves the 4th ──────────────────────────────────────────
{
  const t = tileAt(4);
  const mk = (id, dx) => ({ id, type: 'recursion', hp: 200, maxHp: 200, x: t.x + dx, y: t.y, pathIndex: 4, speed: 0, armor: 0 });
  const state = arena([{ id: 'c', type: 'chain_resonator', x: t.x, y: t.y, level: 1, targetMode: 'first' }],
    [mk('e0', 0), mk('e1', 1), mk('e2', 2), mk('e3', 3)]); // e3 is the farthest, range is 4 so all in range
  tick(state, 1200, path.tiles); // > 1/0.9s cadence → one volley
  const hurt = state.enemies.filter((e) => e.hp < e.maxHp).length;
  assert.equal(hurt, 3, 'chain damages exactly 3 targets');
}

// ── glyph_mortar reaches a target far outside its physical range (global) ────────────────────────
{
  // Mortar parked at the origin (far from the path); the enemy sits mid-path. A range-limited tower
  // there could never hit it, but the mortar is global so it fires regardless of distance.
  const t = tileAt(2);
  const state = arena([{ id: 'm', type: 'glyph_mortar', x: 0, y: 0, level: 1, targetMode: 'first' }],
    [{ id: 'far', type: 'recursion', hp: 100, maxHp: 100, x: t.x, y: t.y, pathIndex: 2, speed: 0, armor: 0 }]);
  assert.ok(Math.hypot(0 - t.x, 0 - t.y) > TOWER_TYPES.pulse_node.range, 'enemy is well beyond a normal tower range');
  tick(state, 2200, path.tiles); // > 1/0.5s cadence
  assert.ok(state.enemies[0] && state.enemies[0].hp < 100, 'global mortar reaches and splashes a distant enemy');
}

// ── thermal_loop burns; frost_lattice chills; shatter_drill shreds (on-hit statuses) ────────────
{
  const t = tileAt(3);
  const probe = (type) => {
    const state = arena([{ id: 'x', type, x: t.x, y: t.y, level: 1, targetMode: 'first' }],
      [{ id: 'e', type: 'recursion', hp: 500, maxHp: 500, x: t.x, y: t.y, pathIndex: 3, speed: 0, armor: 0.4 }]);
    tick(state, 1600, path.tiles);
    return state.enemies[0].status || {};
  };
  assert.ok(probe('thermal_loop').burn, 'thermal_loop attaches burn');
  assert.ok(probe('frost_lattice').chill || probe('frost_lattice').freeze, 'frost_lattice attaches chill');
  assert.ok(probe('shatter_drill').shred, 'shatter_drill attaches shred');
}

// ── gravity_well pulls a stationary enemy BACK along the path ────────────────────────────────────
{
  const t = tileAt(5);
  const state = arena([{ id: 'g', type: 'gravity_well', x: t.x, y: t.y, level: 1 }],
    [{ id: 'e', type: 'recursion', hp: 50, maxHp: 50, x: t.x, y: t.y, pathIndex: 5, speed: 0, armor: 0 }]);
  for (let i = 0; i < 5; i++) tick(state, 200, path.tiles);
  assert.ok(state.enemies[0].pathIndex < 5, 'gravity well drags the enemy backward');
}

// ── placeTower reads the real cost (bank_node = 300), not the old hard-coded 80/150 ─────────────
{
  const state = defaultState({ seed: 'alpha' });
  state.cycles = 250;
  assert.equal(placeTower(state, { x: 5, y: 5, type: 'bank_node' }).ok, false, '250 cycles cannot afford a 300 bank_node');
  state.cycles = 300;
  const r = placeTower(state, { x: 5, y: 5, type: 'bank_node' });
  assert.ok(r.ok && state.cycles === 0, 'bank_node costs its real 300');
  // long_recursor seats with its preferred targeting mode.
  state.cycles = 400;
  assert.equal(placeTower(state, { x: 7, y: 7, type: 'long_recursor' }).tower.targetMode, 'strongest', 'long_recursor defaults to strongest');
}

console.log('stage4 roster tests passed');
