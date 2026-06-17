import {
  ACHIEVEMENT_ID,
  ACHIEVEMENT_TEXT,
  ACTION_NAME,
  FIXED_OFFLINE_SEED,
  bellMessages,
  lockedHintLadder
} from "./messages.js";

export function hasOfflineModeActivated(actions) {
  return Boolean(actions && typeof actions.hasAction === "function" && actions.hasAction(9, ACTION_NAME));
}

export function readServiceWorkerNotes({ state, bell }) {
  const firstRead = !state.notesRead;
  state.notesRead = true;
  state.offlineControlVisible = true;
  if (firstRead) {
    pushLog(state, "service-worker-notes.txt read. offline control revealed.");
    notifyBell(bell, bellMessages.notesRead, "stage9.service_worker_notes_read");
  }
  return { notesRead: true, controlVisible: true, firstRead };
}

export function activateOfflineMode({
  state,
  actions,
  achievements,
  bell,
  source = "offline-control",
  browserOffline = false
}) {
  if (!state.notesRead && !browserOffline) return { activated: false, reason: "notes-unread" };
  const firstActivation = !hasOfflineModeActivated(actions);
  state.offlineMode = true;
  state.offlineControlVisible = true;
  state.boss.fixedSeed = FIXED_OFFLINE_SEED;
  pushLog(state, "offline mode active. seed endpoint resolves to cached default.");
  if (actions && typeof actions.setAction === "function") {
    actions.setAction(9, ACTION_NAME, {
      source,
      file: state.notesRead ? "service-worker-notes.txt" : null,
      mode: browserOffline ? "browser-offline-cache" : "simulated-cache"
    });
  }
  if (firstActivation) {
    notifyBell(bell, bellMessages.offline, "stage9.offline_mode_activated");
    unlockAchievement(achievements, ACHIEVEMENT_ID, {
      id: ACHIEVEMENT_ID,
      stage: 9,
      text: ACHIEVEMENT_TEXT,
      action: "9.offline_mode_activated"
    });
  }
  return { activated: true, firstActivation, seed: FIXED_OFFLINE_SEED };
}

export function getBossSeed({ state, actions, rng = Math.random }) {
  if (hasOfflineModeActivated(actions) || state.offlineMode) {
    state.offlineMode = true;
    state.boss.fixedSeed = FIXED_OFFLINE_SEED;
    return FIXED_OFFLINE_SEED;
  }
  let seed = Math.floor(rng() * 1000000);
  if (seed === state.boss.lastLockedSeed) seed = (seed + 1) % 1000000;
  state.boss.lastLockedSeed = seed;
  state.lockedSeedSamples = [...(state.lockedSeedSamples || []), seed].slice(-6);
  return seed;
}

export function getBossLockState({ actions, state }) {
  const unlocked = hasOfflineModeActivated(actions) || Boolean(state.offlineMode);
  const hintIndex = Math.min(Math.max(Number(state.boss.lockHintStep || 0), 0), lockedHintLadder.length - 1);
  return {
    unlocked,
    defeated: Boolean(state.boss.defeated),
    notesRead: Boolean(state.notesRead),
    offlineControlVisible: Boolean(state.offlineControlVisible),
    seedMode: unlocked ? "fixed-cache" : "live-random",
    seed: unlocked ? FIXED_OFFLINE_SEED : state.boss.lastLockedSeed,
    rotation: unlocked ? "30deg/s predictable clockwise" : "server jitter every sample",
    defeatPossible: unlocked,
    hint: unlocked ? "the seed is fixed. cross using the learned rotation." : lockedHintLadder[hintIndex]
  };
}

export function recordObserverBossAttempt({ state, actions }) {
  state.boss.reached = true;
  const lock = getBossLockState({ actions, state });
  if (!lock.unlocked) {
    state.boss.attempts = Number(state.boss.attempts || 0) + 1;
    state.boss.lockHintStep = Math.min(Number(state.boss.lockHintStep || 0) + 1, lockedHintLadder.length - 1);
    getBossSeed({ state, actions });
    pushLog(state, "the gap changed again. no timing survived contact.");
    return { defeated: false, unlocked: false, seedMode: "live-random" };
  }
  state.boss.defeated = true;
  state.meta.firstClearComplete = true;
  state.meta.btsAvailable = true;
  state.clarity = Number(state.clarity || 0) + 25;
  pushLog(state, bellMessages.defeated);
  return { defeated: true, unlocked: true, seedMode: "fixed-cache", seed: FIXED_OFFLINE_SEED };
}

export function pushLog(state, line) {
  state.log = [...(state.log || []), line].slice(-6);
}

function notifyBell(bell, text, id) {
  if (bell && typeof bell.push === "function") bell.push({ id, stage: 9, text });
  else if (bell && typeof bell.say === "function") bell.say(text, { id, stage: 9 });
  else if (bell && typeof bell.add === "function") bell.add(text, { id, stage: 9 });
}

function unlockAchievement(achievements, id, detail) {
  if (achievements && typeof achievements.unlockAchievement === "function") achievements.unlockAchievement(id, detail);
  else if (achievements && typeof achievements.unlock === "function") achievements.unlock(id, detail);
}
