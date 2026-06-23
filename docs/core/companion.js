// Companion detection + API client for the local Axum save-back server (localhost:7700).
// All companion fetch calls are GATED behind an explicit localStorage opt-in flag so that
// users who haven't enabled the companion produce ZERO off-origin network requests.
// New users and automated smoke tests are unaffected.

const BASE = 'http://127.0.0.1:7700';
const LS_ENABLED = 'fv:companion:enabled';
const LS_TOKEN   = 'fv:companion:token';

let _token = localStorage.getItem(LS_TOKEN) || null;

// The companion is a DESKTOP-only feature (a local server + native app). On phones/tablets there's
// no companion to reach, so we hard-disable it: isEnabled() is forced false, which gates every
// companion fetch — zero off-origin requests on mobile regardless of the saved opt-in flag.
export function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(navigator.userAgent || '');
}
export function isEnabled() { return !isMobileDevice() && localStorage.getItem(LS_ENABLED) === 'true'; }
export function setEnabled(on) { localStorage.setItem(LS_ENABLED, on ? 'true' : 'false'); }

export async function detectCompanion() {
  try {
    const res = await Promise.race([
      fetch(`${BASE}/ping`),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 500)),
    ]);
    if (!res.ok) return false;
    const json = await res.json();
    if (json.ok !== true) return false;
    // Pick up the session token automatically — no manual paste. Only CORS-allowed origins (this
    // site + localhost) can read /ping, so a disallowed page can't obtain it.
    if (json.token) setToken(json.token);
    return true;
  } catch { return false; }
}

export function setToken(token) {
  _token = token;
  if (token) localStorage.setItem(LS_TOKEN, token);
  else localStorage.removeItem(LS_TOKEN);
}
export function getToken() { return _token; }

export async function findFile(name, size) {
  const params = new URLSearchParams({ name, size });
  const res = await fetch(`${BASE}/find-file?${params}`);
  if (!res.ok) throw new Error(`find-file failed: ${res.status}`);
  return (await res.json()).matches; // string[]
}

export async function findFolder(relPath, size, mtime) {
  if (!isEnabled()) return [];
  const params = new URLSearchParams({ relPath, size, mtime });
  const res = await fetch(`${BASE}/find-folder?${params}`);
  if (!res.ok) throw new Error(`find-folder: ${res.status}`);
  return (await res.json()).matches; // absolute root paths
}

export async function saveFile(absolutePath, bytes) {
  const res = await fetch(`${BASE}/file?path=${encodeURIComponent(absolutePath)}`, {
    method: 'POST',
    headers: { 'X-Companion-Token': _token || '', 'Content-Type': 'application/octet-stream' },
    body: bytes,
  });
  if (!res.ok) throw new Error(`save failed: ${res.status}`);
  return res.json();
}

// Delete a single file on disk (token-gated server-side; path-restricted to watched folders).
// The caller MUST confirm with the user first — this is destructive. The Download button is
// unaffected; this only removes the on-disk original the file is linked to.
export async function deleteFile(absolutePath) {
  const res = await fetch(`${BASE}/file?path=${encodeURIComponent(absolutePath)}`, {
    method: 'DELETE',
    headers: { 'X-Companion-Token': _token || '' },
  });
  if (!res.ok) throw new Error(`delete failed: ${res.status}`);
  return res.json();
}

export async function getWatchedPaths() {
  const res = await fetch(`${BASE}/watched-paths`);
  return (await res.json()).paths;
}

