// maps.test.mjs — Stage 4 campaign map definitions + wavegen + sub-bosses.
import assert from 'node:assert/strict';
import { MAPS, MAP_COUNT, mapByIndex, mapPathSeed, subBossIdForWave } from '../maps.js';
import { mapWaveComposition, mapWaveEnemyCount, mapEnemyPool, waveHpScale } from '../wavegen.js';
import { SUB_BOSSES, subBossDef, spawnSubBoss } from '../subboss.js';

// Five maps of the designed lengths.
assert.equal(MAP_COUNT, 5, 'campaign has five maps');
// Round-4 length rebalance: 150→90 waves (≈90–100m realistic, inside the 40–120m target band).
assert.deepEqual(MAPS.map((m) => m.waveCount), [5, 10, 15, 25, 35], 'wave counts are 5/10/15/25/35 (90 total)');
assert.equal(MAPS.reduce((s, m) => s + m.waveCount, 0), 90, 'campaign totals 90 waves');
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
assert.equal(subBossIdForWave(4, 35), 'final-bastion', 'map4 final wave is the final guardian');
assert.equal(subBossIdForWave(3, 10), 'cascade-anchor', 'map3 arc end is a guardian');
// Every map's final wave carries its capstone guardian (arc ends moved with the rebalance).
for (const m of MAPS) assert.ok(subBossIdForWave(MAPS.indexOf(m), m.waveCount), `${m.id} final wave is a guardian`);

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
  assert.ok(mapWaveEnemyCount(4, 30) > mapWaveEnemyCount(0, 1), 'later/bigger maps field more enemies');
}

// Difficulty compensation (rebalance): per-wave HP scales up with wave + map, gentle at the start.
{
  assert.equal(waveHpScale(1, 0), 1, 'map0 wave1 HP is unscaled (gentle onboarding)');
  assert.ok(waveHpScale(35, 4) > waveHpScale(1, 4), 'HP scales up within a map');
  assert.ok(waveHpScale(10, 4) > waveHpScale(10, 0), 'later maps field tankier enemies at the same wave');
  assert.ok(waveHpScale(35, 4) > 2, 'the climactic final wave roughly doubles enemy HP');
  assert.equal(mapWaveComposition(4, 30).hpScale, waveHpScale(30, 4), 'composition carries the wave HP scale');
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
