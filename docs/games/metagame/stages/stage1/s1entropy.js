// s1entropy.js — Stage 1 post-prestige mechanic #3: ENTROPY (unlocked at prestige depth 3).
//
// Unmanaged timed tiers decay: every game-minute each loses 1 unit (floor 1) UNLESS it is protected
// by an active manager or a wired Pipeline. Forces a real choice about what to let rot vs. defend.
// DETERMINISTIC: decay cadence is counted in game TICKS (state.ticks), never wall-clock.

const ENTROPY_PERIOD = 600;   // 600 ticks × 100 ms = 1 minute

// Tiers subject to decay: the timed builder/payout tiers (the ones a manager or pipeline can hold).
export function decayableTiers(cfg) {
  return (cfg.tiers || []).filter((t) => t.type === 'timed');
}

// A tier is protected from decay by an active (hired, leveled, non-paused) manager OR a wired pipeline.
export function isProtected(state, cfg, tierId) {
  if ((state.pipelines || {})[tierId]) return true;
  const mgr = (cfg.managers || []).find((m) => m.manages === tierId);
  if (!mgr) return false;
  const ms = (state.managers || {})[mgr.id];
  return Boolean(ms && ms.level >= 1 && !ms.paused);
}

// Advance one tick. On each minute boundary, decay every unprotected decayable tier (floor 1).
// Returns true if anything decayed (so the UI repaints).
export function tickEntropy(state, cfg) {
  if ((state.ticks || 0) % ENTROPY_PERIOD !== 0) return false;
  let decayed = false;
  state.owned = state.owned || {};
  for (const t of decayableTiers(cfg)) {
    const owned = state.owned[t.id] || 0;
    if (owned > 1 && !isProtected(state, cfg, t.id)) {
      state.owned[t.id] = owned - 1;
      decayed = true;
    }
  }
  return decayed;
}
