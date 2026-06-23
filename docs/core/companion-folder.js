// Live folder sync for a companion-linked folder. Instead of re-downloading the whole tree, it
// diffs the companion's cheap metadata listing (/tree → path + size + mtime) against the last-known
// state and fetches ONLY the files that were added or changed, removes deleted ones, and re-renders
// the tree in place (no reopen, no full refetch). A manual "⟳" button always works; an "auto" toggle
// syncs automatically (debounced) on disk changes.
//
// Conflict handling: if a file you edited locally (unsaved, in state.folderEdits) ALSO changed on
// disk, we DON'T overwrite your edit — we keep it and add the disk version as a "<name> (online).<ext>"
// sibling in the tree, so both are present and you can compare (text: cross-file Compare; binary:
// keep whichever) and decide.
import { state, toast } from './state.js';
import { getTree, fetchFileBlob, watchFolder } from './companion.js';
import { renderFolderTree } from './folder.js';

const MAX_SYNC_FILES = 1000;
const DEBOUNCE_MS = 1200;
const LS_AUTO = 'fv:companion:autorefresh';

let getFolderRoot = () => null;
let autoRefresh = false;
let _watchCleanup = null;
let _debounce = null;
let _refreshBtn = null;
let _autoBtn = null;
let _busy = false;
let _known = new Map(); // relPath -> { size, mtime }

export function setupFolderRefresh({ getFolderRoot: getter }) {
  getFolderRoot = getter || getFolderRoot;
  autoRefresh = localStorage.getItem(LS_AUTO) === 'true';
}

function rootInfo() {
  const root = getFolderRoot();
  if (!root) return null;
  const sep = (root.includes('\\') && !root.includes('/')) ? '\\' : '/';
  const base = root.endsWith(sep) ? root.slice(0, -1) : root;
  return { root, sep, base, rootName: base.split(/[\\/]/).pop() || 'Folder' };
}

const relOf = (treePath) => treePath.split('/').slice(1).join('/');   // drop the root-folder segment
const treeOf = (rootName, rel) => rootName + '/' + rel;
const absOf = (ri, rel) => ri.base + ri.sep + rel.split('/').join(ri.sep);

// "dir/name.ext" -> "dir/name (online).ext" (the kept disk version of a conflicted file).
function onlineName(rel) {
  const slash = rel.lastIndexOf('/');
  const dir = slash >= 0 ? rel.slice(0, slash + 1) : '';
  const name = slash >= 0 ? rel.slice(slash + 1) : rel;
  const dot = name.lastIndexOf('.');
  const baseName = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  return dir + baseName + ' (online)' + ext;
}

// Seed the known-state baseline from the companion (metadata only — no byte downloads).
async function seedKnown() {
  const ri = rootInfo();
  if (!ri) return;
  try {
    const t = await getTree(ri.root);
    _known = new Map((t.files || []).map((f) => [f.path, { size: f.size, mtime: f.mtime || 0 }]));
  } catch { /* offline — leave baseline, refresh will seed lazily */ }
}

function ensureButtons() {
  if (_refreshBtn) return;
  const head = document.querySelector('.ft-head');
  if (!head) return;
  _refreshBtn = document.createElement('button');
  _refreshBtn.className = 'icon-btn ft-tree-action';
  _refreshBtn.id = 'ftRefreshBtn';
  _refreshBtn.title = 'Sync folder with disk (companion)';
  _refreshBtn.setAttribute('aria-label', 'Sync folder with disk');
  _refreshBtn.textContent = '⟳';
  _refreshBtn.addEventListener('click', () => refreshFolderFromDisk({ manual: true }));

  _autoBtn = document.createElement('button');
  _autoBtn.className = 'icon-btn ft-tree-action ft-auto';
  _autoBtn.id = 'ftAutoRefreshBtn';
  _autoBtn.textContent = 'auto';
  _autoBtn.addEventListener('click', () => setAuto(!autoRefresh));

  const closeBtn = head.querySelector('.ft-close');
  head.insertBefore(_refreshBtn, closeBtn || null);
  head.insertBefore(_autoBtn, closeBtn || null);
  reflectAuto();
}

function reflectAuto() {
  if (!_autoBtn) return;
  _autoBtn.classList.toggle('ft-auto-on', autoRefresh);
  _autoBtn.title = autoRefresh
    ? 'Auto-sync ON — applies disk changes as they happen. Click to turn off.'
    : 'Auto-sync OFF — click to apply disk changes automatically.';
}

