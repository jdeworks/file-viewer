// The storage KEY is a stable namespace and intentionally keeps its historical `v3` suffix even
// though the in-save schema is now v4 — old saves were written under this key, and migrating them
// forward (rather than orphaning them by changing the key) is the whole point of the ladder below.
export const SAVE_KEY = 'fv:games:metagame:v3';
export const SAVE_VERSION = 7;
// NOTE (2026-07-11): the game used to have 10 stages. Entropy Field (the old stage 8) was removed
// entirely; Observer State moved 9→8; Awakening (the finale) moved 10→9. See MIGRATIONS[5] below for
// how an existing save's stage-numbered data (stageState/unlockedStages/defeated/runs/actions/
// achievements) is remapped forward without losing player progress.
export const STAGE_IDS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9]);
// Stages 1–8 are unlocked by default (the stage buttons exist even after a full reset). Stage 9
// (the finale) stays gated: it is added to unlockedStages ONLY by beating stage 8 (metagame.js id+1
// progression) or via the dev unlock-all. This is the stage-to-stage META unlock only — each stage's
// internal boss/un-cheat gating is unchanged (a boss is still reachable only after its stage body).
export const DEFAULT_UNLOCKED_STAGES = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8]);
// The stage numbering as it existed for schema versions 1 through 5 (before the 5->6 renumbering
// step below). `upgradeShape` (the 1->2/2->3 legacy backfill) MUST use this, not the current
// `STAGE_IDS`, to fill a pre-v6 save's missing stageState slots — otherwise a save that enters the
// ladder below v5 (e.g. a true v1) would already be reshaped to the NEW 9-stage numbering by the
// time it reaches the 5->6 step, which assumes it's still seeing the OLD 10-stage shape and would
// incorrectly drop/remap already-correct data.
const LEGACY_STAGE_IDS_V5 = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
const LEGACY_DEFAULT_UNLOCKED_V5 = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9]);

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
    unlockedStages: [...DEFAULT_UNLOCKED_STAGES],
    achievements: {},
    actions: {},
    bell: {
      seen: [],
      log: [],
    },
    bts: {
      opened: {},
    },
    // Per-stage run counter (stageId -> count) used by shared/run-state.js to derive a fresh
    // deterministic seed for each new run. Lives at top level so it never pollutes the per-stage
    // `stageState[id]` emptiness check that drives lazy defaultState seeding in metagame.js.
    runs: {},
    stageState: freshStageState(),
    global: {
      loopCount: 0,
      crashCourseUnlocked: false,
      fullCapstoneComplete: false,
      memorySignature: null,
      completionId: null,
      // Cross-stage ASCENSION completion summary (see shared/ascension.js). Lives in `global` — a
      // top-level container — so the future hub/meta-goal can read it WITHOUT visiting each stage
      // (per-stage ascension state lives in stageState[id], which metagame.js lazy-seeds only on
      // mount, so an unvisited stage's substate is not a safe home for the cross-stage summary).
      // maxAscension     — single highest ascension level cleared across ALL stages (completionist).
      // ascensionCleared — map stageId -> highest ascension level cleared for that stage.
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
  if (!plainObject(value.runs)) return false;
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
  // Stages 1–8 are always unlocked (forward-migrates any older save — including a bare [1] or a
  // fresh-after-reset save — without ever losing an already-earned stage 9). uniqueStageList only
  // applies its fallback when value isn't an array, so we explicitly UNION the defaults in, then sort
  // so the nav renders in stage order. Stage 9 (the finale) is preserved when present but never added here.
  value.unlockedStages = uniqueStageList(value.unlockedStages, DEFAULT_UNLOCKED_STAGES);
  for (const stage of DEFAULT_UNLOCKED_STAGES) {
    if (!value.unlockedStages.includes(stage)) value.unlockedStages.push(stage);
  }
  value.unlockedStages.sort((a, b) => a - b);
  if (!plainObject(value.runs)) value.runs = {};
  value.global.updatedAt = Number(value.global.updatedAt) || timestamp;
  value.global.createdAt = Number(value.global.createdAt) || value.global.updatedAt;
  return value;
}

