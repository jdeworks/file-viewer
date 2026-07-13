// Deterministic playtime floor for the retained metagame stage with an engine-timed body.
// Bodies only (no boss). Run: node scripts/metagame-playtime.mjs

const fmt = (s) => (s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`);

const { waveComposition, SPAWN_INTERVAL_MS, WAVE_GAP_MS, FINAL_WAVE } = await import('../docs/games/metagame/stages/stage4/waves.js');
const { ENEMY_TYPES } = await import('../docs/games/metagame/stages/stage4/enemies.js');
const { buildPath, waveGroupDepth } = await import('../docs/games/metagame/stages/stage4/lsystem.js');

let floorMs = 0;
let tailMs = 0;
let totalEnemies = 0;
for (let wave = 1; wave < FINAL_WAVE; wave += 1) {
  const composition = waveComposition(wave, 'x');
  const enemyCount = composition.enemies.reduce((sum, entry) => sum + entry.count, 0);
  totalEnemies += enemyCount;
  const tiles = buildPath('x', waveGroupDepth(wave)).tiles;
  let pathCells = 0;
  for (let i = 0; i < tiles.length - 1; i += 1) {
    pathCells += Math.abs(tiles[i + 1].x - tiles[i].x) + Math.abs(tiles[i + 1].y - tiles[i].y);
  }
  const cellSpeed = 8; // must match engine.js moveEnemies
  const slowest = Math.min(...composition.enemies.map((entry) => ENEMY_TYPES[entry.type]?.speed || 1));
  floorMs += Math.max(0, enemyCount - 1) * SPAWN_INTERVAL_MS + WAVE_GAP_MS;
  tailMs += (pathCells / (slowest * cellSpeed)) * 1000;
}

console.log('\nMETAGAME — ENGINE-TIMED BODY FLOOR (boss excluded)\n');
console.log(`  Stage 4 Fractal Bastion: ${totalEnemies} enemies / ${FINAL_WAVE - 1} waves`);
console.log(`  spawn-cadence floor: ${fmt(floorMs / 1000)}`);
console.log(`  no-kill traversal upper bound: ${fmt((floorMs + tailMs) / 1000)}\n`);
