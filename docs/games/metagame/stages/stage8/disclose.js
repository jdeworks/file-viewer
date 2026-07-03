// disclose.js — Stage 8 Entropy Field: ACT-GATED PROGRESSIVE DISCLOSURE (UX-audit 2026-07, M1).
//
// Pure, display-only, engine-untouched. computeDisclosure(state) returns which systems' UI should be
// visible RIGHT NOW. A system is shown when either (a) it has already been revealed once (the persisted
// state.disclosed flag — additive, never regressed), (b) the player is a "veteran" (deep enough that a
// LOADED save must not hide systems it clearly earned), or (c) the system's first-relevance condition
// is met (derived from live state — the trigger that reveals it during fresh play).
//
// Fresh cycle-1 save: every derived condition is false and the player is not a veteran → ONLY the node
// list + repair charges + entropy + the command bar show (all four gated systems below stay hidden).
// The renderer diffs this against state.disclosed to fire a one-time arrival banner per newly-shown
// system, and seeds state.disclosed silently on mount so a loaded veteran save fires no banners.

// A player is a VETERAN once the run is unambiguously past act 1 — a survived storm, a boss attempt, a
// prior clear, or simply a high cycle. This is the "never regress a save" safety: such a save shows
// everything at once. It is deliberately NOT keyed off resources (parts/States go non-zero on cycle 1,
// which would collapse the whole reveal into the first advance).
export function isVeteran(state) {
  return Number(state.stormsSurvived || 0) > 0
    || Number(state.cycle || 1) >= 8
    || Boolean(state.boss?.reached)
    || Boolean(state.meta?.firstClearComplete);
}

// The disclosure keys, in the order the renderer prefers to banner them when several flip at once.
export const DISCLOSE_ORDER = ["states", "debris", "parts", "structures", "heat", "storm", "boss", "prestige"];

// Which systems are visible for this state. tech shares the `parts` reveal (first salvage income).
export function computeDisclosure(state) {
  const d = state.disclosed && typeof state.disclosed === "object" ? state.disclosed : {};
  const vet = isVeteran(state);
  const on = (key, cond) => Boolean(d[key]) || vet || Boolean(cond);
  return {
    states: on("states", Number(state.totalStatesEarned || 0) > 0),
    debris: on("debris", (state.debris?.length || 0) > 0 || (state.archive?.length || 0) > 0
      || Boolean(state.manualArchiveDone) || Number(state.salvageTotal || 0) > 0),
    heat: on("heat", Number(state.heat || 0) > 0 || Number(state.heatRate || 0) !== 0),
    parts: on("parts", Number(state.parts || 0) > 0 || Number(state.partsTotal || 0) > 0),
    structures: on("structures", Object.keys(state.tech || {}).length > 0),
    storm: on("storm", (state.announcedStorms?.length || 0) > 0 || Boolean(state.activeStorm)
      || Number(state.stormsSurvived || 0) > 0),
    boss: on("boss", Number(state.stormsSurvived || 0) > 0),
    prestige: on("prestige", Boolean(state.boss?.reached) || Number(state.boss?.attempts || 0) > 0
      || Boolean(state.meta?.firstClearComplete))
  };
}
