// s1resonance.js — Stage 1 post-prestige mechanic #5: RESONANCE (unlocked at prestige depth 5).
//
// Hidden tier-ratio sweet spots: hold two adjacent tiers within a target count ratio and both
// "resonate" for a global income bonus. A discovery/optimization meta-puzzle — the bands are not
// spelled out until found. Pure / deterministic (reads owned counts only).

export const RESONANCE_BANDS = [
  { id: 'box-boost',     hi: 's1-box',     lo: 's1-boost',   min: 2, max: 4, bonus: 0.30,
    hint: 'Bit Boxes per Signal Booster' },
  { id: 'boost-cluster', hi: 's1-boost',   lo: 's1-cluster', min: 2, max: 4, bonus: 0.25,
    hint: 'Signal Boosters per Core Cluster' },
  { id: 'cluster-array', hi: 's1-cluster', lo: 's1-array',   min: 2, max: 4, bonus: 0.20,
    hint: 'Core Clusters per Processing Array' },
];

function bandActive(state, band) {
  const owned = state.owned || {};
  const hi = owned[band.hi] || 0;
  const lo = owned[band.lo] || 0;
  if (lo < 1 || hi < 1) return false;
  const ratio = hi / lo;
  return ratio >= band.min && ratio <= band.max;
}

export function activeBands(state) {
  return RESONANCE_BANDS.filter((b) => bandActive(state, b));
}

// Product of all active band bonuses (1 when none).
export function resonanceMult(state) {
  let m = 1;
  for (const b of RESONANCE_BANDS) if (bandActive(state, b)) m *= 1 + b.bonus;
  return m;
}

// Record any newly-active band as "discovered" (for the UI). Returns true if a new one was found.
export function tickResonance(state) {
  state.resonanceFound = state.resonanceFound || {};
  let found = false;
  for (const b of RESONANCE_BANDS) {
    if (bandActive(state, b) && !state.resonanceFound[b.id]) {
      state.resonanceFound[b.id] = true;
      found = true;
    }
  }
  return found;
}
