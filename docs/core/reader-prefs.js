// Small, schema-bound persistence helper for renderer-owned reading controls. A renderer supplies
// defaults plus an allow-list for each value; untrusted iframe messages can therefore never add
// arbitrary keys or values to localStorage.

export const READER_PREFS_PREFIX = 'fv:reader:prefs:';

function availableStorage(storage) {
  if (storage) return storage;
  try { return globalThis.localStorage || null; }
  catch { return null; }
}

function validConfig(config) {
  return config && /^[a-z0-9][a-z0-9-]*$/i.test(config.key || '')
    && config.defaults && typeof config.defaults === 'object'
    && config.options && typeof config.options === 'object';
}

export function normalizeReaderPrefs(config, values = {}) {
  if (!validConfig(config)) return {};
  const out = {};
  for (const [key, fallback] of Object.entries(config.defaults)) {
    const allowed = Array.isArray(config.options[key]) ? config.options[key] : [fallback];
    const candidate = values && typeof values === 'object' ? values[key] : undefined;
    out[key] = allowed.includes(candidate) ? candidate : fallback;
  }
  return out;
}

export function loadReaderPrefs(config, storage = null) {
  const store = availableStorage(storage);
  let saved = null;
  try { saved = store ? JSON.parse(store.getItem(READER_PREFS_PREFIX + config.key) || 'null') : null; }
  catch { saved = null; }
  return normalizeReaderPrefs(config, saved);
}

export function saveReaderPrefs(config, values, storage = null) {
  const prefs = normalizeReaderPrefs(config, values);
  const store = availableStorage(storage);
  try { store?.setItem(READER_PREFS_PREFIX + config.key, JSON.stringify(prefs)); }
  catch { /* private mode / quota / disabled storage */ }
  return prefs;
}
