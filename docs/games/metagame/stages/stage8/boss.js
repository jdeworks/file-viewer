import {
  ACHIEVEMENT_ID,
  ACHIEVEMENT_TEXT,
  ACTION_NAME,
  SALVAGE_REQUIRED,
  STATES_REQUIRED,
  MIN_CYCLE,
  BURN_CYCLES,
  bellMessages,
  gateHint,
  lockedHintLadder
} from "./messages.js";
import { simulateHeatDeath } from "./burn.js";
import { makeRng } from "./rng.js";
import { scrapYield, earnScrap } from "./resources.js";

export function hasSalvageArchived(actions) {
  return Boolean(actions && typeof actions.hasAction === "function" && actions.hasAction(8, ACTION_NAME));
}

export function archiveDebris({
  state,
  actions,
  achievements,
  bell,
  debrisId,
  source = "internal-drag-drop",
  fallback = false
}) {
  const index = state.debris.findIndex((item) => item.id === debrisId && item.id.endsWith(".sav"));
  if (index < 0) return { archived: false, reason: "missing-debris" };

  const [debris] = state.debris.splice(index, 1);
  const archived = {
    ...debris,
    archivedAtCycle: state.cycle,
    path: `/entropy/active_archive/${debris.id}`
  };
  state.archive.push(archived);
  state.salvageTotal = Number(state.salvageTotal || 0) + Number(debris.value || 0);
  state.states = Number(state.states || 0) + Number(debris.value || 0);
  const scrap = scrapYield(debris);
  earnScrap(state, scrap);
  state.selectedDebrisId = state.debris[0]?.id || "";
  pushLog(state, `archived ${debris.id}. +${debris.value} States, +${scrap} Scrap.`);

  const firstArchive = !hasSalvageArchived(actions);
  if (actions && typeof actions.setAction === "function") {
    actions.setAction(8, ACTION_NAME, {
      source,
      file: debris.id,
      from: "/entropy/debris/",
      to: "/entropy/active_archive/",
      fallback
    });
  }
  if (firstArchive) {
    notifyBell(bell, bellMessages.archive, "stage8.salvage_archived");
    unlockAchievement(achievements, ACHIEVEMENT_ID, {
      id: ACHIEVEMENT_ID,
      stage: 8,
      text: ACHIEVEMENT_TEXT,
      action: "8.salvage_archived"
    });
  }
  return { archived: true, debris: archived, firstArchive };
}

export function handleDebrisDrop({ state, actions, achievements, bell, debrisId, targetPath }) {
  if (targetPath !== "/entropy/active_archive/") return { archived: false, reason: "wrong-target" };
  return archiveDebris({ state, actions, achievements, bell, debrisId, source: "internal-drag-drop", fallback: false });
}

export function archiveSelectedDebris({ state, actions, achievements, bell, source = "archive-button" }) {
  return archiveDebris({
    state,
    actions,
    achievements,
    bell,
    debrisId: state.selectedDebrisId,
    source,
    fallback: true
  });
}

export function applyExternalDebrisImport({ state, actions }) {
  state.externalImportBonusCycles = Math.max(Number(state.externalImportBonusCycles || 0), 3);
  pushLog(state, "external debris import buffered decay for 3 cycles.");
  if (actions && typeof actions.setAction === "function") {
    actions.setAction(8, "external_debris_imported", {
      source: "external-import",
      bonus: "debris-decay-buffer"
    });
  }
}

// Heat Death is TRIPLE-gated (closes the old two-click bypass): it unlocks only when ALL hold —
//   1. the load-bearing drag-drop archive ACTION (8.salvage_archived) has fired,
//   2. a salvage floor of archived debris value is banked,
//   3. cumulative earned States reach the reserve threshold (the burn drains everything), and
//   4. the field has survived a minimum number of cycles.
// A fresh field / two-click attempt fails gates 2–4 outright, so it returns LOCKED.
export function getBossLockState({ actions, state }) {
  const actionReady = hasSalvageArchived(actions);
  const salvageTotal = Number(state.salvageTotal || 0);
  const totalEarned = Number(state.totalStatesEarned || 0);
  const cycle = Number(state.cycle || 0);
  const enoughSalvage = salvageTotal >= SALVAGE_REQUIRED;
  const enoughStates = totalEarned >= STATES_REQUIRED;
  const enoughCycles = cycle >= MIN_CYCLE;
  const unlocked = actionReady && enoughSalvage && enoughStates && enoughCycles;
  const lock = {
    unlocked,
    defeated: Boolean(state.boss.defeated),
    actionReady,
    enoughSalvage,
    enoughStates,
    enoughCycles,
    salvageTotal,
    salvageRequired: SALVAGE_REQUIRED,
    totalEarned,
    statesRequired: STATES_REQUIRED,
    cycle,
    minCycle: MIN_CYCLE,
    defeatPossible: unlocked,
    burnCycles: BURN_CYCLES
  };
  lock.hint = gateHint(lock);
  return lock;
}

