// Keep the historical storage key so existing installations are found and deliberately reset.
export const SAVE_KEY = 'fv:games:metagame:v3';
export const SAVE_VERSION = 8;
export const STAGE_IDS = Object.freeze([1, 2, 3, 4, 5]);
export const DEFAULT_UNLOCKED_STAGES = Object.freeze([1, 2, 3, 4, 5]);

function nowMs() {
  return Date.now();
}

function storageAvailable(storage) {
  return storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function';
}

function defaultStorage() {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
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

function freshStageState() {
  return Object.fromEntries(STAGE_IDS.map((stage) => [stage, {}]));
}

function stageMap(value) {
  const source = plainObject(value) ? value : {};
  return Object.fromEntries(STAGE_IDS.map((stage) => [stage, plainObject(source[stage]) ? source[stage] : {}]));
}

function stageNumberMap(value) {
  const source = plainObject(value) ? value : {};
  const out = {};
  for (const stage of STAGE_IDS) {
    const n = Number(source[stage]);
    if (Number.isFinite(n) && n > 0) out[stage] = n;
  }
  return out;
}

export function createFreshSave(timestamp = nowMs()) {
  return {
    version: SAVE_VERSION,
    currentStage: 1,
    defeated: [],
    unlockedStages: [...DEFAULT_UNLOCKED_STAGES],
    achievements: {},
    actions: {},
    bell: { seen: [], log: [] },
    bts: { opened: {} },
    runs: {},
    stageState: freshStageState(),
    global: {
      sfxOff: false,
      maxAscension: 0,
      ascensionCleared: {},
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
  if (!plainObject(value.runs) || !plainObject(value.stageState) || !plainObject(value.global)) return false;
  return STAGE_IDS.every((stage) => plainObject(value.stageState[stage]));
}

export function ensureSaveShape(value, timestamp = nowMs()) {
  if (!isValidSave(value)) return createFreshSave(timestamp);

  value.currentStage = STAGE_IDS.includes(Number(value.currentStage)) ? Number(value.currentStage) : 1;
  value.defeated = uniqueStageList(value.defeated, []);
  value.unlockedStages = [...DEFAULT_UNLOCKED_STAGES];
  value.stageState = stageMap(value.stageState);

  const nextRuns = {};
  for (const stage of STAGE_IDS) {
    if (value.runs[stage] !== undefined) nextRuns[stage] = value.runs[stage];
  }
  value.runs = nextRuns;

  const global = value.global;
  value.global = {
    sfxOff: Boolean(global.sfxOff),
    maxAscension: Number.isFinite(Number(global.maxAscension)) ? Number(global.maxAscension) : 0,
    ascensionCleared: stageNumberMap(global.ascensionCleared),
    createdAt: Number(global.createdAt) || timestamp,
    updatedAt: Number(global.updatedAt) || timestamp,
  };
  return value;
}

// The five-game cut intentionally starts a new progression history. Every supported save from the
// old lineup (v1–v7) becomes the same pristine v8 save; current v8 saves keep their progress.
export function migrateSave(value, timestamp = nowMs()) {
  if (!plainObject(value)) return null;
  const version = Number(value.version);
  if (!Number.isInteger(version) || version < 1 || version > SAVE_VERSION) return null;
  if (version < SAVE_VERSION) return createFreshSave(timestamp);
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
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch { parsed = null; }
    const wasValidCurrent = isValidSave(parsed);
    const save = ensureSaveShape(migrateSave(parsed, timestamp), timestamp);
    if (!wasValidCurrent) storage.setItem(key, JSON.stringify(save));
    return save;
  } catch {
    const fresh = createFreshSave(timestamp);
    try { storage.setItem(key, JSON.stringify(fresh)); } catch { /* storage may be blocked */ }
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
