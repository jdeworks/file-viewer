// Folder + tree sidebar: load a dropped folder, build the file tree, open files from it (with
// per-file edit stashing), git-repo detection + browser, filename/content search, folder→zip
// export, and the resizable/keyboard-navigable sidebar. Extracted from app.js. The core load flow
// (loadIntake) and the unsaved-work guard (confirmDiscard) live in app.js and are injected via
// initFolder() so this module never imports app.js back (no circular dependency).
import { state, $, isMobile, toast, escapeHtml } from './state.js';
import { findGitDir, isGitInternal, openRepo } from './git.js';
import { renderRepoView } from './repoview.js';
import { buildTree, renderTree } from './filetree.js';
import { intakeFromFile, intakeFromText } from './intake.js';
import { exportFolderZip } from './folder-export.js';
import { downloadBlob } from './exports.js';
import { repackZipWithDeletions } from './repack.js';
import { recordStage2SearchResult } from '../games/metagame/viewer-actions.js';

// Injected core-flow callbacks (set once by app.js init()).
let loadIntake = () => {};
let confirmDiscard = () => true;
let onFolderFileOpened = null; // optional callback(node) called after a tree file opens
let onTreeDelete = null;       // optional callback({path,isFolder,name}) for per-row delete-on-disk
let onTreeReveal = null;       // optional callback({path,isFolder,name}) for per-row reveal-in-folder
export function initFolder(deps) {
  loadIntake = deps.loadIntake;
  confirmDiscard = deps.confirmDiscard;
  onFolderFileOpened = deps.onFolderFileOpened || null;
  onTreeDelete = deps.onTreeDelete || null;
  onTreeReveal = deps.onTreeReveal || null;
}

// Track whether the one-time move disclaimer toast has been shown this folder session.
let _moveNoticed = false;
let _repoViewToken = 0;

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

export function showFolderLoading(message, { progress = null, detail = '' } = {}) {
  const notice = $('ftNotice');
  const label = document.createElement('div');
  label.className = 'ft-loading-label';
  label.textContent = message;
  const bar = document.createElement('div');
  bar.className = 'ft-loading-bar' + (Number.isFinite(progress) ? '' : ' indeterminate');
  if (Number.isFinite(progress)) bar.style.setProperty('--p', Math.max(0, Math.min(1, progress)));
  notice.className = 'ft-notice ft-loading';
  notice.replaceChildren(label, bar);
  if (detail) {
    const extra = document.createElement('div');
    extra.className = 'ft-loading-detail';
    extra.textContent = detail;
    notice.appendChild(extra);
  }
  notice.hidden = false;
}

export function hideFolderLoading() {
  const notice = $('ftNotice');
  notice.hidden = true;
  notice.className = 'ft-notice';
  notice.textContent = '';
}

// Record a file move (src → dest path). Transfers any in-memory edit to the new path.
export function recordMove(src, dest) {
  const entry = state.treeEntries?.find((e) => e.path === src);
  const origin = entry?.originalPath || src;
  const currentDest = state.folderMoves.get(origin);
  const editKey = state.folderEdits.has(src) ? src : (currentDest && state.folderEdits.has(currentDest) ? currentDest : null);
  if (editKey) {
    state.folderEdits.set(dest, state.folderEdits.get(editKey));
    state.folderEdits.delete(editKey);
  }
  if (dest === origin) state.folderMoves.delete(origin);
  else state.folderMoves.set(origin, dest);
  if (state.currentFolderPath === src) state.currentFolderPath = dest;
}

// Module-level re-entrant onMove handler so it can reference itself after a tree rebuild.
let _onMove = null;

