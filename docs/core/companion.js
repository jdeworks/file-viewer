// Companion detection + API client for the local Axum save-back server (localhost:7700).
// All companion fetch calls are GATED behind an explicit localStorage opt-in flag so that
// users who haven't enabled the companion produce ZERO off-origin network requests.
// New users and automated smoke tests are unaffected.

const BASE = 'http://127.0.0.1:7700';
const LS_ENABLED = 'fv:companion:enabled';
const LS_TOKEN   = 'fv:companion:token';

let _token = localStorage.getItem(LS_TOKEN) || null;

export function isEnabled() { return localStorage.getItem(LS_ENABLED) === 'true'; }
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
