export function defaultState() {
  return {
    version: 1,
    notesRead: false,
    offlineControlVisible: false,
    offlineMode: false,
    clarity: 84,
    currentLevel: 12,
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
  target.version = 1;
  target.notesRead = Boolean(target.notesRead);
  target.offlineControlVisible = Boolean(target.offlineControlVisible);
  target.offlineMode = Boolean(target.offlineMode);
  target.clarity = Number.isFinite(Number(target.clarity)) ? Number(target.clarity) : fresh.clarity;
  target.currentLevel = Number.isFinite(Number(target.currentLevel)) ? Number(target.currentLevel) : fresh.currentLevel;
  target.lockedSeedSamples = Array.isArray(target.lockedSeedSamples) ? target.lockedSeedSamples : fresh.lockedSeedSamples;
  target.log = Array.isArray(target.log) ? target.log : fresh.log;
  target.boss = { ...fresh.boss, ...(target.boss && typeof target.boss === "object" ? target.boss : {}) };
  target.meta = { ...fresh.meta, ...(target.meta && typeof target.meta === "object" ? target.meta : {}) };
  return target;
}
