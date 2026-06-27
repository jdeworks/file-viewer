// behaviors.test.mjs — Stage 4 expanded enemies + active behaviors (regen/heal/flicker/burrow) and
// their interaction with damage types (armored_loop resist, shield_drone shield, burn vs regen).
import assert from 'node:assert/strict';
import { ENEMY_TYPES, spawnEnemy } from '../enemies.js';
import { behaviorPass, isTargetable, burrowArmor } from '../behaviors.js';
import { tick } from '../engine.js';
import { buildPath } from '../lsystem.js';
import { mapEnemyPool } from '../wavegen.js';

// ── data: new enemies carry the right system hooks ──────────────────────────────────────────────
assert.equal(ENEMY_TYPES.armored_loop.resist.kinetic, 0.4, 'armored_loop resists kinetic');
assert.equal(ENEMY_TYPES.shield_drone.shield, 140, 'shield_drone has a shield pool');
assert.ok(ENEMY_TYPES.regenerator.regen > 0 && ENEMY_TYPES.flicker_ghost.flicker, 'regen/flicker defined');

// spawnEnemy copies resist + shield onto the live enemy.
{
  const drone = spawnEnemy('shield_drone', 'x', 1);
  assert.equal(drone.shield, 140, 'live drone has shield');
  assert.equal(drone.shieldMax, 140, 'shieldMax recorded');
  const loop = spawnEnemy('armored_loop', 'x', 2);
  assert.equal(loop.resist.kinetic, 0.4, 'live loop carries resist');
}

// ── regen heals over time; burn DoT counters it ─────────────────────────────────────────────────
{
  const e = { type: 'regenerator', hp: 100, maxHp: 140 };
  behaviorPass({ enemies: [e] }, 1000);
  assert.equal(e.hp, 118, 'regenerator heals 18/s');
  const capped = { type: 'regenerator', hp: 139, maxHp: 140 };
  behaviorPass({ enemies: [capped] }, 1000);
  assert.equal(capped.hp, 140, 'regen never exceeds maxHp');
}

// ── healer_node heals nearby allies, not itself-only ────────────────────────────────────────────
{
  const healer = { type: 'healer_node', hp: 110, maxHp: 110, x: 0, y: 0 };
  const ally = { type: 'recursion', hp: 30, maxHp: 50, x: 2, y: 0 };
  const far = { type: 'recursion', hp: 30, maxHp: 50, x: 20, y: 20 };
  behaviorPass({ enemies: [healer, ally, far] }, 1000);
  assert.ok(ally.hp > 30, 'nearby ally healed');
  assert.equal(far.hp, 30, 'distant ally not healed');
}

// ── flicker_ghost is untargetable during its off-window ─────────────────────────────────────────
{
  const g = { type: 'flicker_ghost' };
  const f = ENEMY_TYPES.flicker_ghost.flicker;
  assert.equal(isTargetable(g, 0), true, 'visible at the start of the on-window');
  assert.equal(isTargetable(g, f.onMs + 10), false, 'phased out during the off-window');
  assert.equal(isTargetable({ type: 'recursion' }, 9999), true, 'normal enemies always targetable');
}

// ── burrower armors up while down ───────────────────────────────────────────────────────────────
{
  const b = { type: 'burrower' };
  const cfg = ENEMY_TYPES.burrower.burrow;
  assert.equal(burrowArmor(b, 0), 0, 'surfaced = no extra armor');
  assert.equal(burrowArmor(b, cfg.upMs + 10), cfg.armor, 'burrowed = heavy armor');
}

// ── end-to-end: kinetic struggles vs armored_loop's resist; null bypasses it ────────────────────
{
  const path = buildPath('alpha', 1);
  const t = path.tiles[3];
  const arena = (towerType) => ({ cycles: 0, integrity: 100, recursion: { pointSetId: 'x' }, log: [], damageMult: 1,
    towers: [{ id: 'x', type: towerType, x: t.x, y: t.y, level: 1, targetMode: 'first' }],
    enemies: [{ ...spawnEnemy('armored_loop', 'x', 1), x: t.x, y: t.y, pathIndex: 3, speed: 0 }],
    waveActive: true, combatClockMs: 0, enemyNextId: 1 });
  const kin = arena('pulse_node'); const nul = arena('null_spike');
  for (let i = 0; i < 4; i++) { tick(kin, 1100, path.tiles); tick(nul, 1100, path.tiles); }
  assert.ok(nul.enemies[0].hp < kin.enemies[0].hp, 'null out-damages kinetic against an armored_loop');
}

// Wavegen weaves the new enemies into the campaign pools (map0 stays pure recursion).
assert.deepEqual(mapEnemyPool(0), ['recursion'], 'map0 unchanged (only recursion)');
assert.ok(mapEnemyPool(2).includes('shield_drone') && mapEnemyPool(2).includes('armored_loop'), 'map2 fields shields/armor');
assert.ok(mapEnemyPool(4).includes('flicker_ghost') && mapEnemyPool(4).includes('burrower'), 'map4 fields the full roster');

console.log('stage4 behaviors tests passed');
