// Autosave: persist current editor text to localStorage every 5 min for text files.
import { state, toast } from './state.js';

const PREFIX = 'fv:autosave:';
const INTERVAL_MS = 5 * 60 * 1000;  // 5 minutes
const MAX_BYTES = 2 * 1024 * 1024;  // 2MB
const TTL_MS = 7 * 24 * 60 * 60 * 1000;  // 7 days

let _timer = null;
let _warned = false;

// Prune autosaves older than TTL
function pruneOld() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith(PREFIX)) continue;
      const entry = tryParse(localStorage.getItem(k));
      if (entry && Date.now() - (entry.ts || 0) > TTL_MS) {
        localStorage.removeItem(k); i--;
      }
    }
  } catch { /* private mode or storage error */ }
}

function tryParse(s) { try { return JSON.parse(s); } catch { return null; } }

function key(filename) {
  return PREFIX + (filename || '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
}

export function saveNow() {
  if (!state.rawview || state.intake?.isBinary) return;
  const text = state.rawview.getValue?.();
  if (!text) return;
  const filename = state.intake?.filename || state.intake?.name;
  if (!filename) return;
  if (text.length > MAX_BYTES) {
    if (!_warned) { _warned = true; toast('File too large for autosave (>2MB)'); }
    return;
  }
  try {
    localStorage.setItem(key(filename), JSON.stringify({ text, ts: Date.now(), filename }));
  } catch { /* localStorage full or disabled — silently skip */ }
}

export function clearAutosave(filename) {
  if (!filename) return;
  try { localStorage.removeItem(key(filename)); } catch { /* ignore */ }
}

export function getAutosave(filename) {
  if (!filename) return null;
  const entry = tryParse(localStorage.getItem(key(filename)));
  if (!entry) return null;
  if (Date.now() - (entry.ts || 0) > TTL_MS) {
    clearAutosave(filename); return null;
  }
  return entry;
}

export function startAutosave() {
  stopAutosave();
  _warned = false;
  pruneOld();
  _timer = setInterval(saveNow, INTERVAL_MS);
}

export function stopAutosave() {
  if (_timer) { clearInterval(_timer); _timer = null; }
}
