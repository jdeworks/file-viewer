// Folder + tree sidebar: load a dropped folder, build the file tree, open files from it (with
// per-file edit stashing), git-repo detection + browser, filename/content search, folder→zip
// export, and the resizable/keyboard-navigable sidebar. Extracted from app.js. The core load flow
// (loadIntake) and the unsaved-work guard (confirmDiscard) live in app.js and are injected via
// initFolder() so this module never imports app.js back (no circular dependency).
import { state, $, MAX_TREE_FILES, isMobile, toast, escapeHtml } from './state.js';
import { findGitDir, isGitInternal, openRepo } from './git.js';
import { renderRepoView } from './repoview.js';
import { buildTree, renderTree } from './filetree.js';
import { intakeFromFile, intakeFromText } from './intake.js';
import { exportFolderZip } from './folder-export.js';
import { downloadBlob } from './exports.js';

// Injected core-flow callbacks (set once by app.js init()).
let loadIntake = () => {};
let confirmDiscard = () => true;
export function initFolder(deps) { loadIntake = deps.loadIntake; confirmDiscard = deps.confirmDiscard; }

export async function loadFolder(entries) {
  if (!confirmDiscard()) return;               // guard unsaved work before swapping folders
  // A .git dir makes this a repository: hide git internals from the tree, surface a
  // branch/commit browser, and default to it instead of opening a file.
  const git = findGitDir(entries);
  state.repoEntries = git ? entries : null;
  state.repoHandle = null;
  let display = git ? entries.filter((e) => !isGitInternal(e.path)) : entries;
  // Tree render cap: the tree builds one DOM row per file, so an enormous file COUNT would freeze
  // the tab. Cap the rendered set and say so (the data is all still on disk; opening a file is
  // unaffected). NOTE: a future virtualized tree would lift this — see reference.md scale limits.
  const notice = $('ftNotice');
  if (display.length > MAX_TREE_FILES) {
    notice.textContent = `Large folder — showing the first ${MAX_TREE_FILES.toLocaleString()} of ${display.length.toLocaleString()} files.`;
    notice.hidden = false;
    display = display.slice(0, MAX_TREE_FILES);
  } else {
    notice.hidden = true; notice.textContent = '';
  }
  state.treeEntries = display;                 // kept for arrow-key navigation lookups
  const rootName = git ? git.repoName : (display[0]?.path.split('/')[0] || 'Folder');
  $('ftRoot').textContent = rootName;
  $('ftRoot').title = rootName;
  state.folderEdits = new Map();               // fresh folder → no tracked edits yet
  state.currentFolderPath = null;
  state.folderExported = false;
  const tree = buildTree(display);
  state.treeApi = renderTree($('ftBody'), tree, { onOpen: (node) => openTreeFile(node) });
  $('treeBtn').hidden = false;
  $('repoBtn').hidden = !git;
  $('ftExportBtn').hidden = !!git;             // export the loaded folder (not for git repos)
  $('ftSearch').hidden = !!git;                // filename/content search (not for git repos)
  $('ftSearchInput').value = '';
  $('ftSearchCount').textContent = '';
  setTree(true);

  if (git) {
    await openRepoView();                      // default to the commit/branch view
  } else {
    const pick = display.find((e) => /(^|\/)(readme|index)\.\w+$/i.test(e.path)) || display[0];
    if (pick) { state._skipDiscardGuard = true; await openTreeFile({ file: pick.file, path: pick.path }); state.treeApi.setActive(pick.path); }
  }
}

// Render the git branch/commit browser into the repo panel (parent document).
export async function openRepoView() {
  if (!state.repoEntries) return;
  $('intake').hidden = true; $('workspace').hidden = true;
  const panel = $('repoPanel'); panel.hidden = false;
  panel.innerHTML = '<p class="repo-hint">Reading repository…</p>';
  try {
    if (!state.repoHandle) state.repoHandle = await openRepo(state.repoEntries);
    if (!state.repoHandle) { panel.innerHTML = '<p class="repo-hint">Not a git repository.</p>'; return; }
    await renderRepoView(panel, state.repoHandle);
  } catch (e) {
    panel.innerHTML = '<p class="repo-hint">Could not read repository: ' + escapeHtml(e.message) + '</p>';
  }
}

async function openTreeFile(node) {
  try {
    flushFolderEdit();                 // stash any pending edit of the file we're leaving
    // If this folder file was edited earlier, reopen its edited text (edits persist across nav).
    const stashed = state.folderEdits.get(node.path);
    const intake = stashed != null
      ? intakeFromText(stashed, node.path.split('/').pop())
      : await intakeFromFile(node.file);
    state._skipDiscardGuard = true;    // folder edits are preserved in folderEdits — no discard prompt
    await loadIntake(intake);
    state.currentFolderPath = node.path;   // mark this as a folder file (loadIntake cleared it)
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
      if (text.toLowerCase().includes(ql)) matched.add(e.path);
    } catch { /* unreadable — skip */ }
  }
  const shown = state.treeApi.filter((path) => matched.has(path));
  $('ftSearchCount').textContent = shown + ' file' + (shown === 1 ? '' : 's') + ' (name + contents)';
}

// Build + download the loaded folder as a .zip (edits applied), preserving structure.
export async function exportFolder(changedOnly) {
  flushFolderEdit();
  const entries = state.treeEntries;
  if (!entries || !entries.length) return;
  if (changedOnly && state.folderEdits.size === 0) { toast('No edited files to export yet.'); return; }
  try {
    toast('Building .zip…', 1500);
    const { blob, count } = await exportFolderZip(entries, state.folderEdits, { changedOnly });
    const base = ($('ftRoot').textContent || 'folder').replace(/[^\w.-]+/g, '_');
    downloadBlob(blob, base + (changedOnly ? '-changed' : '') + '.zip');
    state.folderExported = true;       // edits are now saved out; clears the unsaved-work warning
    toast(`Exported ${count} file${count === 1 ? '' : 's'} as .zip.`);
  } catch (e) {
    toast('Could not export folder: ' + e.message);
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
  const files = [...document.querySelectorAll('#fileTree .ft-file')];
  if (!files.length) return;
  e.preventDefault();
  const cur = document.querySelector('#fileTree .ft-file.active');
  let idx = files.indexOf(cur);
  idx = e.key === 'ArrowDown' ? Math.min(files.length - 1, idx + 1) : Math.max(0, idx - 1);
  if (idx < 0) idx = 0;
  const next = files[idx];
  const entry = state.treeEntries?.find((x) => x.path === next.dataset.path);
  if (entry) { state.treeApi?.setActive(entry.path); openTreeFile({ file: entry.file, path: entry.path }); next.focus(); }
}
