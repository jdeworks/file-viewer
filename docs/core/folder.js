// Folder + tree sidebar: load a dropped folder, build the file tree, open files from it (with
// per-file edit stashing), git-repo detection + browser, filename/content search, folder→zip
// export, and the resizable/keyboard-navigable sidebar. Extracted from app.js. The core load flow
// (loadIntake) and the unsaved-work guard (confirmDiscard) live in app.js and are injected via
// initFolder() so this module never imports app.js back (no circular dependency).
import { state, $, isMobile, toast, escapeHtml } from './state.js';
import { findGitDir, isGitInternal } from './git-detect.js';
import { buildTree, renderTree } from './filetree.js';
import { FILE_LOAD_FEEDBACK_BYTES, intakeFromFile, withSourceText } from './intake.js';
import { downloadBlob } from './exports.js';
import { addFolderRoot, captureActiveSidebarRoot, renderSidebarRoots } from './sidebar-roots.js';

// Injected core-flow callbacks (set once by app.js init()).
let loadIntake = () => {};
let confirmDiscard = () => true;
let onFolderFileOpened = null; // optional callback(node) called after a tree file opens
let recoverFolderFile = null;  // optional stale-picker snapshot recovery (Companion-linked roots)
let onTreeDelete = null;       // optional callback({path,isFolder,name}) for per-row delete-on-disk
let onTreeReveal = null;       // optional callback({path,isFolder,name}) for per-row reveal-in-folder
export function initFolder(deps) {
  loadIntake = deps.loadIntake;
  confirmDiscard = deps.confirmDiscard;
  onFolderFileOpened = deps.onFolderFileOpened || null;
  recoverFolderFile = deps.recoverFolderFile || null;
  onTreeDelete = deps.onTreeDelete || null;
  onTreeReveal = deps.onTreeReveal || null;
}

// Track whether the one-time move disclaimer toast has been shown this folder session.
let _moveNoticed = false;
let _repoViewToken = 0;
let _folderSearchIndex = null;
let _contentSearchToken = 0;
let createFolderSearchIndex = null;

