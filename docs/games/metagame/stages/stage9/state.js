import { BOSS_LEVEL } from "./movements.js";

export function defaultState() {
  return {
    version: 2,
    notesRead: false,
    offlineControlVisible: false,
    offlineMode: false,
    clarity: 0,
    currentLevel: 1,
    lockedSeedSamples: [],
    log: [
      "one observer. it sees everything. there is a gap. the gap moves.",
      "the gap is different every time the connection answers."
    ],
    boss: {
      reached: false,
      defeated: false,
      attempts: 0,
      lockHintStep: 0,
      fixedSeed: null,
      lastLockedSeed: null
    },
    meta: {
      firstClearComplete: false,
      btsAvailable: false
    }
  };
}

export function normalizeState(state) {
  const fresh = defaultState();
  const target = state && typeof state === "object" ? state : {};
  // v1 saves used an 18-level/6-band layout (currentLevel up to 18). The stage is now a 10-level
  // movement structure — clamp any stale level into range so an old save can't land "past the boss".
  const staleV1 = Number(target.version) === 1;
  target.version = 2;
  target.notesRead = Boolean(target.notesRead);
  target.offlineControlVisible = Boolean(target.offlineControlVisible);
  target.offlineMode = Boolean(target.offlineMode);
  target.clarity = Number.isFinite(Number(target.clarity)) ? Number(target.clarity) : fresh.clarity;
  const lvl = Number.isFinite(Number(target.currentLevel)) ? Number(target.currentLevel) : fresh.currentLevel;
  target.currentLevel = staleV1 ? fresh.currentLevel : Math.max(1, Math.min(BOSS_LEVEL, lvl));
  target.lockedSeedSamples = Array.isArray(target.lockedSeedSamples) ? target.lockedSeedSamples : fresh.lockedSeedSamples;
  target.log = Array.isArray(target.log) ? target.log : fresh.log;
  target.boss = { ...fresh.boss, ...(target.boss && typeof target.boss === "object" ? target.boss : {}) };
  target.meta = { ...fresh.meta, ...(target.meta && typeof target.meta === "object" ? target.meta : {}) };
  return target;
}
