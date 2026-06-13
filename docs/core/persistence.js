// Per-file state, persisted in localStorage and keyed by a file FINGERPRINT (name + size,
// plus lastModified when available). Foundation for stateful viewers — an EPUB reader's
// resume position, an audiobook's playhead/bookmarks/sleep-timer, last view tab, etc.
//
// Everything is best-effort and same-origin: nothing leaves the page. Writes are quota-safe
// (LRU eviction on QuotaExceeded) and reads never throw. State is plain JSON, so callers keep
// it small (positions, indices, short bookmark lists) — never blobs.

const PREFIX = 'fv:state:';
const INDEX = 'fv:state:index';      // LRU-ordered list of fingerprints (most-recent last)
const MAX_ENTRIES = 120;             // cap remembered files so storage stays bounded

// A stable-enough identity for "the same file again". Name+size collides rarely; lastModified
// (when the File carried it) makes it sharper. Intentionally NOT a content hash — we want this
// to be instant and to survive trivial in-app edits to the *current* copy.
export function fingerprint(intake) {
  if (!intake) return '';
  const name = intake.filename || 'untitled';
  const lm = intake.lastModified ? ':' + intake.lastModified : '';
  return `${name}:${intake.size || 0}${lm}`;
}

const keyFor = (fp) => PREFIX + fp;

function readIndex() {
  try { return JSON.parse(localStorage.getItem(INDEX) || '[]'); } catch { return []; }
}
function writeIndex(list) {
  try { localStorage.setItem(INDEX, JSON.stringify(list)); } catch { /* ignore */ }
}
function touch(fp) {
  const list = readIndex().filter((x) => x !== fp);
  list.push(fp);
  writeIndex(list);
}
function evictOldest() {
  const list = readIndex();
  const victim = list.shift();
  if (victim != null) { try { localStorage.removeItem(keyFor(victim)); } catch {} }
  writeIndex(list);
  return victim != null;
}

// Read the saved state object for this file, or null if none.
export function loadState(intake) {
  const fp = fingerprint(intake);
  if (!fp) return null;
  try {
    const raw = localStorage.getItem(keyFor(fp));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// Replace the saved state for this file. Quota-safe: evicts least-recently-used files and
// retries. Returns true on success.
export function saveState(intake, state) {
  const fp = fingerprint(intake);
  if (!fp) return false;
  const payload = JSON.stringify(state);
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      localStorage.setItem(keyFor(fp), payload);
      touch(fp);
      // Enforce the cap (best-effort) so the index can't grow without bound.
      let list = readIndex();
      while (list.length > MAX_ENTRIES && list[0] !== fp) { evictOldest(); list = readIndex(); }
      return true;
    } catch (e) {
      if (!evictOldest()) return false;   // nothing left to free
    }
  }
  return false;
}

// Shallow-merge a patch into the saved state (read-modify-write). Returns the merged object.
export function updateState(intake, patch) {
  const next = Object.assign({}, loadState(intake) || {}, patch);
  saveState(intake, next);
  return next;
}

// Forget this file's state.
export function clearState(intake) {
  const fp = fingerprint(intake);
  if (!fp) return;
  try { localStorage.removeItem(keyFor(fp)); } catch {}
  writeIndex(readIndex().filter((x) => x !== fp));
}
