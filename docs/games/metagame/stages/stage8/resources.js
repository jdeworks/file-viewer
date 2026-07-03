// resources.js — Stage 8 Entropy Field: the SALVAGE PARTS economy (single merged currency, pure,
// deterministic, no DOM).
//
// UX-audit 2026-07 (approved OPTION): the old DUAL economy is unified into ONE currency —
// "salvage parts" (state.parts) — that BOTH the tech tree AND the placeable structures spend. The
// merge cuts a counter + a mental exchange rate; the build-vs-research tension is intentionally folded
// into a single "what do I spend parts on" decision. Mapping (balance-neutral):
//   • every income that fed the old Scrap (refined from ARCHIVED debris — downstream of the load-
//     bearing archive un-cheat) OR the old Insight (per-cycle research output of Core/Production/
//     Research nodes + a Cascade-Storm survival windfall) now feeds PARTS instead. Same rates, one pool.
//   • every cost that was (insight + scrap) is SUMMED into a single parts price (tech.js/structures.js).
// Because both incomes and both costs are summed, the economy stays roughly balance-neutral. Save
// migration is additive (state.js): parts += scrap + insight. Nothing here touches rng — parts refined
// from debris come from the debris value (rolled deterministically at creation); the per-cycle income
// is a pure function of node statuses.

import { nodeById } from "./nodes.js";

// Per-cycle parts a single online node contributes, by zone, scaled by status. Cores and Production
// nodes "read" the field (research); Research labs do the most; mid/frontier contribute nothing.
const ZONE_PARTS = { core: 0.6, production: 0.45, research: 1.4, mid: 0, frontier: 0, coolant: 0 };

// Parts refined when a debris file is archived. Higher tiers (deeper-zone wreckage) refine richer.
export function partsYield(debris) {
  const tier = Math.max(1, Number(debris?.tier || 1));
  const value = Math.max(0, Number(debris?.value || 0));
  return tier * 2 + Math.floor(value / 8);
}

// Parts produced this cycle from the live node statuses. `isOnline` excludes not-yet-online sectors.
export function partsIncome(state, statusOf, isOnline = () => true) {
  let income = 0;
  for (const n of state.nodes) {
    if (!isOnline(n)) continue;
    const s = statusOf(n.health);
    if (s === "failed") continue;
    const def = nodeById(n.id) || {};
    const base = ZONE_PARTS[def.zone] || 0;
    income += s === "degrading" ? base * 0.5 : base;
  }
  return round2(income);
}

// Credit parts (with lifetime total). Returns the new balance.
export function earnParts(state, amount) {
  const n = Math.max(0, Number(amount) || 0);
  state.parts = Math.max(0, Number(state.parts || 0)) + n;
  state.partsTotal = Number(state.partsTotal || 0) + n;
  return state.parts;
}

// Spend helper (validated; used by tech.js / structures.js). Returns true on success.
export function spendParts(state, cost) {
  const c = Math.max(0, Math.floor(Number(cost) || 0));
  if ((Number(state.parts || 0)) < c) return false;
  state.parts = Number(state.parts || 0) - c;
  return true;
}

function round2(v) {
  return Math.round(v * 100) / 100;
}