// Challenge Heat Death. If locked → failure (rewind). If unlocked → run the real escalating burn:
// surviving it (banked States outlast ~10 escalating drain cycles, Stabilizers pausing the worst)
// defeats it; failing the burn rewinds to the warning checkpoint. `rng` is a seeded bundle from the
// caller (run.seed-derived) so the burn replays identically across reloads.
export function recordHeatDeathAttempt({ state, actions, rng }) {
  state.boss.reached = true;
  const lock = getBossLockState({ actions, state });
  if (!lock.unlocked) return { ...recordHeatDeathFailure(state, lock), locked: true };

  const burn = simulateHeatDeath(state, rng || makeRng("8:burn"));
  state.boss.burn = burn;
  if (!burn.survived) {
    pushLog(state, `Heat Death overran reserves at burn cycle ${burn.failedAt}.`);
    return { ...recordHeatDeathFailure(state, lock), burn, locked: false };
  }
  state.states = Math.max(0, Math.round(burn.remainingStates));
  state.stabilizers = burn.stabilizersLeft;
  state.boss.defeated = true;
  state.meta.firstClearComplete = true;
  state.meta.btsAvailable = true;
  pushLog(state, bellMessages.defeated);
  return { defeated: true, unlocked: true, btsAvailable: true, burn };
}

export function recordHeatDeathFailure(state, lock = null) {
  state.boss.attempts = Number(state.boss.attempts || 0) + 1;
  state.boss.lockHintStep = Math.min(Number(state.boss.lockHintStep || 0) + 1, lockedHintLadder.length - 1);
  if (!state.warningCheckpoint) state.warningCheckpoint = makeWarningCheckpoint(state);
  const checkpoint = rewindToWarningCheckpoint(state);
  pushLog(state, bellMessages.failed);
  return {
    defeated: false,
    unlocked: Boolean(lock?.unlocked),
    canRewindWarningCheckpoint: true,
    checkpointCycle: checkpoint.cycle
  };
}

export function makeWarningCheckpoint(state) {
  return {
    cycle: Math.max(1, Number(state.cycle || 1) - 5),
    states: Math.max(0, Number(state.states || 0)),
    salvageTotal: Number(state.salvageTotal || 0),
    debris: state.debris.map((item) => ({ ...item })),
    archive: state.archive.map((item) => ({ ...item }))
  };
}

export function rewindToWarningCheckpoint(state) {
  const checkpoint = state.warningCheckpoint || makeWarningCheckpoint(state);
  state.cycle = checkpoint.cycle;
  state.states = checkpoint.states;
  state.salvageTotal = checkpoint.salvageTotal;
  state.debris = checkpoint.debris.map((item) => ({ ...item }));
  state.archive = checkpoint.archive.map((item) => ({ ...item }));
  state.boss.firstFailureRewound = true;
  return checkpoint;
}

export function pushLog(state, line) {
  state.log = [...(state.log || []), line].slice(-6);
}

function notifyBell(bell, text, id) {
  if (bell && typeof bell.push === "function") bell.push({ id, stage: 8, text });
  else if (bell && typeof bell.say === "function") bell.say(text, { id, stage: 8 });
  else if (bell && typeof bell.add === "function") bell.add(text, { id, stage: 8 });
}

function unlockAchievement(achievements, id, detail) {
  if (achievements && typeof achievements.unlockAchievement === "function") achievements.unlockAchievement(id, detail);
  else if (achievements && typeof achievements.unlock === "function") achievements.unlock(id, detail);
}
