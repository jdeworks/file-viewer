// Persistence for ASCII studio options: the last-used settings (so image + video/webcam
// modes share them across sessions) and named user presets. localStorage, fv: convention,
// wrapped in try/catch for private mode. Pure — no DOM, no engine coupling.
const LAST_KEY = 'fv:ascii:last';
const PRESETS_KEY = 'fv:ascii:presets';

const read = (k, fallback) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode / quota */ } };

// Last-used options (a partial options object) — null if never saved.
export function loadLast() { const v = read(LAST_KEY, null); return v && typeof v === 'object' ? v : null; }
export function saveLast(options) { if (options) write(LAST_KEY, options); }

// Named presets: { name → options }.
export function listPresets() { const m = read(PRESETS_KEY, {}); return m && typeof m === 'object' ? Object.keys(m) : []; }
export function getPreset(name) { const m = read(PRESETS_KEY, {}); return m && m[name] ? m[name] : null; }
export function savePreset(name, options) {
  const m = read(PRESETS_KEY, {}) || {};
  m[String(name)] = options;
  write(PRESETS_KEY, m);
}
export function deletePreset(name) {
  const m = read(PRESETS_KEY, {}) || {};
  delete m[String(name)];
  write(PRESETS_KEY, m);
}
