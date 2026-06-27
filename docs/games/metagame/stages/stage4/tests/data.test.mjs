// data.test.mjs — Stage 4 enemy/tower data tables + deterministic spawn.
import assert from "node:assert/strict";
import { ENEMY_TYPES, spawnEnemy } from "../enemies.js";
import { TOWER_TYPES, TOWER_ABILITIES, towerUpgradeCost } from "../towers.js";

// ── enemy data ──────────────────────────────────────────────────────────────────────────────────
assert.equal(ENEMY_TYPES.null_packet.armor, 0.5, "null_packet has 50% armor");
assert.equal(ENEMY_TYPES.resonance_ghost.slowImmune, true, "resonance_ghost is slow-immune");
assert.deepEqual(ENEMY_TYPES.fractal_host.spawnsOnDeath, { type: "recursion", count: 2 }, "fractal_host splits on death");

// spawnEnemy is deterministic (id from counter, hp from def, no Math.random).
{
  const a = spawnEnemy("null_packet", "x", 7);
  const b = spawnEnemy("null_packet", "x", 7);
  assert.deepEqual(a, b, "same args ⇒ identical enemy");
  assert.equal(a.id, "e7", "id derives from the counter");
  assert.equal(a.hp, a.maxHp, "spawns at full hp");
  assert.equal(spawnEnemy("bogus", "x", 1).type, "recursion", "unknown type falls back to recursion");
}

// ── tower data ──────────────────────────────────────────────────────────────────────────────────
assert.equal(TOWER_TYPES.null_spike.ignoresArmor, true, "null_spike ignores armor");
assert.equal(towerUpgradeCost("pulse_node", 1), 160, "L1→L2 = cost×2");
assert.equal(towerUpgradeCost("pulse_node", 2), 320, "L2→L3 = cost×4");
assert.equal(towerUpgradeCost("pulse_node", 3), Infinity, "no upgrade past L3");
assert.ok(TOWER_ABILITIES[TOWER_TYPES.pulse_node.ability], "pulse_node has an L3 ability");
assert.equal(TOWER_ABILITIES.emp_burst.stunMs, 2000, "EMP Burst stuns 2s");

console.log("stage4 data tests passed");
