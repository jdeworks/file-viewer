const ACTION_EVENT = 'fv:games:action';
const actions = new Map();
const subscribers = new Set();

let saveProvider = null;
let persistProvider = null;

function nowMs() {
  return Date.now();
}

function actionId(stage, action) {
  return `${Number(stage)}.${String(action)}`;
}

function fallbackKey(stage, action) {
  return `fv:games:action:stage${Number(stage)}:${String(action)}`;
}

function defaultStorage() {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

function safeStorageWrite(stage, action, record) {
  const storage = defaultStorage();
  if (!storage || typeof storage.setItem !== 'function') return;
  try {
    storage.setItem(fallbackKey(stage, action), JSON.stringify(record));
  } catch {
    // LocalStorage is a fallback only; in-memory/save mirrors remain canonical.
  }
}

function safeStorageRemove(stage, action) {
  const storage = defaultStorage();
  if (!storage || typeof storage.removeItem !== 'function') return;
  try {
    storage.removeItem(fallbackKey(stage, action));
  } catch {
    // Ignore blocked storage.
  }
}

function dispatch(record) {
  const detail = { ...record.detail, stage: record.stage, action: record.action };
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    const EventCtor = typeof CustomEvent === 'function'
      ? CustomEvent
      : class CustomEventFallback extends Event {
          constructor(type, init) {
            super(type, init);
            this.detail = init && init.detail;
          }
        };
    window.dispatchEvent(new EventCtor(ACTION_EVENT, { detail }));
  }
  for (const listener of subscribers) listener(detail, record);
}

function currentSave() {
  return typeof saveProvider === 'function' ? saveProvider() : null;
}

function persistCurrentSave(save) {
  if (typeof persistProvider === 'function') persistProvider(save);
}

export function bindActionSaveProvider(getSave, persistSave = null) {
  saveProvider = typeof getSave === 'function' ? getSave : null;
  persistProvider = typeof persistSave === 'function' ? persistSave : null;
  const save = currentSave();
  if (save) hydrateActionsFromSave(save);
}

export function setAction(stage, action, detail = {}) {
  const id = actionId(stage, action);
  const timestamp = nowMs();
  const existing = actions.get(id);
  const record = existing ? {
    ...existing,
    detail: { ...existing.detail, ...detail },
    source: detail.source || existing.source || null,
    updatedAt: timestamp,
  } : {
    stage: Number(stage),
    action: String(action),
    source: detail.source || null,
    detail: { ...detail },
    firstSetAt: timestamp,
    updatedAt: timestamp,
  };
  actions.set(id, record);
  safeStorageWrite(stage, action, record);

  const save = currentSave();
  if (save) {
    mirrorActionsToSave(save);
    persistCurrentSave(save);
  }

  dispatch(record);
  return record;
}

export function hasAction(stage, action) {
  return actions.has(actionId(stage, action));
}

export function getAction(stage, action) {
  return actions.get(actionId(stage, action)) || null;
}

export function listActions(stage = null) {
  const records = [...actions.entries()].map(([id, record]) => ({ id, ...record }));
  if (stage === null || stage === undefined) return records;
  return records.filter((record) => record.stage === Number(stage));
}

export function clearActionsForDebug(stage = null) {
  for (const [id, record] of [...actions.entries()]) {
    if (stage === null || record.stage === Number(stage)) {
      actions.delete(id);
      safeStorageRemove(record.stage, record.action);
    }
  }
  const save = currentSave();
  if (save) {
    mirrorActionsToSave(save);
    persistCurrentSave(save);
  }
}

export function hydrateActionsFromSave(save) {
  actions.clear();
  if (!save || !save.actions || typeof save.actions !== 'object') return;
  for (const [id, record] of Object.entries(save.actions)) {
    if (!record || typeof record !== 'object') continue;
    const stage = Number(record.stage ?? id.split('.')[0]);
    const action = String(record.action ?? id.split('.').slice(1).join('.'));
    if (!Number.isInteger(stage) || !action) continue;
    actions.set(actionId(stage, action), {
      stage,
      action,
      source: record.source || null,
      detail: record.detail && typeof record.detail === 'object' ? { ...record.detail } : {},
      firstSetAt: Number(record.firstSetAt) || nowMs(),
      updatedAt: Number(record.updatedAt) || Number(record.firstSetAt) || nowMs(),
    });
  }
}

export function mirrorActionsToSave(save) {
  if (!save || typeof save !== 'object') return save;
  save.actions = {};
  for (const [id, record] of actions.entries()) {
    save.actions[id] = { ...record, detail: { ...record.detail } };
  }
  return save;
}

export function subscribeToActions(listener) {
  if (typeof listener !== 'function') return () => {};
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}
