// wavegen.js — Stage 4 Fractal Bastion: deterministic procedural wave generation for the campaign.
//
// The five maps total 150 waves — far too many to hand-author. wavegen scales enemy mix and counts
// from (mapIndex, waveNum) with NO randomness (pure formula → identical every run, so the file-tree
// un-cheat and replays stay honest). Authored landmark sub-boss waves (maps.js) are layered on top:
// on a sub-boss wave the composition carries a `subBoss` id plus a reduced escort.
//
// Enemy types unlock by map so the campaign teaches one threat at a time:
//   map0 recursion · map1 +pattern_crawler · map2 +null_packet ·
//   map3 +resonance_ghost +fractal_host · map4 +depth_crawler (everything)

import { mapByIndex, subBossIdForWave } from './maps.js';

// Which enemy types are available on a given map (cumulative).
const UNLOCKS = [
  ['recursion'],
  ['recursion', 'pattern_crawler'],
  ['recursion', 'pattern_crawler', 'null_packet'],
  ['recursion', 'pattern_crawler', 'null_packet', 'resonance_ghost', 'fractal_host'],
  ['recursion', 'pattern_crawler', 'null_packet', 'resonance_ghost', 'fractal_host', 'depth_crawler'],
];

export function mapEnemyPool(mapIndex) {
  const i = Math.max(0, Math.min(UNLOCKS.length - 1, Math.trunc(Number(mapIndex)) || 0));
  return UNLOCKS[i];
}

// Composition for one wave on one map. Returns { enemies: [{type,count}], subBoss: id|null, note? }.
// Deterministic in (mapIndex, waveNum). Counts grow with the wave number and the map index.
export function mapWaveComposition(mapIndex, waveNum) {
  const map = mapByIndex(mapIndex);
  const w = Math.max(1, Math.trunc(Number(waveNum)) || 1);
  const subBoss = subBossIdForWave(mapIndex, w);
  const pool = mapEnemyPool(mapIndex);

  // Overall size budget for the wave: grows roughly linearly with the wave, faster on later maps.
  // Sub-boss waves carry a SMALLER escort (the guardian is the threat).
  const ramp = 5 + Math.floor(w * (1.1 + 0.15 * mapIndex)) + mapIndex * 2;
  const budget = subBoss ? Math.max(4, Math.round(ramp * 0.55)) : ramp;

  // Distribute the budget across the unlocked pool. Earlier (basic) types weight higher early; later
  // (heavier) types phase in as the wave advances. Weights are a pure function of (type, w, map).
  const weights = pool.map((type) => typeWeight(type, w, map.waveCount, mapIndex));
  const total = weights.reduce((s, x) => s + x, 0) || 1;
  const enemies = [];
  let assigned = 0;
  pool.forEach((type, idx) => {
    // Fractal hosts / depth crawlers are expensive — divide their share so we don't field a swarm.
    const heavyDiv = type === 'fractal_host' ? 6 : type === 'depth_crawler' ? 10 : 1;
    let count = Math.round((budget * weights[idx]) / total / heavyDiv);
    if (idx === pool.length - 1) count = Math.max(count, 0);
    if (count > 0) { enemies.push({ type, count }); assigned += count; }
  });
  // Guarantee at least one basic enemy on a non-sub-boss wave so the wave is never empty.
  if (!subBoss && assigned === 0) enemies.push({ type: 'recursion', count: Math.max(3, Math.round(budget / 2)) });

  const comp = { enemies, subBoss: subBoss || null, leftFraction: null };
  if (subBoss) comp.note = 'a guardian holds the line';
  return comp;
}

// Total non-sub-boss enemy count for a wave (spawn-queue / bookkeeping; sub-boss adds one more).
export function mapWaveEnemyCount(mapIndex, waveNum) {
  return mapWaveComposition(mapIndex, waveNum).enemies.reduce((s, e) => s + e.count, 0);
}

// ── internals ────────────────────────────────────────────────────────────────────────────────────

// Relative weight of a type at wave `w` of a `waveCount`-wave map. Basic types dominate early; heavier
// types phase in by progress p = w / waveCount. Pure (no RNG).
function typeWeight(type, w, waveCount, mapIndex) {
  const p = Math.min(1, w / Math.max(1, waveCount));
  switch (type) {
    case 'recursion':       return 6 - 3 * p;            // always present, fades a bit late
    case 'pattern_crawler': return 1 + 4 * p;            // ramps up
    case 'null_packet':     return 1 + 3 * p;
    case 'resonance_ghost': return p > 0.25 ? 1 + 3 * p : 0.2;
    case 'fractal_host':    return p > 0.4 ? 1 + 2 * p : 0.1;
    case 'depth_crawler':   return p > 0.6 ? 1 + 2 * p : 0.05;
    default:                return 1;
  }
}
