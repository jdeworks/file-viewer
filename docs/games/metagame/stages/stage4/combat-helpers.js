// combat-helpers.js — Stage 4 Fractal Bastion: PURE helpers for the combat UI (no DOM).
//
// Three concerns the renderer leans on, factored out so ui-combat.js stays lean and these stay unit-
// testable in isolation:
//   1. Progressive tower unlock — the shop drips towers in by campaign map so onboarding isn't a wall
//      of 14 buttons on wave 1 (research §3: one new verb per group; MATCH taught one tool at a time).
//   2. Reshape fallout — when the L-system path folds deeper between wave groups, any tower now standing
//      ON the new road is refunded (towers never MOVE — research: the player re-places around the fold).
//   3. Pre-wave ANTICIPATE hint — what's incoming + whether the path reshapes after this wave, so the
//      player places for the fold to come rather than only for the path in front of them.
// All deterministic: no RNG, no clock.

import { TOWER_TYPES } from './towers.js';
import { mapPathDepth } from './lsystem.js';
import { mapByIndex, subBossIdForWave } from './maps.js';
import { mapWaveComposition } from './wavegen.js';
import { subBossDef } from './subboss.js';

// Earliest campaign map (0-based) on which each tower appears in the shop. Drip: 5 → 8 → 11 → 14 towers
// as the player advances, matching the enemy-archetype unlock cadence (wavegen UNLOCKS) so each new
// tower answers a freshly-introduced threat (MATCH). The boss arena ignores this (all towers available).
export const TOWER_UNLOCK_MAP = {
  pulse_node: 0, cycle_extractor: 0, scatter_array: 0, null_spike: 0, attractor_field: 0,
  frost_lattice: 1, thermal_loop: 1, shatter_drill: 1,
  chain_resonator: 2, resonance_hub: 2, gravity_well: 2,
  long_recursor: 3, glyph_mortar: 3, bank_node: 3,
};

// The subset of `placeable` unlocked by the given campaign map index (boss mode passes everything).
export function availableTowers(placeable, mapIndex) {
  const idx = Math.max(0, Math.trunc(Number(mapIndex)) || 0);
  return placeable.filter((type) => (TOWER_UNLOCK_MAP[type] ?? 0) <= idx);
}

// The first map index that unlocks `type` (for shop tooltips / locked-row copy if ever surfaced).
export function towerUnlockMap(type) {
  return TOWER_UNLOCK_MAP[type] ?? 0;
}

// REPAIR-verb sell preview: 70% of total invested (base × 2^(level-1)) — matches upgrades.sellTower.
export function sellValue(tower) {
  const base = TOWER_TYPES[tower?.type]?.cost || 0;
  return Math.floor(base * Math.pow(2, (tower?.level || 1) - 1) * 0.7);
}

// Remove every tower whose cell now sits ON the (reshaped) path and refund its FULL invested cost —
// the displacement is forced by the game (not a player sell), so no 30% haircut. Mutates state.towers
// and state.cycles. Returns { count, refund } so the caller can telegraph the change. Deterministic.
export function refundTowersOnPath(state, tiles) {
  const onPath = new Set((tiles || []).map((t) => `${t.x},${t.y}`));
  const kept = [];
  let count = 0;
  let refund = 0;
  for (const tower of state.towers || []) {
    if (!onPath.has(`${tower.x},${tower.y}`)) { kept.push(tower); continue; }
    const base = TOWER_TYPES[tower.type]?.cost || 0;
    refund += Math.floor(base * Math.pow(2, (tower.level || 1) - 1));
    count += 1;
  }
  if (count) { state.towers = kept; state.cycles = (state.cycles || 0) + refund; }
  return { count, refund };
}

// Will the path FOLD DEEPER after the wave the player is about to start? (Used to telegraph ANTICIPATE.)
export function reshapesAfter(mapIndex, waveNumber) {
  const map = mapByIndex(mapIndex);
  const w = Math.max(1, Math.trunc(Number(waveNumber)) || 1);
  if (w >= map.waveCount) return false;
  return mapPathDepth(map.depth, w + 1) > mapPathDepth(map.depth, w);
}

// Pre-wave ANTICIPATE line: incoming composition + guardian telegraph + a reshape warning when the next
// wave folds the path. Shown while the wave is NOT active so the player can place for what's coming.
export function preWaveHint(mapIndex, waveNumber) {
  const w = Math.max(1, Math.trunc(Number(waveNumber)) || 1);
  const comp = mapWaveComposition(mapIndex, w);
  const parts = [];
  const sbId = subBossIdForWave(mapIndex, w);
  if (sbId) { const d = subBossDef(sbId); if (d) parts.push(`${d.glyph} ${d.name} — ${d.telegraph}`); }
  const summary = (comp.enemies || []).map((e) => `${e.count}×${e.type}`).join(', ');
  parts.push(summary ? `wave ${w} incoming: ${summary}` : `wave ${w} incoming`);
  if (reshapesAfter(mapIndex, w)) parts.push('⚠ the path reshapes after this wave — place for the fold to come');
  parts.push('place towers, then start the wave');
  return parts.join('  ·  ');
}
