// wavegen.js — Stage 4 Fractal Bastion: deterministic procedural wave generation for the campaign.
//
// The five maps total 90 waves — too many to hand-author. wavegen scales enemy mix, counts AND HP
// from (mapIndex, waveNum) with NO randomness (pure formula → identical every run, so replays stay
// honest). Authored landmark sub-boss waves (maps.js) are layered on top:
// on a sub-boss wave the composition carries a `subBoss` id plus a reduced escort.
//
// LENGTH REBALANCE (round 4): the campaign was cut 150→90 waves. To stop the shorter campaign going
// hollow, the count ramp is steeper (per-wave counts on the late maps match the old 150-wave peaks)
// and every wave carries an `hpScale` that grows with the wave + map — so each enemy is tankier on the
// deep maps and the climax HITS HARDER than the old campaign even though there are fewer waves. The
// engine applies hpScale to spawned trash (sub-bosses keep their authored HP).
//
// Enemy types unlock by map so the campaign teaches one threat at a time:
//   map0 recursion · map1 +pattern_crawler · map2 +null_packet ·
//   map3 +resonance_ghost +fractal_host · map4 +depth_crawler (everything)

import { mapByIndex, subBossIdForWave } from './maps.js';

// Per-type count divisor used when distributing a wave's budget. >1 = field fewer (expensive/tanky);
// <1 = field more (cheap swarm). Anything not listed defaults to 1.
const COUNT_DIV = {
  swarm_bit: 0.4, fractal_host: 6, depth_crawler: 10, armored_loop: 3, shield_drone: 2.5,
  healer_node: 6, regenerator: 3, flicker_ghost: 2.5, burrower: 3,
};

// Which enemy types are available on a given map (cumulative). The expanded roster phases the new
// threat archetypes in by map so each teaches one MATCH: swarm → armor/shield → heal/regen → phase/burrow.
const UNLOCKS = [
  ['recursion'],
  ['recursion', 'pattern_crawler', 'swarm_bit'],
  ['recursion', 'pattern_crawler', 'null_packet', 'swarm_bit', 'armored_loop', 'shield_drone'],
  ['recursion', 'pattern_crawler', 'null_packet', 'resonance_ghost', 'fractal_host', 'swarm_bit', 'armored_loop', 'shield_drone', 'healer_node', 'regenerator'],
  ['recursion', 'pattern_crawler', 'null_packet', 'resonance_ghost', 'fractal_host', 'depth_crawler', 'swarm_bit', 'armored_loop', 'shield_drone', 'healer_node', 'regenerator', 'flicker_ghost', 'burrower'],
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
  // Steeper than the old 150-wave campaign (rebalance) so the now-shorter maps keep their density —
  // late-map waves field as many enemies as the old peaks. Sub-boss waves carry a SMALLER escort.
  const ramp = 6 + Math.floor(w * (1.5 + 0.35 * mapIndex)) + mapIndex * 3;
  const budget = subBoss ? Math.max(4, Math.round(ramp * 0.55)) : ramp;

  // Distribute the budget across the unlocked pool. Earlier (basic) types weight higher early; later
  // (heavier) types phase in as the wave advances. Weights are a pure function of (type, w, map).
  const weights = pool.map((type) => typeWeight(type, w, map.waveCount, mapIndex));
  const total = weights.reduce((s, x) => s + x, 0) || 1;
  const enemies = [];
  let assigned = 0;
  pool.forEach((type, idx) => {
    // Per-type count divisor: heavies field FEWER (div>1); swarm_bit fields MORE (div<1).
    const heavyDiv = COUNT_DIV[type] || 1;
    let count = Math.round((budget * weights[idx]) / total / heavyDiv);
    if (idx === pool.length - 1) count = Math.max(count, 0);
    if (count > 0) { enemies.push({ type, count }); assigned += count; }
  });
  // Guarantee at least one basic enemy on a non-sub-boss wave so the wave is never empty.
  if (!subBoss && assigned === 0) enemies.push({ type: 'recursion', count: Math.max(3, Math.round(budget / 2)) });

  const comp = { enemies, subBoss: subBoss || null, leftFraction: null, hpScale: waveHpScale(w, mapIndex) };
  if (subBoss) comp.note = 'a guardian holds the line';
  return comp;
}

// Per-wave enemy-HP multiplier (the rebalance's difficulty-compensation lever). Grows with the wave
// within a map and with the map index across the campaign, so the shorter campaign's late waves field
// genuinely tankier enemies — intensity comes from durability, not only spawn-queue length. Pure +
// deterministic; map 0 wave 1 = 1.0 (onboarding stays gentle). Applied by engine.spawnDueEnemies.
export function waveHpScale(waveNum, mapIndex) {
  const w = Math.max(1, Math.trunc(Number(waveNum)) || 1);
  const mi = Math.max(0, Math.trunc(Number(mapIndex)) || 0);
  return 1 + 0.03 * (w - 1) + 0.08 * mi;
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
    // expanded roster — each phases in as a wave progresses
    case 'swarm_bit':       return 2 + 4 * p;             // cheap filler, always plentiful
    case 'armored_loop':    return p > 0.3 ? 1 + 2 * p : 0.1;
    case 'shield_drone':    return p > 0.3 ? 1 + 2 * p : 0.1;
    case 'healer_node':     return p > 0.4 ? 0.6 + p : 0.05;
    case 'regenerator':     return p > 0.4 ? 1 + 1.5 * p : 0.05;
    case 'flicker_ghost':   return p > 0.5 ? 1 + 2 * p : 0.05;
    case 'burrower':        return p > 0.5 ? 1 + 1.5 * p : 0.05;
    default:                return 1;
  }
}
