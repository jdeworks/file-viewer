// s1prestige.js — Stage 1 prestige depth, post-prestige mechanic unlocks, and the prestige action.
//
// Each Gravitational Pull reset (a "prestige") unlocks ONE new post-prestige mechanic, in order, and
// grants Cores — a permanent cross-run meta-currency (see s1cores.js). Depth = prestiges performed.
// All functions here are pure / deterministic (no Date.now, no Math.random); the caller stamps
// runStartedAt and fires bell/achievements.

import { ZERO, toNumber } from './bignum.js';
import { pullGain, RESET_UNLOCK_BITS } from './s1economy.js';
import { applyCoreStartState, coreGainBonus } from './s1cores.js';

export const MECHANICS = [
  { id: 'pipeline',  depth: 1, icon: '🔌', name: 'Pipeline',
    blurb: 'Wire a builder so it auto-runs — for an ongoing upkeep cost.' },
  { id: 'flux',      depth: 2, icon: '⚡', name: 'Flux',
    blurb: 'A burst meter charges; ride it to 100% for ×3 income, or cash early for ×1.5.' },
  { id: 'entropy',   depth: 3, icon: '🜂', name: 'Entropy',
    blurb: 'Unmanaged tiers decay 1 unit/min (floor 1). Choose what to let rot.' },
  { id: 'echoes',    depth: 4, icon: '👾', name: 'Defrag Echoes',
    blurb: 'A corrupted glyph spawns; click it in time or lose 20% of your bits.' },
  { id: 'resonance', depth: 5, icon: '🎚', name: 'Resonance',
    blurb: 'Hidden tier-ratio sweet spots grant a big bonus. Discover them.' },
];

export function prestigeDepth(state) {
  return Math.max(0, state.prestigeCount || 0);
}

export function mechanicUnlocked(state, id) {
  const m = MECHANICS.find((x) => x.id === id);
  return Boolean(m && prestigeDepth(state) >= m.depth);
}

export function unlockedMechanics(state) {
  return MECHANICS.filter((m) => prestigeDepth(state) >= m.depth);
}

// The mechanic unlocked by the NEXT prestige (for the reset panel's "next unlock" teaser), or null.
export function nextMechanic(state) {
  const nextDepth = prestigeDepth(state) + 1;
  return MECHANICS.find((m) => m.depth === nextDepth) || null;
}

// Cores granted by a prestige: 1 at the unlock point, +1 per extra order of magnitude of totalBits.
// (The Core Dividend upgrade adds a flat per-prestige bonus on top — see doPrestige.)
export function coreGain(totalBitsAtReset) {
  const n = toNumber(totalBitsAtReset);
  const ratio = Math.max(1, n / RESET_UNLOCK_BITS);
  return Math.max(1, 1 + Math.floor(Math.log10(ratio)));
}

// Total Cores a prestige NOW would grant the given state (base scaling + Core Dividend bonus). Used
// by the reset panel's preview so the player sees their dividend pay off.
export function coreGainFor(state) {
  return coreGain(state.totalBits) + coreGainBonus(state);
}

// Perform a prestige: bank the pull factor + cores, bump depth, wipe the run, and re-seed starting
// tiers from owned Cores upgrades. Pure mutation — returns { gain, cores }. The caller stamps
// runStartedAt and fires bell/achievements/render.
export function doPrestige(state) {
  const gain = pullGain(state.totalBits);
  const cores = coreGain(state.totalBits) + coreGainBonus(state);
  state.pullFactors = [...(state.pullFactors || []), gain];
  state.cores = (state.cores || 0) + cores;
  state.prestigeCount = (state.prestigeCount || 0) + 1;
  // Wipe run economy.
  state.bits = ZERO;
  state.totalBits = ZERO;
  state.owned = {};
  state.timedStates = {};
  state.managers = {};
  // Reset per-run mechanic state (the mechanics stay UNLOCKED via prestigeCount).
  state.pipelines = {};
  state.pipelineProgress = {};
  state.flux = { meter: 0, boostMult: 1, boostTicks: 0 };
  state.echo = { active: false, spawnTick: 0, expireTick: 0, lastTick: 0 };
  state.ticks = 0;
  // Re-seed starting tiers from Cores upgrades.
  applyCoreStartState(state);
  return { gain, cores };
}
