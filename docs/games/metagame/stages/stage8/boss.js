import {
  ACHIEVEMENT_ID,
  ACHIEVEMENT_TEXT,
  ACTION_NAME,
  FIXED_OFFLINE_SEED,
  bellMessages,
  lockedHintLadder
} from "./messages.js";
import { crossAttempt, solveElapsed, BOSS_LEVEL } from "./game.js";

export function hasOfflineModeActivated(actions) {
  return Boolean(actions && typeof actions.hasAction === "function" && actions.hasAction(8, ACTION_NAME));
}

export function readServiceWorkerNotes({ state, bell }) {
  const firstRead = !state.notesRead;
  state.notesRead = true;
  state.offlineControlVisible = true;
  if (firstRead) {
    pushLog(state, "service-worker-notes.txt read. offline control revealed.");
    notifyBell(bell, bellMessages.notesRead, "stage8.service_worker_notes_read");
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
    actions.setAction(8, ACTION_NAME, {
      source,
      file: state.notesRead ? "service-worker-notes.txt" : null,
      mode: browserOffline ? "browser-offline-cache" : "simulated-cache"
    });
  }
  if (firstActivation) {
    notifyBell(bell, bellMessages.offline, "stage8.offline_mode_activated");
    unlockAchievement(achievements, ACHIEVEMENT_ID, {
      id: ACHIEVEMENT_ID,
      stage: 8,
      text: ACHIEVEMENT_TEXT,
      action: "8.offline_mode_activated"
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

// Attempt the boss CROSS at a given elapsed (ms). Now routed through the REAL timing engine, not a
// flag-check: offline (the un-cheat) fixes the seed so the rotation is learnable, but you must still
// time the press to land the gap at the top. Online, each attempt reseeds (Math.random) → the base
// angle jumps → no timing survives, so the boss is impossible without offline mode.
export function recordObserverBossAttempt({ state, actions, elapsedMs = 0 }) {
  state.boss.reached = true;
  const lock = getBossLockState({ actions, state });
  if (!lock.unlocked) {
    state.boss.attempts = Number(state.boss.attempts || 0) + 1;
    state.boss.lockHintStep = Math.min(Number(state.boss.lockHintStep || 0) + 1, lockedHintLadder.length - 1);
    getBossSeed({ state, actions }); // online: resample → the gap jumps again
    pushLog(state, "the gap changed again. no timing survived contact.");
    return { defeated: false, unlocked: false, hit: false, seedMode: "live-random" };
  }
  // Offline: the seed is fixed (0). Still a real timing press.
  const result = crossAttempt({ seed: FIXED_OFFLINE_SEED, elapsedMs: Number(elapsedMs) || 0, level: BOSS_LEVEL });
  if (!result.hit) {
    state.boss.attempts = Number(state.boss.attempts || 0) + 1;
    pushLog(state, `offline, but the cross was mistimed (off by ${Math.round(result.distance)}deg).`);
    return { defeated: false, unlocked: true, hit: false, seedMode: "fixed-cache", distance: result.distance };
  }
  state.boss.defeated = true;
  state.meta.firstClearComplete = true;
  state.meta.btsAvailable = true;
  state.clarity = Number(state.clarity || 0) + 25;
  pushLog(state, bellMessages.defeated);
  return { defeated: true, unlocked: true, hit: true, seedMode: "fixed-cache", seed: FIXED_OFFLINE_SEED };
}

// The learnable solution: the earliest elapsed (ms) at which the offline (seed-0) gap reaches the top.
// A player infers this by watching the fixed rotation; the smoke uses it to cross at the right moment.
export function offlineSolveElapsed() {
  return solveElapsed(FIXED_OFFLINE_SEED, BOSS_LEVEL);
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
