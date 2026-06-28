// s9dev.js — Stage 9 dev-menu cheat logic (pure state mutations; no DOM).
// Each exported function takes `state` and mutates it in place. They are imported by the renderer's
// dev(id) dispatcher which then calls persistAndPaint(). No Date.now / Math.random — deterministic.
import { FIXED_OFFLINE_SEED } from "./messages.js";
import { BOSS_LEVEL } from "./movements.js";
import { solveMoment } from "./game.js";

export const DEV_CONTROLS = [
  { id: "add-clarity",     label: "+100 clarity"           },
  { id: "stabilizer-3",   label: "Arm 3 Stabilizers"      },
  { id: "unlock-offline",  label: "Force offline mode"     },
  { id: "skip-to-boss",   label: "Skip to boss (offline)" },
  { id: "reveal-pattern",  label: "Log solve moment"       }
];

function pushLog(state, line) {
  state.log = [...(state.log || []), line].slice(-6);
}

// +100 clarity so the player can buy all three calibration aids without grinding.
export function devAddClarity(state) {
  state.clarity = Number(state.clarity || 0) + 100;
  pushLog(state, "[dev] +100 clarity.");
}

// Arm 3 Stabilizer Lens charges — next 3 CROSS presses each get +60% tolerance.
export function devStabilizer3(state) {
  state.aids = state.aids && typeof state.aids === "object" ? state.aids : {};
  state.aids.stabilizer = Number(state.aids.stabilizer || 0) + 3;
  pushLog(state, "[dev] 3 stabilizer charges armed.");
}

// Force offline mode: marks the seed as fixed so all onlineUnstable levels become learnable.
// Sets the same flags that activateOfflineMode() sets without requiring an `actions` store.
export function devUnlockOffline(state) {
  state.offlineMode = true;
  state.offlineControlVisible = true;
  state.notesRead = true;
  state.boss.fixedSeed = FIXED_OFFLINE_SEED;
  pushLog(state, "[dev] offline mode forced — seed fixed to 0.");
}

// Jump straight to the boss, with offline mode active so it is actually beatable.
export function devSkipToBoss(state) {
  devUnlockOffline(state);
  state.currentLevel = BOSS_LEVEL;
  pushLog(state, `[dev] jumped to level ${BOSS_LEVEL} (offline, seed fixed).`);
}

// Log the learnable solve moment(s) for the current level at the given seed.
// rhythm returns an array (one time per chain beat); every other mode returns a single ms.
// The renderer passes activeSeed() so the reveal is always correct for the current live state.
export function devRevealPattern(state, seed) {
  const sol = solveMoment(seed, state.currentLevel);
  const text = Array.isArray(sol)
    ? `[dev] level ${state.currentLevel} beats: [${sol.join(", ")}] ms`
    : `[dev] level ${state.currentLevel} solve at ${sol} ms`;
  pushLog(state, text);
  return sol;
}

// Dispatcher: route a dev-menu id to the right cheat. Returns true when handled.
// `opts.seed` is the current activeSeed() from the renderer — only needed for reveal-pattern.
export function applyDevControl(id, state, { seed = 0 } = {}) {
  switch (id) {
    case "add-clarity":    devAddClarity(state);           return true;
    case "stabilizer-3":   devStabilizer3(state);          return true;
    case "unlock-offline": devUnlockOffline(state);        return true;
    case "skip-to-boss":   devSkipToBoss(state);           return true;
    case "reveal-pattern": devRevealPattern(state, seed);  return true;
    default:               return false;
  }
}