export async function loadFolder(entries, { repoWalkLimit, openPath, openFolders } = {}) {
  if (!confirmDiscard()) return;               // guard unsaved work before swapping folders
  // A .git dir makes this a repository: hide git internals from the tree, surface a
  // branch/commit browser, and default to it instead of opening a file.
  const git = findGitDir(entries);
  state.repoEntries = git ? entries : null;
  state.repoHandle = null;
  let display = git ? entries.filter((e) => !isGitInternal(e.path)) : entries;
  display = display.map((e) => ({ ...e, originalPath: e.originalPath || e.path }));
  state.treeEntries = display;                 // kept for arrow-key navigation lookups
  const rootName = git ? git.repoName : (display[0]?.path.split('/')[0] || 'Folder');
  $('ftRoot').textContent = rootName;
  $('ftRoot').title = rootName;
  $('ftBody').innerHTML = '';
  showFolderLoading('Preparing ' + rootName + '…', { progress: 0.1, detail: entries.length.toLocaleString() + ' file' + (entries.length === 1 ? '' : 's') });
  state.folderEdits = new Map();               // fresh folder → no tracked edits yet
  state.folderMoves = new Map();               // fresh folder → no in-memory moves yet
  state.currentFolderPath = null;
  state.sessionTree = false; state.archiveTree = false; state.archiveOpenNode = null; state.sessionIntakes = new Map(); state.sessionEdits = new Map(); // real folder takes over sidebar
  state.folderExported = false;
  _moveNoticed = false;

  _onMove = (src, destFolder) => {
    const fname = src.split('/').pop();
    const dest = destFolder ? destFolder + '/' + fname : fname;
    if (dest === src) return;
    if (state.treeEntries.some((e) => e.path === dest && e.path !== src)) { toast('A file already exists at ' + dest); return; }
    recordMove(src, dest);
    const entry = state.treeEntries.find((e) => e.path === src);
    if (entry) entry.path = dest;
    if (state.treeApi) state.treeApi.stop();
    state.treeApi = renderTree($('ftBody'), buildTree(state.treeEntries), {
      onOpen: (node) => openTreeFile(node),
      onMove: _onMove,
      onDelete: (t) => onTreeDelete?.(t), onReveal: (t) => onTreeReveal?.(t),
      initialOpenDepth: 0,
    });
    for (const movedDest of state.folderMoves.values()) state.treeApi.setMoved(movedDest, movedDest);
    state.treeApi.setActive(dest);
    toast('Moved to ' + dest);
    if (!_moveNoticed) {
      _moveNoticed = true;
      setTimeout(() => toast('Moves are in-memory only. Download the folder to save changes or run _moves.sh.'), 2700);
    }
  };

  $('treeBtn').hidden = false;
  $('repoBtn').hidden = !git;
  $('ftExportBtn').hidden = !!git;             // export the loaded folder (not for git repos)
  $('ftExpandBtn').hidden = false;
  $('ftCollapseBtn').hidden = false;
  $('ftSearch').hidden = !!git;                // filename/content search (not for git repos)
  $('ftSearchInput').value = '';
  $('ftSearchCount').textContent = '';
  setTree(true);
  await nextFrame();

  showFolderLoading('Building file tree…', { progress: 0.45, detail: display.length.toLocaleString() + ' visible file' + (display.length === 1 ? '' : 's') });
  await nextFrame();
  const tree = buildTree(display);
  state.treeApi = renderTree($('ftBody'), tree, { onOpen: (node) => openTreeFile(node), onMove: _onMove, onDelete: (t) => onTreeDelete?.(t), onReveal: (t) => onTreeReveal?.(t), initialOpenDepth: 0 });
  // Restore previously-expanded folders (e.g. across a refresh) so the tree doesn't collapse.
  if (openFolders && openFolders.length) state.treeApi.openPaths(openFolders);

  try {
    showFolderLoading(git ? 'Reading git metadata…' : 'Opening default file…', { progress: 0.75 });
    await nextFrame();
    if (git) {
      await openRepoView({ auto: true, walkLimit: repoWalkLimit });  // default to the commit/branch view
    } else {
      // Prefer the explicitly-requested file (refresh re-opens what was open); else readme/index.
      const pick = (openPath && display.find((e) => e.path === openPath))
        || display.find((e) => /(^|\/)(readme|index)\.\w+$/i.test(e.path)) || display[0];
      if (pick) { state._skipDiscardGuard = true; await openTreeFile({ file: pick.file, path: pick.path }); state.treeApi.setActive(pick.path); }
    }
  } finally {
    hideFolderLoading();
  }
}

// Re-render the tree from the CURRENT state.treeEntries without reopening files or refetching bytes
// (used by the incremental folder refresh). Preserves expanded folders, the active row, and the
// edited/moved markers. The open file in the viewer is left untouched.
export function renderFolderTree({ openFolders = [], activePath = null } = {}) {
  if (state.treeApi) state.treeApi.stop();
  state.treeApi = renderTree($('ftBody'), buildTree(state.treeEntries), {
    onOpen: (node) => openTreeFile(node),
    onMove: _onMove,
    onDelete: (t) => onTreeDelete?.(t), onReveal: (t) => onTreeReveal?.(t),
    initialOpenDepth: 0,
  });
  if (openFolders.length) state.treeApi.openPaths(openFolders);
  for (const dest of state.folderMoves.values()) state.treeApi.setMoved(dest, dest);
  for (const p of state.folderEdits.keys()) state.treeApi.setEdited(p, true);
  if (activePath) state.treeApi.setActive(activePath);
}

