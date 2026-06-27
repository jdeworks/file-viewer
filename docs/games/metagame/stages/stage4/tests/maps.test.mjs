// maps.test.mjs — Stage 4 campaign map definitions + wavegen + sub-bosses.
import assert from 'node:assert/strict';
import { MAPS, MAP_COUNT, mapByIndex, mapPathSeed, subBossIdForWave } from '../maps.js';
import { mapWaveComposition, mapWaveEnemyCount, mapEnemyPool } from '../wavegen.js';
import { SUB_BOSSES, subBossDef, spawnSubBoss } from '../subboss.js';

// Five maps of the designed lengths.
assert.equal(MAP_COUNT, 5, 'campaign has five maps');
assert.deepEqual(MAPS.map((m) => m.waveCount), [5, 10, 20, 45, 70], 'wave counts are 5/10/20/45/70');
for (const m of MAPS) {
  assert.ok(m.id && m.name && m.theme, `${m.id} has identity`);
  assert.ok(m.depth >= 1 && m.depth <= 3, `${m.id} depth in range`);
  assert.ok(m.startCycles > 0 && m.startIntegrity > 0, `${m.id} has start economy`);
}

// Clamping + seed helpers.
assert.equal(mapByIndex(-1).id, MAPS[0].id, 'index clamps low');
assert.equal(mapByIndex(99).id, MAPS[4].id, 'index clamps high');
assert.notEqual(mapPathSeed('abc', 0), mapPathSeed('abc', 1), 'each map gets a distinct path seed');

// Sub-boss waves are at the documented block ends.
assert.equal(subBossIdForWave(0, 5), 'shell-warden', 'map0 final wave is a guardian');
assert.equal(subBossIdForWave(0, 4), null, 'map0 wave 4 is normal');
assert.equal(subBossIdForWave(4, 70), 'final-bastion', 'map4 final wave is the final guardian');
assert.equal(subBossIdForWave(3, 15), 'cascade-anchor', 'map3 arc end is a guardian');

// Every referenced sub-boss id resolves to a definition.
for (const m of MAPS) for (const id of Object.values(m.subBosses)) {
  assert.ok(subBossDef(id), `sub-boss ${id} is defined`);
  assert.ok(SUB_BOSSES[id].hp > 0 && SUB_BOSSES[id].ability, `${id} has hp + ability`);
}

// spawnSubBoss mints a tanky ephemeral enemy tagged with its id.
{
  const sb = spawnSubBoss('shell-warden', 7);
  assert.equal(sb.type, 'subboss');
  assert.equal(sb.subBoss, 'shell-warden');
  assert.equal(sb.hp, SUB_BOSSES['shell-warden'].hp);
  assert.equal(sb.abilityFired, false);
  assert.equal(spawnSubBoss('nope', 1), null, 'unknown id mints nothing');
}

// Wave composition is deterministic + scaling.
{
  const a = mapWaveComposition(2, 7);
  const b = mapWaveComposition(2, 7);
  assert.deepEqual(a, b, 'composition is deterministic');
  assert.ok(mapWaveEnemyCount(4, 60) > mapWaveEnemyCount(0, 1), 'later/bigger maps field more enemies');
}

// Enemy pool unlocks by map.
assert.deepEqual(mapEnemyPool(0), ['recursion'], 'map0 only recursion');
assert.ok(mapEnemyPool(1).includes('pattern_crawler'), 'map1 adds pattern crawlers');
assert.ok(mapEnemyPool(4).includes('depth_crawler'), 'map4 fields everything');

// Sub-boss waves carry the guardian id + a (smaller) escort, never empty for the engine.
{
  const comp = mapWaveComposition(0, 5);
  assert.equal(comp.subBoss, 'shell-warden', 'sub-boss wave carries the guardian id');
  const normal = mapWaveComposition(0, 4);
  assert.equal(normal.subBoss, null, 'normal wave has no guardian');
}

console.log('stage4 maps/wavegen/subboss tests passed');
