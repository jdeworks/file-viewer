const subscribers = new Set();
let saveProvider = null;
let persistProvider = null;

// The bell log is a rolling notification feed; cap it so it can never grow without bound.
const MAX_BELL_LOG = 80;

function nowMs() {
  return Date.now();
}

function currentSave() {
  return typeof saveProvider === 'function' ? saveProvider() : null;
}

function persistCurrentSave(save) {
  if (typeof persistProvider === 'function') persistProvider(save);
}

function ensureBell(save) {
  if (!save.bell || typeof save.bell !== 'object') save.bell = {};
  if (!Array.isArray(save.bell.seen)) save.bell.seen = [];
  if (!Array.isArray(save.bell.log)) save.bell.log = [];
  return save.bell;
}

export function bindBellSaveProvider(getSave, persistSave = null) {
  saveProvider = typeof getSave === 'function' ? getSave : null;
  persistProvider = typeof persistSave === 'function' ? persistSave : null;
}

export function pushBellMessage(id, { stage = null, text = '', tone = 'info', detail = {} } = {}) {
  const save = currentSave();
  if (!save) return null;
  const bell = ensureBell(save);
  const record = {
    id,
    stage,
    text,
    tone,
    detail: { ...detail },
    createdAt: nowMs(),
  };
  bell.log.push(record);
  // Hard cap: the bell log is a rolling feed, not a permanent ledger. Without this a caller that
  // re-shows a message (e.g. `once: false`) on a repeatable game event grows the log — and the
  // whole save is re-serialised to localStorage on every push — without bound, eventually
  // starving the tab. Keep only the most recent entries.
  if (bell.log.length > MAX_BELL_LOG) bell.log.splice(0, bell.log.length - MAX_BELL_LOG);
  persistCurrentSave(save);
  for (const listener of subscribers) listener(record);
  return record;
}

export function showBell(id, text, options = {}) {
  if (hasBellSeen(id) && options.once !== false) return null;
  const record = pushBellMessage(id, { ...options, text });
  if (options.markSeen) markBellSeen(id);
  return record;
}

export function push(entry = {}) {
  return showBell(entry.id || `bell.${Date.now()}`, entry.text || '', entry);
}

export function say(text, options = {}) {
  return showBell(options.id || `bell.${Date.now()}`, text, options);
}

export function add(text, options = {}) {
  return say(text, options);
}

export function markBellSeen(id) {
  const save = currentSave();
  if (!save) return false;
  const bell = ensureBell(save);
  if (!bell.seen.includes(id)) {
    bell.seen.push(id);
    persistCurrentSave(save);
  }
  return true;
}

export function hasBellSeen(id) {
  const save = currentSave();
  return Boolean(save && ensureBell(save).seen.includes(id));
}

export const hasSeenBell = hasBellSeen;

export function listBellLog({ stage = null, unseenOnly = false } = {}) {
  const save = currentSave();
  if (!save) return [];
  const bell = ensureBell(save);
  return bell.log.filter((record) => {
    if (stage !== null && stage !== undefined && record.stage !== Number(stage)) return false;
    if (unseenOnly && bell.seen.includes(record.id)) return false;
    return true;
  });
}

export function clearBellForDebug(stage = null) {
  const save = currentSave();
  if (!save) return;
  const bell = ensureBell(save);
  if (stage === null || stage === undefined) {
    bell.seen = [];
    bell.log = [];
  } else {
    const ids = new Set(bell.log.filter((record) => record.stage === Number(stage)).map((record) => record.id));
    bell.log = bell.log.filter((record) => record.stage !== Number(stage));
    bell.seen = bell.seen.filter((id) => !ids.has(id));
  }
  persistCurrentSave(save);
}

export function subscribeToBell(listener) {
  if (typeof listener !== 'function') return () => {};
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}