// Render the git branch/commit browser into the repo panel (parent document).
export async function openRepoView({ auto = false, walkLimit } = {}) {
  if (!state.repoEntries) return;
  const token = ++_repoViewToken;
  $('intake').hidden = true; $('workspace').hidden = true;
  const panel = $('repoPanel'); panel.hidden = false;
  panel.innerHTML = '<p class="repo-hint">Reading repository…</p>';
  try {
    if (!state.repoHandle) state.repoHandle = await openRepo(state.repoEntries);
    if (token !== _repoViewToken || (auto && state.currentFolderPath)) return;
    if (!state.repoHandle) { panel.innerHTML = '<p class="repo-hint">Not a git repository.</p>'; return; }
    await renderRepoView(panel, state.repoHandle, {
      canOpenFile: (path) => state.treeEntries?.some((entry) => entry.path === path),
      openFile: async (path) => {
        const entry = state.treeEntries?.find((item) => item.path === path);
        if (!entry) { toast('File is not available in this folder'); return; }
        state.treeApi?.setActive?.(path);
        await openTreeFile({ file: entry.file, path: entry.path });
      },
      walkLimit,
    });
    if (token !== _repoViewToken || (auto && state.currentFolderPath)) panel.hidden = true;
  } catch (e) {
    if (token !== _repoViewToken || (auto && state.currentFolderPath)) return;
    panel.innerHTML = '<p class="repo-hint">Could not read repository: ' + escapeHtml(e.message) + '</p>';
  }
}

async function openTreeFile(node) {
  try {
    _repoViewToken++;
    flushFolderEdit();                 // stash any pending edit of the file we're leaving
    // If this folder file was edited earlier, reopen its edited text (edits persist across nav).
    const stashed = state.folderEdits.get(node.path);
    const intake = stashed != null
      ? intakeFromText(stashed, node.path.split('/').pop())
      : await intakeFromFile(node.file);
    state._skipDiscardGuard = true;    // folder edits are preserved in folderEdits — no discard prompt
    await loadIntake(intake);
    state.currentFolderPath = node.path;   // mark this as a folder file (loadIntake cleared it)
    onFolderFileOpened?.(node);        // notify app.js so it can start per-file watch
    if (isMobile()) setTree(false);    // collapse the overlay after picking on phones
  } catch (err) {
    toast('Could not open ' + node.path);
  }
}

// Stash the current folder file's edit (if any) into folderEdits and mark it in the tree.
export function flushFolderEdit() {
  if (state.currentFolderPath && state.rawview && state.rawview.isDirty()) {
    state.folderEdits.set(state.currentFolderPath, state.rawview.getValue());
    state.treeApi?.setEdited?.(state.currentFolderPath, true);
  }
}

/* ── Folder search: filter by filename (live) + contents (on Enter) ── */

const CONTENT_SEARCH_MAX = 2 * 1024 * 1024;   // skip files larger than this for content search

export function onTreeSearchInput() {
  if (!state.treeApi) return;
  const q = $('ftSearchInput').value.trim().toLowerCase();
  if (!q) { state.treeApi.clearFilter(); $('ftSearchCount').textContent = ''; return; }
  const shown = state.treeApi.filter((path) => path.toLowerCase().includes(q));
  $('ftSearchCount').textContent = shown + ' match' + (shown === 1 ? '' : 'es');
}

// Content search (on Enter): read each text file (capped) and keep those whose text contains the
// query — unioned with filename matches. Reads lazily off disk; binary/huge files are skipped.
export async function searchTreeContents() {
  if (!state.treeApi || !state.treeEntries) return;
  const q = $('ftSearchInput').value.trim();
  if (!q) { state.treeApi.clearFilter(); $('ftSearchCount').textContent = ''; return; }
  const ql = q.toLowerCase();
  $('ftSearchCount').textContent = 'searching…';
  const matched = new Set();
  for (const e of state.treeEntries) {
    if (e.path.toLowerCase().includes(ql)) { matched.add(e.path); continue; }   // filename match
    if (e.file.size > CONTENT_SEARCH_MAX) continue;
    try {
      const text = await e.file.text();
      if (text.includes('\0')) continue;                  // looks binary
      if (text.toLowerCase().includes(ql)) {
        matched.add(e.path);
        const line = text.split(/\r?\n/).find((entry) => entry.includes(q));
        recordStage2SearchResult({ file: e.path, query: q, result: line && line.trim() });
      }
    } catch { /* unreadable — skip */ }
  }
  const shown = state.treeApi.filter((path) => matched.has(path));
  $('ftSearchCount').textContent = shown + ' file' + (shown === 1 ? '' : 's') + ' (name + contents)';
}

