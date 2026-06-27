// solver.js — Stage 8 deterministic fast-forward solvers (TEST/DEBUG, exposed via window.__fvStage8).
//
// driveToGate plays the REAL survival sim forward: it repairs the spine (cores/mids/production) with
// the per-cycle budget and lets the frontier decay until it fails, which is the ONLY source of .sav
// debris — so reaching the gate genuinely requires letting the field shed wreckage. It does NOT
// archive (that stays the player's load-bearing drag-drop un-cheat) and never touches the boss. The
// smoke calls it to fast-forward to the body gate, then performs the real archive + the burn itself.

import { advanceCycle, applyRepair } from "./engine.js";
import { SALVAGE_REQUIRED, STATES_REQUIRED, MIN_CYCLE } from "./messages.js";

const REPAIR_STEP = 2;

export function salvageableValue(state) {
  return (state.debris || []).reduce((sum, d) => sum + Number(d.value || 0), 0);
}

// Body gate met = enough cycles survived + cumulative reserves + enough archivable debris on hand.
export function bodyGateMet(state) {
  return Number(state.cycle || 0) >= MIN_CYCLE
    && Number(state.totalStatesEarned || 0) >= STATES_REQUIRED
    && salvageableValue(state) >= SALVAGE_REQUIRED;
}

function repairSpine(state) {
  const spine = state.nodes.filter((n) => !String(n.id).startsWith("F"));
  for (const n of [...spine].sort((a, b) => a.health - b.health)) {
    if ((state.repairUnits || 0) <= 0) break;
    if (n.health >= 100) continue;
    applyRepair(state, n.id, Math.min(REPAIR_STEP, state.repairUnits));
  }
}

// Advance the real engine until the body gate is met (or maxCycles). makeCycleRng(cycle) supplies the
// deterministic per-cycle rng bundle (same scheme the renderer uses), so this replays identically.
export function driveToGate(state, makeCycleRng, { maxCycles = 60 } = {}) {
  for (let i = 0; i < maxCycles; i += 1) {
    if (bodyGateMet(state)) break;
    repairSpine(state);
    advanceCycle(state, makeCycleRng(state.cycle));
  }
  return state;
}
