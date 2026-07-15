const subscribers = new Set();
let saveProvider = null;
let persistProvider = null;

function nowMs() {
  return Date.now();
}

function currentSave() {
  return typeof saveProvider === 'function' ? saveProvider() : null;
}

function persistCurrentSave(save) {
  if (typeof persistProvider === 'function') persistProvider(save);
}

function ensureAchievements(save) {
  if (!save.achievements || typeof save.achievements !== 'object') save.achievements = {};
  return save.achievements;
}

export function bindAchievementSaveProvider(getSave, persistSave = null) {
  saveProvider = typeof getSave === 'function' ? getSave : null;
  persistProvider = typeof persistSave === 'function' ? persistSave : null;
}

export function unlockAchievement(id, { stage = null, title = id, detail = {} } = {}) {
  const save = currentSave();
  if (!save) return null;
  const achievements = ensureAchievements(save);
  if (achievements[id]) return achievements[id];
  const record = {
    id,
    stage,
    title,
    detail: { ...detail },
    unlockedAt: nowMs(),
  };
  achievements[id] = record;
  persistCurrentSave(save);
  for (const listener of subscribers) listener(record);
  return record;
}

export function unlock(id, detail = {}) {
  return unlockAchievement(id, detail);
}

export function hasAchievement(id) {
  const save = currentSave();
  return Boolean(save && save.achievements && save.achievements[id]);
}

export function getAchievement(id) {
  const save = currentSave();
  return save && save.achievements ? save.achievements[id] || null : null;
}

export function listAchievements(stage = null) {
  const save = currentSave();
  const records = save && save.achievements ? Object.values(save.achievements) : [];
  if (stage === null || stage === undefined) return records;
  return records.filter((record) => record.stage === Number(stage));
}

export function clearAchievementsForDebug(stage = null) {
  const save = currentSave();
  if (!save) return;
  const achievements = ensureAchievements(save);
  for (const [id, record] of Object.entries(achievements)) {
    if (stage === null || record.stage === Number(stage)) delete achievements[id];
  }
  persistCurrentSave(save);
}

export function subscribeToAchievements(listener) {
  if (typeof listener !== 'function') return () => {};
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}