// Build + download the loaded folder as a .zip (edits applied), preserving structure.
// When in archive mode, repacks the original zip with edits applied instead.
export async function exportFolder(changedOnly) {
  if (state.archiveTree) { await repackArchive(); return; }
  flushFolderEdit();
  const entries = state.treeEntries;
  if (!entries || !entries.length) return;
  if (changedOnly && state.folderEdits.size === 0 && state.folderMoves.size === 0) { toast('No edited files or moves to export yet.'); return; }
  try {
    toast('Building .zip…', 1500);
    const { blob, count } = await exportFolderZip(entries, state.folderEdits, { changedOnly, moves: state.folderMoves });
    const base = ($('ftRoot').textContent || 'folder').replace(/[^\w.-]+/g, '_');
    downloadBlob(blob, base + (changedOnly ? '-changed' : '') + '.zip');
    state.folderExported = true;       // edits are now saved out; clears the unsaved-work warning
    toast(`Exported ${count} file${count === 1 ? '' : 's'} as .zip.`);
  } catch (e) {
    toast('Could not export folder: ' + e.message);
  }
}

async function repackArchive() {
  flushFolderEdit();
  if (!state.archiveIntake) { toast('Cannot repack: original archive not available.'); return; }
  const textEdits = state.folderEdits || new Map();
  const binaryEdits = state.binaryEdits || new Map();
  const deletions = state.archiveDeletes || new Set();
  if (textEdits.size === 0 && binaryEdits.size === 0 && deletions.size === 0) { toast('No edits or deletions to export yet.'); return; }
  try {
    toast('Repacking archive…', 1500);
    const blob = await repackZipWithDeletions(state.archiveIntake, { textEdits, binaryEdits, deletions });
    const base = ($('ftRoot').textContent || 'archive').replace(/[^\w.-]+/g, '_');
    downloadBlob(blob, 'edited-' + base);
    state.folderExported = true;
    const n = textEdits.size + binaryEdits.size + deletions.size;
    toast('Archive saved with ' + n + ' change' + (n === 1 ? '' : 's') + '.');
  } catch (e) {
    toast('Could not repack archive: ' + e.message);
  }
}

// Generic folder context handed to every renderer: the sibling files (when a folder is loaded)
// + a callback to open one. Renderers that care about siblings (e.g. media → playlist) use it;
// others ignore it. Kept type-agnostic so core stays free of per-type logic.
export function folderContext() {
  const files = (state.treeEntries || []).map((e) => ({ file: e.file, path: e.path }));
  return {
    files,
    open: async (file) => {
      const node = files.find((f) => f.file === file);
      if (!node) return;
      if (state.archiveTree && state.archiveOpenNode) {
        await state.archiveOpenNode(node.path);
        return;
      }
      state._skipDiscardGuard = true;                 // media playback advance: nothing unsaved
      await loadIntake(await intakeFromFile(file));
      state.treeApi?.setActive?.(node.path);
    },
  };
}

/* ── Sidebar tree UI: show/hide, resizable width, keyboard navigation ── */

export function setTree(open) {
  $('fileTree').hidden = !open;
  $('ftResize').hidden = !open || isMobile();   // resizer only for the desktop docked sidebar
  if (isMobile()) $('scrim').hidden = !open;
}

const TREE_MIN = 170, TREE_MAX = 560;
function applyTreeWidth(px) {
  const w = Math.max(TREE_MIN, Math.min(TREE_MAX, px));
  $('fileTree').style.flex = '0 0 ' + w + 'px';
  $('fileTree').style.width = w + 'px';
  try { localStorage.setItem('fv:treeWidth', String(w)); } catch {}
}

export function initTreeResize() {
  const saved = Number(localStorage.getItem('fv:treeWidth'));
  if (saved) applyTreeWidth(saved);
  $('ftExpandBtn').addEventListener('click', () => state.treeApi?.expandAll?.());
  $('ftCollapseBtn').addEventListener('click', () => state.treeApi?.collapseAll?.());
  const handle = $('ftResize');
  let dragging = false;
  const onMove = (e) => {
    if (!dragging) return;
    const left = $('fileTree').getBoundingClientRect().left;
    applyTreeWidth((e.touches ? e.touches[0].clientX : e.clientX) - left);
    state.treeApi?.refresh();          // re-evaluate the active-name marquee at the new width
    e.preventDefault();
  };
  const onUp = () => {
    dragging = false;
    document.body.style.userSelect = '';
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  };
  handle.addEventListener('pointerdown', (e) => {
    if (handle.hidden) return;
    dragging = true;
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    e.preventDefault();
  });
}

// Arrow-key navigation: when enabled and the sidebar has focus, ↑/↓ move between files
// and open them. Click a file first to focus the tree.
export function onTreeKey(e) {
  if (!state.settingsModel?.values?.treeArrowKeys) return;
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  e.preventDefault();
  state.treeApi?.navigate(e.key === 'ArrowDown' ? 1 : -1);
}
