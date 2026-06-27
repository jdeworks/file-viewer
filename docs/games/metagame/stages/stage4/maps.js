// maps.js — Stage 4 Fractal Bastion: the 5-map campaign definitions (pure data + tiny helpers).
//
// The bastion is no longer one 31-wave map. It is a campaign of five maps of growing length
// (5 / 10 / 20 / 45 / 70 waves), each with its own theme, L-system path depth, and authored
// sub-boss "guardian" waves at the ends of its arcs. run4.js gates map N+1 behind clearing N, and
// The Infinite Loop boss is reachable ONLY after all five maps are cleared. Long maps are filled by
// wavegen.js (deterministic procedural scaling) so we don't hand-author 150 waves — only the
// landmark sub-boss waves are authored here.

// Each map: { id, name, theme, waveCount, depth (L-system path depth 1–3), subBosses: {wave: id},
//   startCycles, startIntegrity, glyph }. `depth` drives lsystem.buildPath so each map's path differs.
export const MAPS = [
  {
    id: 'outer-shell', name: 'Outer Shell', glyph: '◇',
    theme: 'the thin perimeter where the recursion first leaks in',
    waveCount: 5, depth: 1, startCycles: 240, startIntegrity: 100,
    subBosses: { 5: 'shell-warden' },
  },
  {
    id: 'recursion-halls', name: 'Recursion Halls', glyph: '◆',
    theme: 'corridors that repeat the corridor you just left',
    waveCount: 10, depth: 1, startCycles: 280, startIntegrity: 100,
    subBosses: { 5: 'echo-sentinel', 10: 'hall-keeper' },
  },
  {
    id: 'fractal-atrium', name: 'Fractal Atrium', glyph: '✦',
    theme: 'an open court that folds back on itself at the edges',
    waveCount: 20, depth: 2, startCycles: 340, startIntegrity: 110,
    subBosses: { 10: 'mirror-prefect', 20: 'atrium-regent' },
  },
  {
    id: 'depth-cascade', name: 'Depth Cascade', glyph: '❈',
    theme: 'a stairwell that descends faster than you climb it',
    waveCount: 45, depth: 2, startCycles: 420, startIntegrity: 120,
    subBosses: { 15: 'cascade-anchor', 30: 'descent-marshal', 45: 'cascade-sovereign' },
  },
  {
    id: 'infinite-approach', name: 'Infinite Approach', glyph: '∞',
    theme: 'the last span before the loop — it never quite arrives',
    waveCount: 70, depth: 3, startCycles: 520, startIntegrity: 140,
    subBosses: { 20: 'approach-vanguard', 40: 'event-horizon', 60: 'penultimate-knot', 70: 'final-bastion' },
  },
];

export const MAP_COUNT = MAPS.length;

export function mapByIndex(index) {
  const i = Math.max(0, Math.min(MAP_COUNT - 1, Math.trunc(Number(index)) || 0));
  return MAPS[i];
}

// The L-system path seed for a map: the run's pointSetId plus the map index so each map's path is a
// distinct (but deterministic) fold of the same recursion.
export function mapPathSeed(pointSetId, mapIndex) {
  return `${pointSetId || 'x'}-m${Math.max(0, Math.trunc(Number(mapIndex)) || 0)}`;
}

// Is `waveNum` a sub-boss (guardian) wave on this map? Returns the sub-boss id or null.
export function subBossIdForWave(mapIndex, waveNum) {
  const map = mapByIndex(mapIndex);
  return map.subBosses?.[Math.trunc(Number(waveNum)) || 0] || null;
}

// Total enemy "presence" budget across a map's waves (for the campaign progress UI / playtime).
export function mapWaveCount(mapIndex) {
  return mapByIndex(mapIndex).waveCount;
}
