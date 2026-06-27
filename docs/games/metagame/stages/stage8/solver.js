// solver.js — Stage 8 deterministic fast-forward solvers (TEST/DEBUG, exposed via window.__fvStage8).
//
// driveToGate plays the REAL multi-act survival sim forward: it repairs the spine (cores first, then
// mids/production/support) with the per-cycle budget, BRACES each Cascade Storm as soon as the act
// body allows, and weathers it — letting the frontier decay and shed .sav debris (the only debris
// source). It does NOT archive (that stays the player's load-bearing drag-drop un-cheat) and never
// touches the Heat Death boss. The smoke calls it to fast-forward through all three acts to the body
// gate, then performs the real archive + the burn itself.

import { advanceCycle, applyRepair } from "./engine.js";
import { SALVAGE_REQUIRED, STATES_REQUIRED, MIN_CYCLE } from "./messages.js";
import { stormAvailable, braceStorm, TOTAL_STORMS } from "./storms.js";

const REPAIR_STEP = 2;
// Spine = everything that is NOT a frontier node (frontier is allowed to fail for debris). Cores are
// repaired first so the storm anchors never fall.
const isFrontier = (id) => String(id).startsWith("F");
const isCore = (id) => /^C/.test(String(id));

export function salvageableValue(state) {
  return (state.debris || []).reduce((sum, d) => sum + Number(d.value || 0), 0);
}

// Body gate met = enough cycles survived + cumulative reserves + enough archivable debris on hand.
export function bodyGateMet(state) {
  return Number(state.cycle || 0) >= MIN_CYCLE
    && Number(state.totalStatesEarned || 0) >= STATES_REQUIRED
    && salvageableValue(state) >= SALVAGE_REQUIRED;
}

// Full run complete = body gate met AND all Cascade Storms survived (the network has grown out).
export function runGateMet(state) {
  return bodyGateMet(state) && Number(state.stormsSurvived || 0) >= TOTAL_STORMS;
}

function repairSpine(state) {
  const spine = state.nodes.filter((n) => !isFrontier(n.id));
  // cores first (keep the anchors alive through storms), then by lowest health.
  spine.sort((a, b) => (isCore(b.id) - isCore(a.id)) || (a.health - b.health));
  for (const n of spine) {
    if ((state.repairUnits || 0) <= 0) break;
    if (n.health >= 100) continue;
    applyRepair(state, n.id, Math.min(REPAIR_STEP, state.repairUnits));
  }
}

// Advance the real engine through all acts until the run gate is met (or maxCycles). makeCycleRng
// supplies the deterministic per-cycle rng bundle, so this replays identically.
export function driveToGate(state, makeCycleRng, { maxCycles = 260 } = {}) {
  for (let i = 0; i < maxCycles; i += 1) {
    if (runGateMet(state)) break;
    if (stormAvailable(state).ok) braceStorm(state);
    repairSpine(state);
    advanceCycle(state, makeCycleRng(state.cycle));
  }
  return state;
}
