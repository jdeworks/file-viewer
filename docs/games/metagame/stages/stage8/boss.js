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
    defeatPossible: true,
    hint: unlocked ? "the seed is fixed. cross using the learned rotation." : lockedHintLadder[hintIndex]
  };
}

// Attempt the boss CROSS at a given elapsed (ms), against `seed` (the seed CURRENTLY on screen — the
// renderer's activeSeed(), so the evaluation always matches what the player was actually watching) and
// `shipAngle` (the renderer's live steered ship position — 2026-07-11 ship steering, see modes.js).
//
// 2026-07-11 playtest fix: offline mode is an optional buff now, not a gate. Online, the seed still
// reseeds after every attempt (so a pattern memorized in advance never survives to the next try), but
// the press IS genuinely evaluated against the live seed the player was watching — a real-time read of
// the rendered rotation (not memorization) can still land the gap. Offline fixes the seed so the SAME
// pattern can be learned/memorized ahead of time, turning a live read into a reliable, planned cross —
// a real, big buff, just no longer the only door. Steering applies at the boss exactly like every
// other level (per the "all levels uniformly" design decision).
export function recordObserverBossAttempt({ state, actions, elapsedMs = 0, seed, shipAngle = 0 }) {
  state.boss.reached = true;
  const lock = getBossLockState({ actions, state });
  const activeSeed = lock.unlocked ? FIXED_OFFLINE_SEED : (Number.isFinite(seed) ? seed : getBossSeed({ state, actions }));
  const result = crossAttempt({ seed: activeSeed, elapsedMs: Number(elapsedMs) || 0, level: BOSS_LEVEL, shipAngle });
  state.boss.attempts = Number(state.boss.attempts || 0) + 1;

  if (!result.hit) {
    if (!lock.unlocked) {
      state.boss.lockHintStep = Math.min(Number(state.boss.lockHintStep || 0) + 1, lockedHintLadder.length - 1);
      getBossSeed({ state, actions }); // reseed for the NEXT attempt's live display
      pushLog(state, `online, mistimed the live gap (off by ${Math.round(result.distance)}deg). it reseeds again.`);
      return { defeated: false, unlocked: false, hit: false, seedMode: "live-random", distance: result.distance };
    }
    pushLog(state, `offline, but the cross was mistimed (off by ${Math.round(result.distance)}deg).`);
    return { defeated: false, unlocked: true, hit: false, seedMode: "fixed-cache", distance: result.distance };
  }

  state.boss.defeated = true;
  state.meta.firstClearComplete = true;
  state.meta.btsAvailable = true;
  state.clarity = Number(state.clarity || 0) + 25;
  pushLog(state, lock.unlocked ? bellMessages.defeated : "a live read landed it — the gap held just long enough.");
  return { defeated: true, unlocked: lock.unlocked, hit: true, seedMode: lock.unlocked ? "fixed-cache" : "live-random", seed: activeSeed };
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
