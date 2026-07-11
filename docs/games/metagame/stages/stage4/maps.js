// maps.js — Stage 4 Fractal Bastion: the 5-map campaign definitions (pure data + tiny helpers).
//
// The bastion is no longer one 31-wave map. It is a campaign of five maps of growing length
// (5 / 10 / 15 / 25 / 35 waves = 90 total), each with its own theme, L-system path depth, and
// authored sub-boss "guardian" waves at the ends of its arcs. run4.js gates map N+1 behind clearing N,
// and The Infinite Loop boss is reachable ONLY after all five maps are cleared. Long maps are filled
// by wavegen.js (deterministic procedural scaling) so we don't hand-author 90 waves — only the
// landmark sub-boss waves are authored here.
//
// LENGTH REBALANCE (round 4): the campaign was 150 waves (≈2–4h, far over the 40–120m target). It is
// now 90 waves (≈90–100m realistic). To keep the campaign from going hollow, wavegen.js boosts the
// per-wave count ramp (peak waves stay as dense as the old 150-wave campaign's) AND scales enemy HP up
// with the wave + map (hpScale), so the shorter campaign hits HARDER per wave, not softer. The path
// reshape boundaries (waves 11/21, lsystem.waveGroupDepth) are unchanged: every multi-depth map still
// reaches them — depth-2 maps fold once at wave 11 (atrium 15w, cascade 25w), the depth-3 map folds at
// 11 AND 21 (approach 35w).

// Each map: { id, name, theme, waveCount, depth (L-system path depth 1–3), subBosses: {wave: id},
//   startCycles, startIntegrity, glyph }. `depth` drives lsystem.buildPath so each map's path differs.
//
// startCycles doubled (2026-07-11 playtest fix): a real, cost-respecting simulation (placeTower/
// upgradeTower under real cycle constraints, not the fortify() test helper which injects a maxed
// army for free) showed the ORIGINAL numbers below failed even the tutorial map (Outer Shell) by
// wave 4/5 with a simple, non-optimal single-tower-type defense — the existing winnable.test.mjs
// only ever proved the combat math CAN clear hard waves given an already-maxed board, never that a
// player could actually AFFORD to build one. Doubling every map's startCycles clears Outer Shell
// with a real (not razor-thin) ~60% integrity margin under that same simple strategy; see
// tests/economy.test.mjs. Deeper maps weren't individually re-tuned beyond this proportional scale —
// a real player diversifying tower types (armor/shield counters) does meaningfully better than the
// single-tower-type bot used to validate this, and the existing fortify()-based winnable.test.mjs
// already independently proves the late-game numbers support a real winning strategy.
export const MAPS = [
  {
    id: 'outer-shell', name: 'Outer Shell', glyph: '◇',
    theme: 'the thin perimeter where the recursion first leaks in',
    waveCount: 5, depth: 1, startCycles: 480, startIntegrity: 100,
    subBosses: { 5: 'shell-warden' },
  },
  {
    id: 'recursion-halls', name: 'Recursion Halls', glyph: '◆',
    theme: 'corridors that repeat the corridor you just left',
    waveCount: 10, depth: 1, startCycles: 560, startIntegrity: 100,
    subBosses: { 5: 'echo-sentinel', 10: 'hall-keeper' },
  },
  {
    id: 'fractal-atrium', name: 'Fractal Atrium', glyph: '✦',
    theme: 'an open court that folds back on itself at the edges',
    waveCount: 15, depth: 2, startCycles: 680, startIntegrity: 110,
    subBosses: { 8: 'mirror-prefect', 15: 'atrium-regent' },
  },
  {
    id: 'depth-cascade', name: 'Depth Cascade', glyph: '❈',
    theme: 'a stairwell that descends faster than you climb it',
    waveCount: 25, depth: 2, startCycles: 840, startIntegrity: 120,
    subBosses: { 10: 'cascade-anchor', 18: 'descent-marshal', 25: 'cascade-sovereign' },
  },
  {
    id: 'infinite-approach', name: 'Infinite Approach', glyph: '∞',
    theme: 'the last span before the loop — it never quite arrives',
    waveCount: 35, depth: 3, startCycles: 1040, startIntegrity: 140,
    subBosses: { 10: 'approach-vanguard', 20: 'event-horizon', 30: 'penultimate-knot', 35: 'final-bastion' },
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
