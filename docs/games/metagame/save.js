export const SAVE_KEY = 'fv:games:metagame:v3';
export const SAVE_VERSION = 3;
export const STAGE_IDS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

function nowMs() {
  return Date.now();
}

function storageAvailable(storage) {
  return storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function';
}

function defaultStorage() {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

function uniqueStageList(value, fallback) {
  const seen = new Set();
  const out = [];
  const source = Array.isArray(value) ? value : fallback;
  for (const item of source) {
    const stage = Number(item);
    if (Number.isInteger(stage) && STAGE_IDS.includes(stage) && !seen.has(stage)) {
      seen.add(stage);
      out.push(stage);
    }
  }
  return out;
}

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function freshStageState() {
  return STAGE_IDS.reduce((state, stage) => {
    state[stage] = {};
    return state;
  }, {});
}

export function createFreshSave(timestamp = nowMs()) {
  return {
    version: SAVE_VERSION,
    currentStage: 1,
    defeated: [],
    unlockedStages: [1],
    achievements: {},
    actions: {},
    bell: {
      seen: [],
      log: [],
    },
    bts: {
      opened: {},
    },
    stageState: freshStageState(),
    global: {
      loopCount: 0,
      crashCourseUnlocked: false,
      fullCapstoneComplete: false,
      memorySignature: null,
      completionId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };
}

export function isValidSave(value) {
  if (!plainObject(value) || value.version !== SAVE_VERSION) return false;
  if (!plainObject(value.achievements) || !plainObject(value.actions)) return false;
  if (!plainObject(value.bell) || !Array.isArray(value.bell.seen) || !Array.isArray(value.bell.log)) return false;
  if (!plainObject(value.bts) || !plainObject(value.bts.opened)) return false;
  if (!plainObject(value.stageState) || !plainObject(value.global)) return false;
  for (const stage of STAGE_IDS) {
    if (!plainObject(value.stageState[stage])) return false;
  }
  return true;
}

export function ensureSaveShape(value, timestamp = nowMs()) {
  if (!isValidSave(value)) return createFreshSave(timestamp);
  value.currentStage = STAGE_IDS.includes(Number(value.currentStage)) ? Number(value.currentStage) : 1;
  value.defeated = uniqueStageList(value.defeated, []);
  value.unlockedStages = uniqueStageList(value.unlockedStages, [1]);
  if (!value.unlockedStages.includes(1)) value.unlockedStages.unshift(1);
  value.global.updatedAt = Number(value.global.updatedAt) || timestamp;
  value.global.createdAt = Number(value.global.createdAt) || value.global.updatedAt;
  return value;
}

export function loadSave({ storage = defaultStorage(), key = SAVE_KEY, timestamp = nowMs() } = {}) {
  if (!storageAvailable(storage)) return createFreshSave(timestamp);
  try {
    const raw = storage.getItem(key);
    if (!raw) {
      const fresh = createFreshSave(timestamp);
      storage.setItem(key, JSON.stringify(fresh));
      return fresh;
    }
    const save = ensureSaveShape(JSON.parse(raw), timestamp);
    if (!isValidSave(JSON.parse(raw))) storage.setItem(key, JSON.stringify(save));
    return save;
  } catch {
    const fresh = createFreshSave(timestamp);
    try {
      storage.setItem(key, JSON.stringify(fresh));
    } catch {
      // Storage may be read-only or quota-blocked; callers still get a valid in-memory save.
    }
    return fresh;
  }
}

export function persistSave(save, { storage = defaultStorage(), key = SAVE_KEY, timestamp = nowMs() } = {}) {
  const shaped = ensureSaveShape(save, timestamp);
  shaped.global.updatedAt = timestamp;
  if (storageAvailable(storage)) storage.setItem(key, JSON.stringify(shaped));
  return shaped;
}

export function resetSave({ storage = defaultStorage(), key = SAVE_KEY, timestamp = nowMs() } = {}) {
  const fresh = createFreshSave(timestamp);
  if (storageAvailable(storage)) storage.setItem(key, JSON.stringify(fresh));
  return fresh;
}
