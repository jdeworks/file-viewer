// resources.js — Stage 8 Entropy Field: the SCRAP + INSIGHT economies (pure, deterministic, no DOM).
//
// Beyond States (the live currency) the field accrues two meta-resources that feed the tech tree and
// placeable structures:
//   • SCRAP — refined from ARCHIVED debris (tier-scaled). It is therefore downstream of the
//     load-bearing drag-drop archive un-cheat: you only get Scrap from wreckage you actually moved
//     into /entropy/active_archive/. boss.js calls scrapYield on each archive.
//   • INSIGHT — analysis output from online research-capable nodes each cycle (Core + Production read
//     the field), plus a lump-sum award for surviving a Cascade Storm (storms.js). engine.js adds the
//     per-cycle income; storms award the survival bonus.
// Both are plain numeric state fields with lifetime totals + a per-cycle rate for the HUD (rates are
// the genre convention). Nothing here touches rng — Scrap value comes from the debris (already rolled
// deterministically at creation), Insight is a pure function of node statuses.

import { nodeById } from "./nodes.js";

// Per-cycle insight a single online node contributes, by zone, scaled by status. Cores and Production
// nodes "read" the field (research); mid/frontier contribute nothing.
const ZONE_INSIGHT = { core: 0.6, production: 0.45, mid: 0, frontier: 0 };

// Scrap refined when a debris file is archived. Higher tiers (deeper-zone wreckage) refine richer.
export function scrapYield(debris) {
  const tier = Math.max(1, Number(debris?.tier || 1));
  const value = Math.max(0, Number(debris?.value || 0));
  return tier * 2 + Math.floor(value / 8);
}

// Insight produced this cycle from the live node statuses. `isOnline` excludes not-yet-online sectors.
export function insightIncome(state, statusOf, isOnline = () => true) {
  let income = 0;
  for (const n of state.nodes) {
    if (!isOnline(n)) continue;
    const s = statusOf(n.health);
    if (s === "failed") continue;
    const def = nodeById(n.id) || {};
    const base = ZONE_INSIGHT[def.zone] || 0;
    income += s === "degrading" ? base * 0.5 : base;
  }
  return round2(income);
}

// Credit scrap (with lifetime total). Returns the new balance.
export function earnScrap(state, amount) {
  const n = Math.max(0, Math.floor(Number(amount) || 0));
  state.scrap = Math.max(0, Number(state.scrap || 0)) + n;
  state.scrapTotal = Number(state.scrapTotal || 0) + n;
  return state.scrap;
}

// Credit insight (with lifetime total). Returns the new balance.
export function earnInsight(state, amount) {
  const n = Math.max(0, Number(amount) || 0);
  state.insight = Math.max(0, Number(state.insight || 0)) + n;
  state.insightTotal = Number(state.insightTotal || 0) + n;
  return state.insight;
}

// Spend helpers (validated; used by tech.js / structures.js). Return true on success.
export function spendScrap(state, cost) {
  const c = Math.max(0, Math.floor(Number(cost) || 0));
  if ((Number(state.scrap || 0)) < c) return false;
  state.scrap = Number(state.scrap || 0) - c;
  return true;
}

export function spendInsight(state, cost) {
  const c = Math.max(0, Number(cost) || 0);
  if ((Number(state.insight || 0)) < c) return false;
  state.insight = Number(state.insight || 0) - c;
  return true;
}

function round2(v) {
  return Math.round(v * 100) / 100;
}
