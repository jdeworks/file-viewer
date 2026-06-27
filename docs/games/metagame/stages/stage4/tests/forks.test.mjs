// forks.test.mjs — Stage 4 tier-3 branching forks: choice rules, ability override, stat mods, onHit.
import assert from 'node:assert/strict';
import {
  FORKS, forksFor, forkDef, forkAbility, forkStatMult, towerStat, effectiveOnHit, chooseFork,
} from '../forks.js';
import { abilityForTower } from '../abilities.js';
import { TOWER_TYPES } from '../towers.js';
import { tick } from '../engine.js';
import { buildPath } from '../lsystem.js';

// Every tower has exactly two forks.
for (const type of Object.keys(TOWER_TYPES)) assert.equal(forksFor(type).length, 2, `${type} has two forks`);

// ── chooseFork: only at L3, valid id, irrevocable ───────────────────────────────────────────────
{
  const state = { towers: [{ id: 't', type: 'pulse_node', x: 0, y: 0, level: 1 }], log: [] };
  assert.equal(chooseFork(state, 't', 'emp_lance').ok, false, 'cannot fork below L3');
  state.towers[0].level = 3;
  assert.equal(chooseFork(state, 't', 'bogus').ok, false, 'invalid fork id rejected');
  assert.equal(chooseFork(state, 't', 'emp_lance').ok, true, 'L3 + valid id forks');
  assert.equal(chooseFork(state, 't', 'pulse_storm').ok, false, 'fork is irrevocable');
  assert.equal(state.towers[0].fork, 'emp_lance', 'fork stored on the tower');
}

// ── ability override + stat mults ───────────────────────────────────────────────────────────────
{
  const stormy = { type: 'pulse_node', fork: 'pulse_storm' };
  assert.equal(abilityForTower(stormy), 'overcharge', 'fork overrides the L3 ability');
  assert.equal(forkStatMult(stormy, 'fireRate'), 1.8, 'pulse_storm ×1.8 fire rate');
  assert.equal(towerStat(stormy, 'fireRate'), TOWER_TYPES.pulse_node.fireRate * 1.8, 'towerStat folds the fork mult');
  const lance = { type: 'pulse_node', fork: 'emp_lance' };
  assert.equal(towerStat(lance, 'damage'), TOWER_TYPES.pulse_node.damage * 2, 'emp_lance ×2 damage');
  assert.equal(towerStat({ type: 'pulse_node' }, 'damage'), TOWER_TYPES.pulse_node.damage, 'unforked = base');
}

// ── onHit override (fork changes the applied status) ─────────────────────────────────────────────
{
  const def = TOWER_TYPES.thermal_loop;
  const base = effectiveOnHit({ type: 'thermal_loop' }, def);
  const pyre = effectiveOnHit({ type: 'thermal_loop', fork: 'pyre_loop' }, def);
  assert.ok(pyre[0].dps > base[0].dps, 'pyre_loop fork burns hotter than the default');
}

// ── end-to-end: a forked tower deals MORE damage than an unforked one ───────────────────────────
{
  const path = buildPath('alpha', 1);
  const t = path.tiles[3];
  const arena = (fork) => ({ cycles: 0, integrity: 100, recursion: { pointSetId: 'x' }, log: [], damageMult: 1,
    towers: [{ id: 'x', type: 'pulse_node', x: t.x, y: t.y, level: 3, fork, targetMode: 'first' }],
    enemies: [{ id: 'e', type: 'recursion', hp: 1000, maxHp: 1000, x: t.x, y: t.y, pathIndex: 3, speed: 0, armor: 0 }],
    waveActive: true, combatClockMs: 0, enemyNextId: 1 });
  const plain = arena(null); const lance = arena('emp_lance');
  for (let i = 0; i < 3; i++) { tick(plain, 1100, path.tiles); tick(lance, 1100, path.tiles); }
  assert.ok(lance.enemies[0].hp < plain.enemies[0].hp, 'emp_lance fork (×2 damage) out-damages the base tower');
}

console.log('stage4 forks tests passed');
