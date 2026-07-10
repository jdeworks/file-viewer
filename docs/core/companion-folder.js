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
import { renderSidebarRoots } from './sidebar-roots.js';

const MAX_SYNC_FILES = 1000;
const DEBOUNCE_MS = 1200;
const LS_AUTO = 'fv:companion:autorefresh';

let getFolderContext = () => null;
let autoRefresh = false;
let _watchCleanup = null;
let _debounce = null;
let _refreshBtn = null;
let _autoBtn = null;
const _busyRoots = new WeakSet();

export function setupFolderRefresh({ getFolderContext: getter }) {
  getFolderContext = getter || getFolderContext;
  autoRefresh = localStorage.getItem(LS_AUTO) === 'true';
}

function rootInfo(context = getFolderContext()) {
  const sidebarRoot = context?.sidebarRoot;
  const root = context?.root;
  if (!sidebarRoot || !root || sidebarRoot.companionFolderRoot !== root) return null;
  const sep = (root.includes('\\') && !root.includes('/')) ? '\\' : '/';
  const base = root.endsWith(sep) ? root.slice(0, -1) : root;
  return {
    sidebarRoot,
    root,
    sep,
    base,
    linkGeneration: sidebarRoot._companionLinkGeneration || 0,
    authorizationGeneration: context.authorizationGeneration,
  };
}

const absOf = (ri, rel) => ri.base + ri.sep + rel.split('/').join(ri.sep);

function contextStillLinked(ri) {
  const current = getFolderContext();
  return !!ri
    && current?.authorizationGeneration === ri.authorizationGeneration
    && state.sidebarRoots?.includes(ri.sidebarRoot)
    && ri.sidebarRoot.companionFolderRoot === ri.root
    && (ri.sidebarRoot._companionLinkGeneration || 0) === ri.linkGeneration;
}

function contextStillActive(ri) {
  const current = rootInfo();
  return contextStillLinked(ri)
    && current?.sidebarRoot === ri.sidebarRoot
    && current.root === ri.root
    && current.linkGeneration === ri.linkGeneration;
}

function knownFor(ri) {
  const root = ri.sidebarRoot;
  if (root._companionKnownRoot !== ri.root
    || root._companionKnownGeneration !== ri.linkGeneration) {
    root._companionKnownRoot = ri.root;
    root._companionKnownGeneration = ri.linkGeneration;
    root._companionKnown = new Map();
    root._companionSeedGeneration = (root._companionSeedGeneration || 0) + 1;
  }
  return root._companionKnown;
}

function commitKnown(ri, known) {
  if (!contextStillLinked(ri)) return false;
  ri.sidebarRoot._companionSeedGeneration = (ri.sidebarRoot._companionSeedGeneration || 0) + 1;
  ri.sidebarRoot._companionKnown = known;
  return true;
}

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
async function seedKnown(ri = rootInfo()) {
  if (!ri) return;
  const seedGeneration = (ri.sidebarRoot._companionSeedGeneration || 0) + 1;
  ri.sidebarRoot._companionSeedGeneration = seedGeneration;
  try {
    const t = await getTree(ri.root);
    if (!contextStillLinked(ri)
      || ri.sidebarRoot._companionSeedGeneration !== seedGeneration) return;
    ri.sidebarRoot._companionKnown = new Map(
      (t.files || []).map((f) => [f.path, { size: f.size, mtime: f.mtime || 0 }]),
    );
    return true;
  } catch { return false; }
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
  const ri = rootInfo();
  if (!ri || !autoRefresh) return;
  _watchCleanup = watchFolder(ri.root, () => onDiskChange(ri));
}

function stopWatch() {
  if (_watchCleanup) { _watchCleanup(); _watchCleanup = null; }
  clearTimeout(_debounce);
}

function onDiskChange(ri) {
  if (!contextStillActive(ri)) return;
  clearTimeout(_debounce);
  _debounce = setTimeout(() => {
    if (contextStillActive(ri)) refreshFolderFromDisk({ silent: true });
  }, DEBOUNCE_MS);
}

export function onFolderRootResolved() {
  const ri = rootInfo();
  if (!ri) { onFolderRootCleared(); return; }
  stopWatch();
  ensureButtons();
  if (_refreshBtn) _refreshBtn.hidden = false;
  if (_autoBtn) _autoBtn.hidden = false;
  document.body.classList.add('companion-folder-active'); // reveals per-row 🗑 in the tree
  if (!knownFor(ri).size) seedKnown(ri);                  // root-scoped, stale-result guarded
  if (autoRefresh) startWatch();
}