async function loadFolderSearchFactory() {
  if (!createFolderSearchIndex) {
    ({ createFolderSearchIndex } = await import('./folder-search-index.js'));
  }
  return createFolderSearchIndex;
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

function ensureActiveSearchIndex() {
  const root = state.sidebarRoots?.find((entry) => entry.id === state.activeSidebarRootId);
  if (!root || root.kind !== 'folder' || root.git) {
    _folderSearchIndex?.cancel();
    _folderSearchIndex = null;
    state.folderSearchIndex = null;
    return null;
  }
  if (_folderSearchIndex !== root.searchIndex) {
    _folderSearchIndex?.cancel();
    _folderSearchIndex = null;
  }
  if (!root.searchIndex || root.searchIndex.info.cancelled) {
    if (!createFolderSearchIndex) {
      void loadFolderSearchFactory().then(() => ensureActiveSearchIndex());
      return null;
    }
    root.searchIndex = createFolderSearchIndex(root.treeEntries || []);
    void root.searchIndex.done;
  }
  _folderSearchIndex = root.searchIndex;
  state.folderSearchIndex = _folderSearchIndex.info;
  return _folderSearchIndex;
}

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
  if (state.companionOperationToken || state.sidebarNavigationPending) return null;
  if (!confirmDiscard()) return null;          // explicit abort: callers must not resolve/link it
  captureActiveSidebarRoot();
  _folderSearchIndex?.cancel();
  _folderSearchIndex = null;
  state.folderSearchIndex = null;
  _contentSearchToken++;
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
  state.sessionTree = false; state.archiveTree = false; state.archiveOpenNode = null; // active folder takes over folder actions
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
    renderSidebarRoots(state.sidebarRoots?.find((root) => root.id === state.activeSidebarRootId), dest);
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
  const folderRoot = addFolderRoot({
    label: rootName,
    entries: display,
    git: !!git,
    openNode: (entry, path, options) => openTreeFile({ file: entry.file, path }, options),
    alreadyCaptured: true,
  });
  folderRoot.onMove = _onMove;
  display = folderRoot.treeEntries;
  state.treeEntries = display;
  // Restore previously-expanded folders (e.g. across a refresh) so the tree doesn't collapse.
  if (openFolders && openFolders.length) state.treeApi.openPaths(openFolders);

  try {
    showFolderLoading(git ? 'Reading git metadata…' : 'Opening default file…', { progress: 0.75 });
    await nextFrame();
    if (git) {
      await openRepoView({ auto: true, walkLimit: repoWalkLimit });  // default to the commit/branch view
    } else {
      // Prefer the explicitly-requested file (refresh re-opens what was open); else readme/index.
      const normalizedOpenPath = openPath && openPath.startsWith(rootName + '/') ? openPath.slice(rootName.length + 1) : openPath;
      const pick = (normalizedOpenPath && display.find((e) => e.path === normalizedOpenPath))
        || display.find((e) => /(^|\/)(readme|index)\.\w+$/i.test(e.path)) || display[0];
      if (pick) { state._skipDiscardGuard = true; await openTreeFile({ file: pick.file, path: pick.path }); state.treeApi.setActive(pick.path); }
    }
  } finally {
    hideFolderLoading();
  }
  if (!git) {
    const createSearchIndex = await loadFolderSearchFactory();
    folderRoot.searchIndex = createSearchIndex(display);
    if (state.activeSidebarRootId === folderRoot.id) {
      _folderSearchIndex = folderRoot.searchIndex;
      state.folderSearchIndex = _folderSearchIndex.info;
    }
    void folderRoot.searchIndex.done;
  }
  return folderRoot;
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
    const [{ openRepo }, { renderRepoView }] = await Promise.all([
      import('./git.js'),
      import('./repoview.js'),
    ]);
    if (!state.repoHandle) state.repoHandle = await openRepo(state.repoEntries);
    if (token !== _repoViewToken || (auto && state.currentFolderPath)) return;
    if (!state.repoHandle) { panel.innerHTML = '<p class="repo-hint">Not a git repository.</p>'; return; }
    const resolveRepoFile = (path) => {
      const entries = state.treeEntries || [];
      const root = state.repoHandle?.repoRoot || '';
      const normalized = root && path?.startsWith(root + '/') ? path.slice(root.length + 1) : path;
      return entries.find((entry) => entry.path === path || entry.path === normalized || entry.originalPath === path);
    };
    await renderRepoView(panel, state.repoHandle, {
      canOpenFile: (path) => !!resolveRepoFile(path),
      openFile: async (path) => {
        const entry = resolveRepoFile(path);
        if (!entry) { toast('File is not available in this folder'); return; }
        state.treeApi?.setActive?.(entry.path);
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

async function openTreeFile(node, {
  skipFolderFlush = false, sidebarNavigationToken = null,
} = {}) {
  const showReadNotice = !state.folderEdits.has(node.path) && node.file?.size >= FILE_LOAD_FEEDBACK_BYTES;
  const previousRenderPath = state.renderFolderPath;
  try {
    _repoViewToken++;
    if (!skipFolderFlush) flushFolderEdit(); // sidebar root switching captured the old edit already
    // If this folder file was edited earlier, reopen its edited text (edits persist across nav).
    const stashed = state.folderEdits.get(node.path);
    if (showReadNotice) {
      showFolderLoading('Reading ' + node.path.split('/').pop() + '…', {
        detail: Math.round(node.file.size / 1024).toLocaleString() + ' KB',
      });
      await nextFrame();
    }
    let originalIntake;
    try {
      originalIntake = await intakeFromFile(node.file);
    } catch (error) {
      const recovered = recoverFolderFile ? await recoverFolderFile(node, error).catch(() => null) : null;
      if (!recovered) throw error;
      node.file = recovered;
      const activeRoot = state.sidebarRoots?.find((root) => root.id === state.activeSidebarRootId);
      const storedEntry = activeRoot?.treeEntries?.find((entry) => entry.path === node.path);
      if (storedEntry) storedEntry.file = recovered;
      originalIntake = await intakeFromFile(recovered);
    }
    const intake = stashed != null ? withSourceText(originalIntake, stashed) : originalIntake;
    state._skipDiscardGuard = true;    // folder edits are preserved in folderEdits — no discard prompt
    state._skipSidebarRoot = true;
    // loadIntake intentionally clears currentFolderPath until the activation commits. Give
    // renderers the path being opened during that window so relative HTML dependencies resolve
    // against the right folder rather than the previously active file.
    state.renderFolderPath = node.path;
    const loaded = await loadIntake(intake, { sidebarNavigationToken });
    if (loaded === false) return false;
    state.currentFolderPath = node.path;   // mark this as a folder file (loadIntake cleared it)
    onFolderFileOpened?.(node);        // notify app.js so it can start per-file watch
    if (isMobile()) setTree(false);    // collapse the overlay after picking on phones
    return true;
  } catch (err) {
    const detail = err?.message ? ': ' + err.message : '';
    console.warn('Could not open folder entry', node.path, err);
    toast('Could not open ' + node.path + detail);
    return false;
  } finally {
    state.renderFolderPath = previousRenderPath;
    if (showReadNotice) hideFolderLoading();
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
  _contentSearchToken++;
  ensureActiveSearchIndex();
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
  const token = ++_contentSearchToken;
  const searchIndex = ensureActiveSearchIndex();
  $('ftSearchCount').textContent = 'searching…';
  const matched = new Set();
  // The append-only sidebar renders a folder entry as "<root label>/<inner path>", while
  // state.treeEntries intentionally keeps paths relative to the active root. Register both
  // spellings so a content match survives that display-path boundary. Filename filtering did
  // not expose this because it receives the already-prefixed sidebar path directly.
  const activeRoot = state.sidebarRoots?.find((root) => root.id === state.activeSidebarRootId);
  const addMatchedPath = (path) => {
    matched.add(path);
    if (activeRoot && activeRoot.kind !== 'file') matched.add(activeRoot.label + '/' + path);
  };
  const entries = state.treeEntries;
  for (let i = 0; i < entries.length; i++) {
    if (token !== _contentSearchToken || $('ftSearchInput').value.trim() !== q) return;
    const e = entries[i];
    if (e.path.toLowerCase().includes(ql)) { addMatchedPath(e.path); continue; }   // filename match
    if (e.file.size > CONTENT_SEARCH_MAX) continue;
    try {
      const text = searchIndex
        ? await searchIndex.read(e)
        : await e.file.text();
      if (text == null) continue;
      if (text.includes('\0')) continue;                  // looks binary
      if (text.toLowerCase().includes(ql)) {
        addMatchedPath(e.path);
      }
    } catch { /* unreadable — skip */ }
    if (i && i % 40 === 0) {
      $('ftSearchCount').textContent = 'searching… ' + i.toLocaleString() + '/' + entries.length.toLocaleString();
      await nextFrame();
    }
  }
  if (token !== _contentSearchToken) return;
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
    const { exportFolderZip } = await import('./folder-export.js');
    const { blob, count } = await exportFolderZip(entries, state.folderEdits, { changedOnly, moves: state.folderMoves });
    const base = ($('ftRoot').textContent || 'folder').replace(/[^\w.-]+/g, '_');
    downloadBlob(blob, base + (changedOnly ? '-changed' : '') + '.zip');
    state.folderExported = true;       // edits are now saved out; clears the unsaved-work warning
    state.downloadedSinceEdit = true;
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
  if (state.archiveExportMode === 'update-zip') {
    try {
      toast('Building archive update ZIP…', 1500);
      const { buildArchiveUpdateZip } = await import('./archive-update.js');
      const result = await buildArchiveUpdateZip(state.archiveIntake, {
        textEdits,
        binaryEdits,
        deletions,
        entries: state.treeEntries,
        sourceFormat: state.archiveSourceFormat,
      });
      const base = ($('ftRoot').textContent || 'archive').replace(/[^\w.-]+/g, '_');
      downloadBlob(result.blob, base + '-updates.zip');
      state.folderExported = true;
      state.downloadedSinceEdit = true;
      const n = result.changedCount + result.deletedCount;
      const manifestNote = result.manifestName === '_file-viewer-update.json'
        ? ''
        : ' The deletion manifest is ' + result.manifestName + '.';
      toast('Exported ' + n + ' archive update' + (n === 1 ? '' : 's') + ' in '
        + base + '-updates.zip.' + manifestNote);
    } catch (error) {
      toast('Could not export archive update: ' + error.message);
    }
    return;
  }
  try {
    toast('Repacking archive…', 1500);
    const { repackZipWithDeletions } = await import('./repack.js');
    const blob = await repackZipWithDeletions(state.archiveIntake, { textEdits, binaryEdits, deletions });
    const base = ($('ftRoot').textContent || 'archive').replace(/[^\w.-]+/g, '_');
    downloadBlob(blob, 'edited-' + base);
    state.folderExported = true;
    state.downloadedSinceEdit = true;
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
    currentPath: state.renderFolderPath || state.currentFolderPath || null,
    open: async (file) => {
      const node = files.find((f) => f.file === file);
      if (!node) return;
      if (state.archiveTree && state.archiveOpenNode) {
        await state.archiveOpenNode(node.path);
        return;
      }
      state._skipDiscardGuard = true;                 // media playback advance: nothing unsaved
      state._skipSidebarRoot = true;
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
