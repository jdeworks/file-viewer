// prestige.js — Stage 8 Entropy Field: the MICROSTATE prestige loop (pure, deterministic, no DOM).
//
// Once the field has been cleared once (meta.firstClearComplete), the player can COLLAPSE the current
// field into a Microstate: it banks permanent Microstate Cores (scaled by the run's depth — cumulative
// States earned + storms survived), then resets the field FRESH for another, faster run. Each Core
// adds a permanent multiplier to States + Insight income (prestigeMult), so replays climb faster and
// deeper. Cores + the collapse level live in meta and survive every reset. This is the optional
// depth layer (the stage is already BEATEN on first clear — collapse is pure replay reward).

import { freshSectorNodes } from "./nodes.js";

export const CORE_PER_STATES = 400;   // cumulative States earned per Core
export const MULT_PER_CORE = 0.08;    // +8% income per Core

// The permanent income multiplier granted by `cores` Microstate Cores.
export function prestigeMultFor(cores) {
  return 1 + MULT_PER_CORE * Math.max(0, Math.floor(Number(cores) || 0));
}

// Cores a collapse RIGHT NOW would bank (depth reward: cumulative reserves + storms weathered).
export function coresPreview(state) {
  const fromStates = Math.floor(Number(state.totalStatesEarned || 0) / CORE_PER_STATES);
  const fromStorms = Number(state.stormsSurvived || 0);
  return Math.max(0, fromStates + fromStorms);
}

// Collapse is available only after the field has been cleared at least once, and only if it would
// actually bank a Core (so it can't be spammed for nothing).
export function prestigeAvailable(state) {
  if (!state.meta || !state.meta.firstClearComplete) return { ok: false, reason: "not-cleared" };
  const cores = coresPreview(state);
  if (cores < 1) return { ok: false, reason: "too-shallow", cores };
  return { ok: true, cores };
}

// Collapse the field into a Microstate: bank Cores, bump the collapse level, reset the run FRESH while
// preserving meta (cores/level/first-clear/bts) and the recomputed prestigeMult. Mutates `state`.
export function microstateCollapse(state) {
  const avail = prestigeAvailable(state);
  if (!avail.ok) return { ok: false, reason: avail.reason };
  const meta = state.meta || {};
  const totalCores = Number(meta.cores || 0) + avail.cores;
  const collapseLevel = Number(meta.collapseLevel || 0) + 1;
  resetField(state, { cores: totalCores, collapseLevel });
  return { ok: true, coresAwarded: avail.cores, totalCores, collapseLevel, mult: state.prestigeMult };
}

// Reset the live field to a brand-new run, carrying forward the prestige meta. Kept here (not state.js)
// so the prestige concern stays in one module; uses the core sector for the fresh boot.
function resetField(state, carry) {
  const cores = Math.max(0, Math.floor(Number(carry.cores) || 0));
  state.cycle = 1;
  state.act = 1;
  state.onlineSectors = ["core"];
  state.stormsSurvived = 0;
  state.pendingStorm = null;
  state.activeStorm = null;
  state.nodes = freshSectorNodes("core");
  state.states = 0;
  state.totalStatesEarned = 0;
  state.salvageTotal = 0;
  state.scrap = 0;
  state.insight = 0;
  state.insightRate = 0;
  state.heat = 0;
  state.heatRate = 0;
  state.entropy = 0;
  state.repairUnits = 6;
  state.repairAllocations = {};
  state.stabilized = {};
  state.highLoad = {};
  state.stabilizers = 0;
  state.debris = [];
  state.archive = [];
  state.selectedDebrisId = "";
  state.pendingEvent = null;
  state.activeEvent = null;
  state.warningCheckpoint = null;
  state.boss = { reached: false, defeated: false, attempts: 0, lockHintStep: 0, firstFailureRewound: false, burn: null };
  state.meta = { ...(state.meta || {}), cores, collapseLevel: carry.collapseLevel };
  state.prestigeMult = prestigeMultFor(cores);
  // tech, structures, manualArchiveDone and their bonuses PERSIST across collapses (permanent progress)
  state.log = [`microstate collapse ${carry.collapseLevel}. ${cores} Cores banked — income ×${state.prestigeMult.toFixed(2)}.`];
}
