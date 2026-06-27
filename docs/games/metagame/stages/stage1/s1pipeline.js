// s1pipeline.js — Stage 1 post-prestige mechanic #1: PIPELINE (unlocked at prestige depth 1).
//
// Wire a BUILDER tier (one with `produces`) so it auto-runs its assembly cycle without a manager —
// routing its output into the tier it feeds — in exchange for an ongoing upkeep cost (like a
// manager's running cost). The decision: wire cheap builders you can't yet afford a manager for, but
// watch the upkeep drain. DETERMINISTIC: cycle progress is counted in game TICKS (state.ticks),
// never wall-clock, so the headless smoke can fast-forward it with __fvStage1.tick(n).

import { fromNumber, sub, toNumber, gte } from './bignum.js';
import { timedProduction } from './s1economy.js';

// Upkeep coefficient: a wired builder costs this fraction of (its base cost × owned) per second.
const PIPE_UPKEEP_COEFF = 0.02;
const TICKS_PER_SEC = 10;   // the main loop ticks every 100 ms

// Builder tiers (have a `produces` chain) are the only wirable ones.
export function wirableTiers(cfg) {
  return (cfg.tiers || []).filter((t) => t.type === 'timed' && t.produces);
}

export function isWired(state, tierId) {
  return Boolean((state.pipelines || {})[tierId]);
}

export function togglePipeline(state, tierId) {
  state.pipelines = state.pipelines || {};
  if (state.pipelines[tierId]) delete state.pipelines[tierId];
  else state.pipelines[tierId] = true;
  return Boolean(state.pipelines[tierId]);
}

// Ongoing upkeep (bits/sec) for one wired tier given current owned count.
export function pipelineUpkeepOf(state, cfg, tierId) {
  if (!isWired(state, tierId)) return 0;
  const t = (cfg.tiers || []).find((x) => x.id === tierId);
  const owned = (state.owned || {})[tierId] || 0;
  if (!t || owned <= 0) return 0;
  return PIPE_UPKEEP_COEFF * toNumber(t.base) * owned;
}

// Total upkeep across all wired tiers (bits/sec).
export function pipelineUpkeep(state, cfg) {
  let total = 0;
  for (const t of wirableTiers(cfg)) total += pipelineUpkeepOf(state, cfg, t.id);
  return total;
}

// Run one game tick of every wired pipeline. Returns true if any production happened (UI repaint).
export function tickPipelines(state, cfg) {
  state.pipelineProgress = state.pipelineProgress || {};
  let produced = false;
  for (const t of wirableTiers(cfg)) {
    if (!isWired(state, t.id)) continue;
    const owned = (state.owned || {})[t.id] || 0;
    if (owned <= 0) continue;
    // Pay upkeep for this tick; if we can't afford it the pipeline stalls (no progress this tick).
    const upkeepTick = fromNumber(pipelineUpkeepOf(state, cfg, t.id) / TICKS_PER_SEC);
    if (!gte(state.bits, upkeepTick)) continue;
    state.bits = sub(state.bits, upkeepTick);
    // Accumulate cycle progress in ticks; one cycle = duration_ms/100 ticks.
    const cycleTicks = Math.max(1, Math.round((t.duration_ms || 4000) / 100));
    const next = (state.pipelineProgress[t.id] || 0) + 1;
    if (next >= cycleTicks) {
      state.pipelineProgress[t.id] = 0;
      const prod = timedProduction(state, cfg, t.id);
      if (prod && prod.amount > 0) {
        state.owned[prod.targetId] = (state.owned[prod.targetId] || 0) + prod.amount;
        produced = true;
      }
    } else {
      state.pipelineProgress[t.id] = next;
    }
  }
  return produced;
}