function setAuto(on) {
  autoRefresh = on;
  localStorage.setItem(LS_AUTO, on ? 'true' : 'false');
  reflectAuto();
  if (on) { startWatch(); toast('Auto-sync on — the tree updates when files change on disk.', 3000); }
  else stopWatch();
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
  _debounce = setTimeout(() => refreshFolderFromDisk({ silent: true }), DEBOUNCE_MS);
}

export function onFolderRootResolved() {
  ensureButtons();
  if (_refreshBtn) _refreshBtn.hidden = false;
  if (_autoBtn) _autoBtn.hidden = false;
  document.body.classList.add('companion-folder-active'); // reveals per-row 🗑 in the tree
  seedKnown();                                            // baseline for incremental diffs
  if (autoRefresh) startWatch();
}

export function onFolderRootCleared() {
  stopWatch();
  _known = new Map();
  if (_refreshBtn) _refreshBtn.hidden = true;
  if (_autoBtn) _autoBtn.hidden = true;
  document.body.classList.remove('companion-folder-active');
}

export async function refreshFolderFromDisk({ manual = false, silent = false } = {}) {
  const ri = rootInfo();
  if (!ri) { if (manual) toast('No companion folder linked.'); return; }
  if (_busy) return;
  _busy = true;
  if (_refreshBtn) _refreshBtn.classList.add('ft-spin');
  try {
    if (!_known.size) await seedKnown();   // ensure a baseline so we don't treat everything as new

    let tree;
    try { tree = await getTree(ri.root); }
    catch (e) { if (!silent) toast('Sync failed: ' + e.message); return; }

    const now = new Map((tree.files || []).map((f) => [f.path, { size: f.size, mtime: f.mtime || 0 }]));
    const added = [], modified = [], removed = [];
    for (const [p, m] of now) {
      const prev = _known.get(p);
      if (!prev) added.push(p);
      else if (prev.size !== m.size || prev.mtime !== m.mtime) modified.push(p);
    }
    for (const p of _known.keys()) if (!now.has(p)) removed.push(p);
    _known = now;

    if (!added.length && !modified.length && !removed.length) { if (manual) toast('No changes on disk.'); return; }
    if (added.length + modified.length > MAX_SYNC_FILES) { toast(`Too many changes (${added.length + modified.length}) to sync at once.`, 5000); return; }

    // Index current entries by their relative path.
    const byRel = new Map();
    for (const e of state.treeEntries || []) byRel.set(relOf(e.path), e);

    const conflicts = [];
    // Removals — but keep files you have unsaved edits for (don't silently drop your work).
    for (const rel of removed) {
      if (state.folderEdits.has(treeOf(ri.rootName, rel))) { conflicts.push({ name: rel.split('/').pop(), kind: 'removed' }); continue; }
      byRel.delete(rel);
    }
    // Added + modified — fetch ONLY these.
    for (const rel of [...added, ...modified]) {
      let blob;
      try { blob = await fetchFileBlob(absOf(ri, rel)); } catch { continue; }
      const file = new File([blob], rel.split('/').pop());
      const treePath = treeOf(ri.rootName, rel);
      if (modified.includes(rel) && state.folderEdits.has(treePath)) {
        // Conflict: keep the local edit, add the disk version as a "(online)" sibling.
        const onlineRel = onlineName(rel);
        byRel.set(onlineRel, { file, path: treeOf(ri.rootName, onlineRel) });
        conflicts.push({ name: rel.split('/').pop(), kind: 'modified' });
      } else {
        const existing = byRel.get(rel);
        if (existing) existing.file = file; else byRel.set(rel, { file, path: treePath });
      }
    }

    state.treeEntries = [...byRel.values()];
    const openFolders = state.treeApi?.getOpenFolders?.() || [];
    renderFolderTree({ openFolders, activePath: state.currentFolderPath });

    const parts = [];
    if (added.length) parts.push(added.length + ' added');
    if (modified.length) parts.push(modified.length + ' changed');
    if (removed.length) parts.push(removed.length + ' removed');
    if (manual || !silent) toast('Folder synced: ' + parts.join(', '));
    if (conflicts.length) {
      const names = conflicts.map((c) => c.name).join(', ');
      toast(`Heads up: you have local edits in ${names}, and they also changed on disk. Your version is kept; the disk copy was added as "(online)" — open both to compare and decide.`, 9000);
    }
  } finally {
    _busy = false;
    if (_refreshBtn) _refreshBtn.classList.remove('ft-spin');
  }
}
