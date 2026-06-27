// abilities.test.mjs — Stage 4 L3 active abilities (emp_burst / null_wave / overcharge) firing in-engine.
import assert from 'node:assert/strict';
import { abilityForTower, overchargeMult, fireAbilities } from '../abilities.js';
import { tick, startWave } from '../engine.js';
import { buildPath } from '../lsystem.js';

const dist = (a, b) => Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0));

// abilityForTower falls back to the tower type's default ability when there is no fork.
assert.equal(abilityForTower({ type: 'pulse_node' }), 'emp_burst', 'pulse_node casts emp_burst by default');
assert.equal(abilityForTower({ type: 'null_spike' }), 'null_wave', 'null_spike casts null_wave');
assert.equal(abilityForTower({ type: 'attractor_field' }), null, 'support tower has no ability');

// ── only L3 towers cast ─────────────────────────────────────────────────────────────────────────
{
  const mk = (level) => ({ towers: [{ id: 't', type: 'pulse_node', x: 0, y: 0, level }], enemies: [{ id: 'e', x: 1, y: 0, hp: 50, armor: 0 }], combatClockMs: 0, log: [] });
  const l2 = mk(2); fireAbilities(l2, dist);
  assert.ok(!l2.enemies[0].status?.stun, 'L2 tower does not cast');
  const l3 = mk(3); fireAbilities(l3, dist);
  assert.ok(l3.enemies[0].status?.stun, 'L3 pulse_node EMP-stuns the enemy in radius');
  assert.ok(l3.towers[0].abilityNextMs > 0, 'cooldown set after the cast');
}

// ── null_wave strips armor (full shred) off armored enemies in range ─────────────────────────────
{
  const state = { towers: [{ id: 'n', type: 'null_spike', x: 0, y: 0, level: 3 }], enemies: [{ id: 'e', x: 2, y: 0, hp: 100, armor: 0.5 }], combatClockMs: 0, log: [] };
  fireAbilities(state, dist);
  assert.equal(state.enemies[0].status?.shred?.armor, 1, 'null_wave fully shreds armor');
}

// ── overcharge buffs the caster's own damage for its window ──────────────────────────────────────
{
  const tower = { type: 'scatter_array', x: 0, y: 0, level: 3 };
  const state = { towers: [tower], enemies: [{ id: 'e', x: 1, y: 0, hp: 50, armor: 0 }], combatClockMs: 0, log: [] };
  fireAbilities(state, dist);
  assert.equal(tower.overchargeMultiplier, 3, 'overcharge sets a ×3 self-buff');
  assert.equal(overchargeMult(tower, 0), 3, 'multiplier active inside the window');
  assert.equal(overchargeMult(tower, 999999), 1, 'multiplier lapses after the window');
}

// ── startWave resets ability cooldowns so the ult is ready each wave ─────────────────────────────
{
  const path = buildPath('alpha', 1);
  const state = { towers: [{ id: 't', type: 'pulse_node', x: 0, y: 0, level: 3, abilityNextMs: 999999 }], enemies: [], recursion: { pointSetId: 'x' }, log: [] };
  startWave(state, 1, path.tiles);
  assert.equal(state.towers[0].abilityNextMs, 0, 'cooldown reset at wave start');
}

console.log('stage4 abilities tests passed');
