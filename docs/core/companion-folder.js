// Live folder refresh: re-read a companion-linked folder from disk and rebuild the sidebar tree, so
// files created/deleted on disk show up. A manual "⟳ Refresh" button always works; an "auto" toggle
// refreshes automatically (debounced) when the companion reports a change under the folder root.
//
// Refresh fetches each file's bytes into a real File object and reuses loadFolder() — so the whole
// existing tree/open/search/export pipeline keeps working unchanged. It's capped to keep large
// folders fast, and auto-refresh never clobbers unsaved edits (it nudges instead).
import { $, state, toast } from './state.js';
import { getTree, fetchFileBlob, watchFolder } from './companion.js';

const MAX_REFRESH_FILES = 1000;
const DEBOUNCE_MS = 1200;
const LS_AUTO = 'fv:companion:autorefresh';

let loadFolderCb = null;
let getFolderRoot = () => null;
let autoRefresh = false;
let _watchCleanup = null;
let _debounce = null;
let _refreshBtn = null;
let _autoBtn = null;
let _busy = false;

export function setupFolderRefresh({ loadFolder, getFolderRoot: getter }) {
  loadFolderCb = loadFolder;
  getFolderRoot = getter || getFolderRoot;
  autoRefresh = localStorage.getItem(LS_AUTO) === 'true';
}

function ensureButtons() {
  if (_refreshBtn) return;
  const head = document.querySelector('.ft-head');
  if (!head) return;
  _refreshBtn = document.createElement('button');
  _refreshBtn.className = 'icon-btn ft-tree-action';
  _refreshBtn.id = 'ftRefreshBtn';
  _refreshBtn.title = 'Refresh folder from disk (companion)';
  _refreshBtn.setAttribute('aria-label', 'Refresh folder from disk');
  _refreshBtn.textContent = '⟳';
  _refreshBtn.addEventListener('click', () => refreshFolderFromDisk({ manual: true }));

  _autoBtn = document.createElement('button');
  _autoBtn.className = 'icon-btn ft-tree-action ft-auto';
  _autoBtn.id = 'ftAutoRefreshBtn';
  _autoBtn.textContent = 'auto';
  _autoBtn.addEventListener('click', () => setAuto(!autoRefresh));

  // Insert before the close button if present, else append.
  const closeBtn = head.querySelector('.ft-close');
  head.insertBefore(_refreshBtn, closeBtn || null);
  head.insertBefore(_autoBtn, closeBtn || null);
  reflectAuto();
}

function reflectAuto() {
  if (!_autoBtn) return;
  _autoBtn.classList.toggle('ft-auto-on', autoRefresh);
  _autoBtn.title = autoRefresh
    ? 'Auto-refresh ON — re-reads the folder when files change on disk. Click to turn off.'
    : 'Auto-refresh OFF — click to re-read the folder automatically on disk changes.';
}

function setAuto(on) {
  autoRefresh = on;
  localStorage.setItem(LS_AUTO, on ? 'true' : 'false');
  reflectAuto();
  if (on) startWatch(); else stopWatch();
  if (on) toast('Auto-refresh on — the tree updates when files change on disk.', 3000);
}

function startWatch() {
  stopWatch();
  const root = getFolderRoot();
  if (!root || !autoRefresh) return;
  _watchCleanup = watchFolder(root, () => onDiskChange());
}

function stopWatch() {
  if (_watchCleanup) { _watchCleanup(); _watchCleanup = null; }
  clearTimeout(_debounce);
}

function onDiskChange() {
  clearTimeout(_debounce);
  _debounce = setTimeout(() => {
    // Never discard unsaved edits silently — nudge the user to refresh manually instead.
    const dirty = (state.folderEdits && state.folderEdits.size > 0) || !!state.rawview?.isDirty?.();
    if (dirty) { toast('Folder changed on disk — click ⟳ to refresh (you have unsaved edits).', 5000); return; }
    refreshFolderFromDisk({ silent: true });
  }, DEBOUNCE_MS);
}

// Called by companion-ui when a folder root resolves / clears.
export function onFolderRootResolved() {
  ensureButtons();
  if (_refreshBtn) _refreshBtn.hidden = false;
  if (_autoBtn) _autoBtn.hidden = false;
  document.body.classList.add('companion-folder-active'); // reveals per-row 🗑 in the tree
  if (autoRefresh) startWatch();
}

export function onFolderRootCleared() {
  stopWatch();
  if (_refreshBtn) _refreshBtn.hidden = true;
  if (_autoBtn) _autoBtn.hidden = true;
  document.body.classList.remove('companion-folder-active');
}

export async function refreshFolderFromDisk({ manual = false, silent = false } = {}) {
  const root = getFolderRoot();
  if (!root) { if (manual) toast('No companion folder linked.'); return; }
  if (_busy) return;
  _busy = true;
  if (_refreshBtn) _refreshBtn.classList.add('ft-spin');
  try {
    let tree;
    try { tree = await getTree(root); }
    catch (e) { if (!silent) toast('Refresh failed: ' + e.message); return; }
    const files = tree.files || [];
    if (files.length > MAX_REFRESH_FILES) {
      toast(`Folder has ${files.length} files (over ${MAX_REFRESH_FILES}) — refresh skipped to stay fast.`, 5000);
      return;
    }
    if (tree.truncated) toast('Folder is very large — refreshed a partial view.', 4000);

    const sep = (root.includes('\\') && !root.includes('/')) ? '\\' : '/';
    const baseNoTrail = root.endsWith(sep) ? root.slice(0, -1) : root;
    const rootName = baseNoTrail.split(/[\\/]/).pop() || 'Folder';
    // Preserve what's open so a refresh doesn't collapse the tree or jump off the current file.
    const prevActive = state.currentFolderPath;
    const prevOpen = state.treeApi?.getOpenFolders?.() || [];

    const entries = [];
    for (const f of files) {
      const abs = baseNoTrail + sep + f.path.split('/').join(sep);
      let blob;
      try { blob = await fetchFileBlob(abs); } catch { continue; }
      entries.push({ file: new File([blob], f.path.split('/').pop()), path: rootName + '/' + f.path });
    }
    if (!entries.length) { if (!silent) toast('Folder is empty or unreadable.'); return; }

    state._skipDiscardGuard = true;   // we already guard unsaved edits before auto-refresh
    await loadFolderCb(entries, { openPath: prevActive, openFolders: prevOpen });
    if (!silent) toast('Folder refreshed from disk (' + entries.length + ' files)');
  } finally {
    _busy = false;
    if (_refreshBtn) _refreshBtn.classList.remove('ft-spin');
  }
}
