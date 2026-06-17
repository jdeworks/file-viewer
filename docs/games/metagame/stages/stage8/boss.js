import {
  ACHIEVEMENT_ID,
  ACHIEVEMENT_TEXT,
  ACTION_NAME,
  SALVAGE_REQUIRED,
  bellMessages,
  lockedHintLadder
} from "./messages.js";

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
  state.selectedDebrisId = state.debris[0]?.id || "";
  pushLog(state, `archived ${debris.id}. +${debris.value} States.`);

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

export function getBossLockState({ actions, state }) {
  const actionReady = hasSalvageArchived(actions);
  const enoughSalvage = Number(state.salvageTotal || 0) >= SALVAGE_REQUIRED;
  const unlocked = actionReady && enoughSalvage;
  const hintIndex = Math.min(Math.max(Number(state.boss.lockHintStep || 0), 0), lockedHintLadder.length - 1);
  return {
    unlocked,
    defeated: Boolean(state.boss.defeated),
    actionReady,
    enoughSalvage,
    salvageTotal: Number(state.salvageTotal || 0),
    salvageRequired: SALVAGE_REQUIRED,
    defeatPossible: unlocked,
    burnCycles: unlocked ? 10 : 0,
    hint: unlocked ? "archived States are sufficient. Heat Death can be waited out." : lockedHintLadder[hintIndex]
  };
}

export function recordHeatDeathAttempt({ state, actions }) {
  state.boss.reached = true;
  const lock = getBossLockState({ actions, state });
  if (!lock.unlocked) return recordHeatDeathFailure(state, lock);
  state.boss.defeated = true;
  state.meta.firstClearComplete = true;
  state.meta.btsAvailable = true;
  pushLog(state, bellMessages.defeated);
  return { defeated: true, unlocked: true, btsAvailable: true };
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