// List the entries of a directory inside a watched folder ({ name, size, isDir }[]). Used by the
// folder-browser (create-unknown-file flow). Path-restricted server-side to watched folders.
export async function listFiles(path) {
  const res = await fetch(`${BASE}/files?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error(`files failed: ${res.status}`);
  return (await res.json()).entries;
}

// Recursive file listing under a folder: { files: [{ path, size }], truncated } where path is
// relative to `absRoot` ('/'-separated). Used to refresh the folder tree from disk.
export async function getTree(absRoot) {
  const res = await fetch(`${BASE}/tree?path=${encodeURIComponent(absRoot)}`);
  if (!res.ok) throw new Error(`tree failed: ${res.status}`);
  return res.json();
}

// Fetch a single file's bytes as a Blob (for rebuilding the in-memory folder on refresh).
export async function fetchFileBlob(absPath) {
  const res = await fetch(`${BASE}/file?path=${encodeURIComponent(absPath)}`);
  if (!res.ok) throw new Error(`read failed: ${res.status}`);
  return res.blob();
}

// Watch a whole FOLDER subtree via SSE: fire `onChange(event)` for any create/modify/remove whose
// path is under `rootAbs`. Returns a cleanup fn. Only opens when the companion is enabled.
export function watchFolder(rootAbs, onChange) {
  if (!isEnabled() || !rootAbs) return () => {};
  const es = new EventSource(`${BASE}/watch`);
  const norm = (p) => (p || '').replace(/\\/g, '/');
  const root = norm(rootAbs).replace(/\/+$/, '');
  es.onmessage = (e) => {
    try {
      const ev = JSON.parse(e.data);
      if (ev.kind === 'other') return;
      if (norm(ev.path).startsWith(root)) onChange(ev);
    } catch { /* ignore */ }
  };
  es.onerror = () => { /* EventSource auto-reconnects */ };
  return () => es.close();
}

// Fetch recent companion activity-log entries ({ ts, level, msg }[]), filtered server-side by
// minimum level ("info"|"warn"|"error"), a case-insensitive substring `q`, and an RFC3339 `since`
// cutoff. Used by the in-settings log viewer.
export async function getLogs({ level, q, since, limit } = {}) {
  const params = new URLSearchParams();
  if (level) params.set('level', level);
  if (q) params.set('q', q);
  if (since) params.set('since', since);
  if (limit) params.set('limit', String(limit));
  const res = await fetch(`${BASE}/logs?${params}`);
  if (!res.ok) throw new Error(`logs failed: ${res.status}`);
  return (await res.json()).entries;
}

export async function addWatchedPath(path) {
  const res = await fetch(`${BASE}/watched-paths`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Companion-Token': _token || '' },
    body: JSON.stringify({ path }),
  });
  return res.json();
}

// Browser-initiated native folder picker. Only the desktop (Tauri) companion implements this —
// the standalone server has no GUI and returns 404, in which case this resolves to null and the
// caller falls back to the typed "Add path" field.
export async function pickFolder() {
  try {
    const res = await fetch(`${BASE}/path-picker`, {
      method: 'POST',
      headers: { 'X-Companion-Token': _token || '' },
    });
    if (!res.ok) return null;        // 404 on the standalone (non-Tauri) server
    return res.json();               // { ok, chosen, paths } (ok:false if the user cancelled)
  } catch { return null; }
}

export async function removeWatchedPath(path) {
  const res = await fetch(`${BASE}/watched-paths`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', 'X-Companion-Token': _token || '' },
    body: JSON.stringify({ path }),
  });
  return res.json();
}

// Watch a specific absolute path for changes via SSE.  Only opens the
// EventSource when the companion is enabled (isEnabled() is true) AND the
// caller provides an absolutePath — so new users produce ZERO off-origin requests.
// Returns a cleanup function that closes the EventSource.
export function watchFile(absolutePath, onChanged) {
  if (!isEnabled() || !absolutePath) return () => {};

  const es = new EventSource(`${BASE}/watch`);

  es.onmessage = (e) => {
    try {
      const event = JSON.parse(e.data);
      if (event.path === absolutePath && event.kind !== 'other') {
        onChanged(event);
      }
    } catch { /* ignore parse errors */ }
  };

  es.onerror = () => {
    // EventSource reconnects automatically; suppress console noise.
  };

  return () => es.close();
}
