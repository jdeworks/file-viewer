// Deterministic engine-time bounds for Stage 4's live five-map campaign.
// Includes authored guardian waves; excludes the separate Infinite Loop boss and player build time.
// Run: node scripts/metagame-playtime.mjs

const fmt = (seconds) => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);
  return hours ? `${hours}h ${minutes}m ${secs}s` : `${minutes}m ${secs}s`;
};

const { MAPS, mapPathSeed } = await import('../docs/games/metagame/stages/stage4/maps.js');
const { mapWaveComposition } = await import('../docs/games/metagame/stages/stage4/wavegen.js');
const { ENEMY_TYPES } = await import('../docs/games/metagame/stages/stage4/enemies.js');
const { subBossDef } = await import('../docs/games/metagame/stages/stage4/subboss.js');
const { buildPath, mapPathDepth } = await import('../docs/games/metagame/stages/stage4/lsystem.js');
const { SPAWN_INTERVAL_MS, WAVE_GAP_MS } = await import('../docs/games/metagame/stages/stage4/waves.js');

const CELL_SPEED = 8; // must match engine.js moveEnemies

function pathLength(tiles) {
  let cells = 0;
  for (let i = 0; i < tiles.length - 1; i += 1) {
    cells += Math.abs(tiles[i + 1].x - tiles[i].x) + Math.abs(tiles[i + 1].y - tiles[i].y);
  }
  return cells;
}

function measureMap(map, mapIndex) {
  let cadenceMs = 0;
  let traversalMs = 0;
  let enemies = 0;
  let guardians = 0;

  for (let wave = 1; wave <= map.waveCount; wave += 1) {
    const composition = mapWaveComposition(mapIndex, wave);
    const trashCount = composition.enemies.reduce((sum, entry) => sum + entry.count, 0);
    const guardian = composition.subBoss ? subBossDef(composition.subBoss) : null;
    const enemyCount = trashCount + (guardian ? 1 : 0);
    const speeds = composition.enemies.map((entry) => ENEMY_TYPES[entry.type]?.speed || 1);
    if (guardian) speeds.push(guardian.speed);

    const depth = mapPathDepth(map.depth, wave);
    const tiles = buildPath(mapPathSeed('playtime', mapIndex), depth).tiles;
    const slowest = Math.min(...speeds);

    enemies += enemyCount;
    guardians += guardian ? 1 : 0;
    cadenceMs += Math.max(0, enemyCount - 1) * SPAWN_INTERVAL_MS + WAVE_GAP_MS;
    traversalMs += (pathLength(tiles) / (slowest * CELL_SPEED)) * 1000;
  }

  return { waves: map.waveCount, enemies, guardians, cadenceMs, traversalMs };
}

const rows = MAPS.map(measureMap);
const total = rows.reduce((sum, row) => ({
  waves: sum.waves + row.waves,
  enemies: sum.enemies + row.enemies,
  guardians: sum.guardians + row.guardians,
  cadenceMs: sum.cadenceMs + row.cadenceMs,
  traversalMs: sum.traversalMs + row.traversalMs,
}), { waves: 0, enemies: 0, guardians: 0, cadenceMs: 0, traversalMs: 0 });

if (total.waves !== 90) throw new Error(`Expected 90 live campaign waves; measured ${total.waves}`);

console.log('\nMETAGAME — STAGE 4 LIVE CAMPAIGN ENGINE-TIME BOUNDS\n');
rows.forEach((row, index) => {
  const unopposedMs = row.cadenceMs + row.traversalMs;
  console.log(`  ${MAPS[index].name.padEnd(20)} ${String(row.waves).padStart(2)} waves / ${String(row.enemies).padStart(4)} enemies / ${String(row.guardians).padStart(2)} guardians  `
    + `cadence ${fmt(row.cadenceMs / 1000)} · unopposed ${fmt(unopposedMs / 1000)}`);
});

const unopposedMs = total.cadenceMs + total.traversalMs;
console.log(`\n  Total: ${total.waves} waves / ${total.enemies} enemies / ${total.guardians} guardians`);
console.log(`  1× spawn-cadence floor:          ${fmt(total.cadenceMs / 1000)}`);
console.log(`  1× unopposed traversal baseline: ${fmt(unopposedMs / 1000)}`);
console.log(`  3× spawn-cadence floor:          ${fmt(total.cadenceMs / 3000)}`);
console.log(`  3× unopposed traversal baseline: ${fmt(unopposedMs / 3000)}\n`);
console.log('  Bounds exclude tower kills, pauses/build decisions, retries, and the separate Infinite Loop boss.');