// ── Save-migration ladder ─────────────────────────────────────────────────────────────────────────
// A valid older-version save is MIGRATED forward (its actions/achievements/defeated/stageState are
// preserved) instead of being discarded. Only a truly-unparseable / versionless / future-version save
// falls back to fresh. Each step takes `vN` and returns `vN+1`; `migrateSave` walks them up to
// SAVE_VERSION. Migrations MUST run before metagame.js lazy-seeds stageState[id].

// Backfill any missing top-level fields from a fresh save (legacy shapes predate the bell/bts/global
// split) WITHOUT clobbering existing player data, then stamp the target version.
// Backfills using LEGACY_STAGE_IDS_V5/LEGACY_DEFAULT_UNLOCKED_V5 (the 10-stage numbering), NOT the
// current STAGE_IDS/DEFAULT_UNLOCKED_STAGES — this step only ever runs for a save below v5, so it
// must reproduce the shape a save actually had back then. Reshaping to the CURRENT (v6, 9-stage)
// numbering here would corrupt the later 5->6 step, which assumes it's still seeing the old shape.
function upgradeShape(value, timestamp, toVersion) {
  const fresh = createFreshSave(timestamp);
  const merged = { ...fresh, ...value };
  if (!plainObject(merged.achievements)) merged.achievements = {};
  if (!plainObject(merged.actions)) merged.actions = {};
  if (!plainObject(merged.bell)) merged.bell = { seen: [], log: [] };
  if (!Array.isArray(merged.bell.seen)) merged.bell.seen = [];
  if (!Array.isArray(merged.bell.log)) merged.bell.log = [];
  if (!plainObject(merged.bts)) merged.bts = { opened: {} };
  if (!plainObject(merged.bts.opened)) merged.bts.opened = {};
  merged.global = plainObject(merged.global) ? { ...fresh.global, ...merged.global } : { ...fresh.global };
  const stageState = plainObject(merged.stageState) ? merged.stageState : {};
  for (const id of LEGACY_STAGE_IDS_V5) if (!plainObject(stageState[id])) stageState[id] = {};
  merged.stageState = stageState;
  if (!Array.isArray(value.unlockedStages)) merged.unlockedStages = [...LEGACY_DEFAULT_UNLOCKED_V5];
  merged.version = toVersion;
  return merged;
}