export function onFolderRootCleared() {
  stopWatch();
  if (_refreshBtn) _refreshBtn.hidden = true;
  if (_autoBtn) _autoBtn.hidden = true;
  document.body.classList.remove('companion-folder-active');
}

export async function refreshFolderFromDisk({ manual = false, silent = false } = {}) {
  const ri = rootInfo();
  if (!ri) { if (manual) toast('No companion folder linked.'); return; }
  const root = ri.sidebarRoot;
  if (_busyRoots.has(root)) return;
  _busyRoots.add(root);
  if (_refreshBtn && contextStillActive(ri)) _refreshBtn.classList.add('ft-spin');
  try {
    if (!knownFor(ri).size) {
      await seedKnown(ri);   // ensure a baseline so we don't treat everything as new
      if (!contextStillLinked(ri)) return;
    }
    const known = new Map(knownFor(ri));

    let tree;
    try { tree = await getTree(ri.root); }
    catch (e) { if (!silent) toast('Sync failed: ' + e.message); return; }
    if (!contextStillLinked(ri)) return;

    const now = new Map((tree.files || []).map((f) => [f.path, { size: f.size, mtime: f.mtime || 0 }]));
    const added = [], modified = [], removed = [];
    for (const [p, m] of now) {
      const prev = known.get(p);
      if (!prev) added.push(p);
      else if (prev.size !== m.size || prev.mtime !== m.mtime) modified.push(p);
    }
    for (const p of known.keys()) if (!now.has(p)) removed.push(p);

    if (!added.length && !modified.length && !removed.length) {
      commitKnown(ri, now);
      if (manual && contextStillActive(ri)) toast('No changes on disk.');
      return;
    }
    if (added.length + modified.length > MAX_SYNC_FILES) { toast(`Too many changes (${added.length + modified.length}) to sync at once.`, 5000); return; }

    // Work exclusively against the captured sidebar root. Global state may point at another root
    // by the time these requests resolve, and must never be used as the refresh target.
    const byRel = new Map();
    for (const e of root.treeEntries || []) byRel.set(e.path, e);
    const folderEdits = root.folderEdits || new Map();

    const conflicts = [];
    // Removals — but keep files you have unsaved edits for (don't silently drop your work).
    for (const rel of removed) {
      if (folderEdits.has(rel)) { conflicts.push({ name: rel.split('/').pop(), kind: 'removed' }); continue; }
      byRel.delete(rel);
    }
    // Added + modified — fetch ONLY these.
    for (const rel of [...added, ...modified]) {
      let blob;
      try { blob = await fetchFileBlob(absOf(ri, rel)); }
      catch (e) { if (!silent) toast('Sync failed: ' + e.message); return; }
      if (!contextStillLinked(ri)) return;
      const file = new File([blob], rel.split('/').pop());
      if (modified.includes(rel) && folderEdits.has(rel)) {
        // Conflict: keep the local edit, add the disk version as a "(online)" sibling.
        const onlineRel = onlineName(rel);
        byRel.set(onlineRel, { file, path: onlineRel, originalPath: onlineRel });
        conflicts.push({ name: rel.split('/').pop(), kind: 'modified' });
      } else {
        const existing = byRel.get(rel);
        if (existing) byRel.set(rel, { ...existing, file });
        else byRel.set(rel, { file, path: rel, originalPath: rel });
      }
    }

    if (!contextStillLinked(ri)) return;
    root.treeEntries = [...byRel.values()];
    commitKnown(ri, now);
    if (contextStillActive(ri)) {
      state.treeEntries = root.treeEntries;
      state.folderEdits = folderEdits;
      renderSidebarRoots(root, root.currentFolderPath, { skipCapture: true });
    }

    const parts = [];
    if (added.length) parts.push(added.length + ' added');
    if (modified.length) parts.push(modified.length + ' changed');
    if (removed.length) parts.push(removed.length + ' removed');
    if (contextStillActive(ri) && (manual || !silent)) toast('Folder synced: ' + parts.join(', '));
    if (contextStillActive(ri) && conflicts.length) {
      const names = conflicts.map((c) => c.name).join(', ');
      toast(`Heads up: you have local edits in ${names}, and they also changed on disk. Your version is kept; the disk copy was added as "(online)" — open both to compare and decide.`, 9000);
    }
  } finally {
    _busyRoots.delete(root);
    if (_refreshBtn && contextStillActive(ri)) _refreshBtn.classList.remove('ft-spin');
  }
}
