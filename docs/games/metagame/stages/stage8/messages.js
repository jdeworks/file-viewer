export const ACTION_NAME = "salvage_archived";
export const REQUIRED_ACTION = "8.salvage_archived";
export const OPTIONAL_EXTERNAL_ACTION = "8.external_debris_imported";
export const ACHIEVEMENT_ID = "stage8.salvage_archived";
export const ACHIEVEMENT_TEXT = "I sorted the wreckage.";
export const BTS_PATH = "/docs/bts/entropy_field.bts";

// ── Heat Death gating (triple-gated boss; closes the old two-click bypass) ─────────────────────────
// The boss unlocks ONLY when every gate is met: the load-bearing drag-drop archive ACTION, a salvage
// floor, cumulative earned States, and a minimum survived cycle count. The burn then drains banked
// States across BURN_CYCLES escalating cycles — surviving needs real reserves (Stabilizers pause one
// burn cycle each). A fresh field / two-click attempt fails the gates outright.
export const SALVAGE_REQUIRED = 72;        // salvage floor (sum of archived debris value)
export const STATES_REQUIRED = 300;        // cumulative earned States gate
export const MIN_CYCLE = 8;                // minimum cycle count before Heat Death is reachable
export const BURN_CYCLES = 10;             // escalating burn cycles to survive
export const STABILIZER_COST = 40;         // States to build one Stabilizer (pauses a burn cycle)

export const bellMessages = {
  start: "something is degrading. I noticed too late to stop it.",
  debris: "there was something left in the wreckage. it won't last long.",
  archive: "if I can't stop it, I can use what remains.",
  warning: "a cascade is coming. I don't know how large. I am saving what I can.",
  defeated: "I held. the universe didn't care. I did.",
  failed: "there was more. it was in the debris files. I didn't move them in time."
};

export const lockedHintLadder = [
  "the collapse is not waiting for a heroic moment.",
  "you keep defending the field. what it discards does not vanish — it settles somewhere outside the fight.",
  "the States from failed nodes cool into .sav debris in /entropy/debris/.",
  "move that debris into /entropy/active_archive/ — the Archive button or drag/drop — and bank enough before Heat Death."
];

// Gate-specific guidance: which requirement is still unmet (the renderer picks the first failing one).
export function gateHint(lock) {
  if (!lock.enoughStorms) return `weather the Cascade Storms first: ${lock.stormsSurvived}/${lock.stormsRequired} survived. the field must grow before it can end.`;
  if (!lock.actionReady) return "move a .sav from /entropy/debris/ into /entropy/active_archive/ — that is the lesson.";
  if (!lock.enoughSalvage) return `archive more wreckage: salvage ${lock.salvageTotal}/${lock.salvageRequired}.`;
  if (!lock.enoughCycles) return `survive longer: cycle ${lock.cycle}/${lock.minCycle} before Heat Death will commit.`;
  if (!lock.enoughStates) return `bank deeper reserves: ${lock.totalEarned}/${lock.statesRequired} States earned. the burn drains everything.`;
  return "the reserves are deep enough. Heat Death can be endured.";
}

export const btsSummary = [
  "Stage 8 uses internal drag and drop because OS file dragging behaves differently across browsers, touch devices, and assistive technology.",
  "The critical lesson is still the file action: a generated .sav moves from debris into an active archive before decay.",
  "External import can exist as a bonus, but Heat Death is balanced around the internal archive path and its accessible fallback."
];