const MIGRATIONS = {
  // 1->2, 2->3: legacy shape upgrades — backfill missing top-level containers, keep player data.
  1: (value, timestamp) => upgradeShape(value, timestamp, 2),
  2: (value, timestamp) => upgradeShape(value, timestamp, 3),
  // 3->4: introduce `runs` (per-stage run counter for shared/run-state.js seeding). Additive only.
  3: (value) => {
    if (!plainObject(value.runs)) value.runs = {};
    value.version = 4;
    return value;
  },
  // 4->5: introduce the cross-stage ASCENSION completion summary in `global` (see shared/ascension.js).
  // Additive only — backfill the two fields if absent, preserve all existing global/player data.
  4: (value) => {
    if (!plainObject(value.global)) value.global = {};
    if (typeof value.global.maxAscension !== 'number' || !Number.isFinite(value.global.maxAscension)) {
      value.global.maxAscension = 0;
    }
    if (!plainObject(value.global.ascensionCleared)) value.global.ascensionCleared = {};
    value.version = 5;
    return value;
  },
  // 5->6: Entropy Field (the old stage 8) was removed from the game entirely; Observer State moved
  // 9->8; Awakening (the finale) moved 10->9. Remap every piece of stage-numbered save data forward
  // so an existing player's progress survives the renumbering. Old stage-8 (Entropy Field) data has
  // no equivalent stage in the new game and is dropped, not merged into anything.
  5: (value) => {
    const REMAP = { 8: null, 9: 8, 10: 9 }; // old stage id -> new id, or null to drop
    const remapStage = (id) => {
      const n = Number(id);
      return n in REMAP ? REMAP[n] : n; // stages 1-7 pass through unchanged
    };
    if (plainObject(value.stageState)) {
      const next = {};
      for (const [key, val] of Object.entries(value.stageState)) {
        const n = remapStage(key);
        if (n != null) next[n] = val;
      }
      value.stageState = next;
    }
    if (plainObject(value.runs)) {
      const next = {};
      for (const [key, val] of Object.entries(value.runs)) {
        const n = remapStage(key);
        if (n != null) next[n] = val;
      }
      value.runs = next;
    }
    for (const field of ['unlockedStages', 'defeated']) {
      if (Array.isArray(value[field])) {
        value[field] = [...new Set(value[field].map(remapStage).filter((n) => n != null))].sort((a, b) => a - b);
      }
    }
    if (value.currentStage != null) {
      const n = remapStage(value.currentStage);
      if (n != null) value.currentStage = n;
    }
    // action/achievement keys carry a numeric stage prefix, either "N.foo" (actions) or "stageN.foo"
    // (achievements) — remap the prefix, dropping any key whose stage has no new home.
    const remapKeyedObject = (obj) => {
      if (!plainObject(obj)) return obj;
      const next = {};
      for (const [key, val] of Object.entries(obj)) {
        const m = key.match(/^(stage)?(\d+)\.(.+)$/);
        if (!m) { next[key] = val; continue; } // not stage-numbered (shouldn't happen, kept as-is)
        const n = remapStage(m[2]);
        if (n == null) continue; // drop — old stage 8 (Entropy Field) has no new home
        next[`${m[1] || ''}${n}.${m[3]}`] = val;
      }
      return next;
    };
    value.actions = remapKeyedObject(value.actions);
    value.achievements = remapKeyedObject(value.achievements);
    value.version = 6;
    return value;
  },
  // 6->7: Stage 7's Meridian rework (2026-07-12) replaced the EXIF/GPS boss un-cheat with the
  // in-stage evidence-board gate. Rename the boss action + achievement so a player who already
  // beat the old boss keeps completion AND stage 9's cross-stage read; reset any in-progress
  // stage-7 case state (the case content changed wholesale — metagame.js lazy-reseeds it) while
  // preserving defeated/unlocked/achievements.
  6: (value) => {
    if (plainObject(value.actions) && plainObject(value.actions['7.exif_contradiction_found'])) {
      value.actions['7.alibi_contradiction_pinned'] = value.actions['7.exif_contradiction_found'];
      delete value.actions['7.exif_contradiction_found'];
    }
    if (plainObject(value.achievements) && plainObject(value.achievements['stage7.exif_contradiction_found'])) {
      value.achievements['stage7.alibi_contradiction_pinned'] = value.achievements['stage7.exif_contradiction_found'];
      delete value.achievements['stage7.exif_contradiction_found'];
    }
    if (plainObject(value.stageState)) value.stageState[7] = {};
    value.version = 7;
    return value;
  },
};

// Walk the migration ladder from the save's version up to SAVE_VERSION. Returns the migrated save,
// or null when it cannot be migrated (not an object, no usable integer version, a version newer than
// we understand, or a missing/non-advancing step) — the caller then falls back to a fresh save.
export function migrateSave(value, timestamp = nowMs()) {
  if (!plainObject(value)) return null;
  let version = Number(value.version);
  if (!Number.isInteger(version) || version < 1 || version > SAVE_VERSION) return null;
  let save = value;
  while (version < SAVE_VERSION) {
    const step = MIGRATIONS[version];
    if (typeof step !== 'function') return null;
    save = step(save, timestamp);
    const next = Number(save?.version);
    if (!Number.isInteger(next) || next <= version) return null; // guard a broken/non-advancing step
    version = next;
  }
  return save;
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
    // Migrate an older valid save forward; ensureSaveShape returns a fresh save only if migration
    // failed (truly-corrupt / versionless / future) or the shape is still invalid.
    const save = ensureSaveShape(migrateSave(parsed, timestamp), timestamp);
    if (!wasValidCurrent) storage.setItem(key, JSON.stringify(save));
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
