// Core shell orchestrator (WP02): intake -> detect -> load type module -> lay out
// raw (Monaco) + preview (sandboxed iframe) per capability and viewport.
// Settings here are intentionally minimal; WP03 replaces buildSettings() with the
// full descriptor-driven system. The contract this file consumes is frozen.

import { REGISTRY, getType, FALLBACK_TYPE } from './registry.js';
import { pickType } from './detect.js';
import { wireIntake, intakeFromFile, intakeFromText, LARGE_FILE_BYTES } from './intake.js';
import { buildTree, renderTree } from './filetree.js';
import { findGitDir, isGitInternal, openRepo } from './git.js';
import { matchKnown } from '../known/registry.js';
import { renderRepoView } from './repoview.js';
import { createRawView } from './rawview.js';
import { loadMonaco } from './monaco-loader.js';
import { hexDump } from './hexdump.js';
import { initOffline, offlineMissHtml } from './offline.js';
import * as persistence from './persistence.js';
import { suppressInstallPrompt } from './ios-audio.js';
import { registerCodeMetrics } from '../types/code/codelens.js';
import { getExports, hasExports } from './exports.js';
import { mountPreview, captureBodyHtml } from './iframe.js';
import { getModel, preloadModels, monacoOptions, renderSettings, persistGlobalKey, syncModelPreset } from './settings.js';
import { previewStyle } from './settings-schema.js';
import { initGames } from '../games/launcher.js';

const $ = (id) => document.getElementById(id);
const MAX_TREE_FILES = 20000;   // cap rendered tree rows so a huge file count can't freeze the tab
const state = {
  intake: null,
  type: null,
  settingsModel: null,   // WP03 settings model for the active type
  rawview: null,         // WP13 RawView controller (owns original+current models, 4 modes)
  preview: null,         // iframe controller
  rawMode: 'current',    // original | current | diff | movediff
  mode: 'split',         // desktop view mode: raw | split | preview
  tab: 'raw',            // mobile active tab
  syncing: false,
  treeApi: null,         // folder tree controller (setActive)
  htmlAllowScripts: false,
  htmlAsked: false,
  known: null,           // matched known-file enhancement (Layer 3), or null
  forceBase: false,      // user toggled "show the plain view" -> bypass the enhancement
};

const isMobile = () => window.matchMedia('(max-width: 760px)').matches;

function toast(msg, ms = 2600) {
  const t = $('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.hidden = true), ms);
}

/* ─────────────────────────── Intake → render ─────────────────────────── */

async function loadIntake(intake) {
  // Guard unsaved work — unless loadFolder already asked for this same action.
  if (state._skipDiscardGuard) state._skipDiscardGuard = false;
  else if (!confirmDiscard()) return;
  if (intake.truncated) {
    const mb = (intake.size / 1048576).toFixed(0);
    const shown = (intake.loadedBytes / 1048576).toFixed(0);
    if (!confirm(`This file is ${mb} MB — too large to load fully. Only the first ${shown} MB will be shown. Open anyway?`)) return;
  } else if (!intake.streamed && intake.size > LARGE_FILE_BYTES) {
    const mb = (intake.size / 1048576).toFixed(1);
    if (!confirm(`This file is ${mb} MB. Large files may be slow in the editor. Open anyway?`)) return;
  }
  state.downloadedSinceEdit = true;    // fresh document — nothing unsaved yet
  state.intake = intake;
  const { type, ranking } = pickType(intake);
  populateTypeSelect(ranking, type.id);
  await activateType(type);
  if (intake.truncated) {
    const shown = (intake.loadedBytes / 1048576).toFixed(0);
    const total = (intake.size / 1048576).toFixed(0);
    toast(`Large file: showing the first ${shown} MB of ${total} MB.`, 6000);
  }
}

// Create a new, empty file and open it in the editor. The name's extension drives type detection,
// so "notes.md" opens as Markdown, "main.py" as Python code, etc. The surface for the
// `import easteregg` unlock too (see onRawEdited).
function createNewFile() {
  const name = prompt('New file name (include an extension, e.g. notes.md, script.js, data.json):', 'untitled.txt');
  if (name == null) return;                         // cancelled
  const filename = (name.trim() || 'untitled.txt');
  loadIntake(intakeFromText('', filename));
}

// Return to the intake screen to pick another file/folder (keeps any loaded tree).
function showIntake() {
  $('intake').hidden = false;
  $('workspace').hidden = true;
  $('repoPanel').hidden = true;
}

/* ─────────────────────────── Folder tree (sidebar) ─────────────────────────── */

async function loadFolder(entries) {
  if (!confirmDiscard()) return;               // guard unsaved work before swapping folders
  // A .git dir makes this a repository: hide git internals from the tree, surface a
  // branch/commit browser, and default to it instead of opening a file.
  const git = findGitDir(entries);
  state.repoEntries = git ? entries : null;
  state.repoHandle = null;
  let display = git ? entries.filter((e) => !isGitInternal(e.path)) : entries;
  // Tree render cap: the tree builds one DOM row per file, so an enormous file COUNT would freeze
  // the tab. Cap the rendered set and say so (the data is all still on disk; opening a file is
  // unaffected). NOTE: a future virtualized tree would lift this — see [[scale-limits]].
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
  const tree = buildTree(display);
  state.treeApi = renderTree($('ftBody'), tree, { onOpen: (node) => openTreeFile(node) });
  $('treeBtn').hidden = false;
  $('repoBtn').hidden = !git;
  setTree(true);

  if (git) {
    await openRepoView();                      // default to the commit/branch view
  } else {
    const pick = display.find((e) => /(^|\/)(readme|index)\.\w+$/i.test(e.path)) || display[0];
    if (pick) { state._skipDiscardGuard = true; await openTreeFile({ file: pick.file, path: pick.path }); state.treeApi.setActive(pick.path); }
  }
}

// Render the git branch/commit browser into the repo panel (parent document).
async function openRepoView() {
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
function hideRepo() { $('repoPanel').hidden = true; }

async function openTreeFile(node) {
  try {
    await loadIntake(await intakeFromFile(node.file));
    if (isMobile()) setTree(false);   // collapse the overlay after picking on phones
  } catch (err) {
    toast('Could not open ' + node.path);
  }
}

// Generic folder context handed to every renderer: the sibling files (when a folder is loaded)
// + a callback to open one. Renderers that care about siblings (e.g. media → playlist) use it;
// others ignore it. Kept type-agnostic so core stays free of per-type logic.
function folderContext() {
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

// On phones, keep only the essentials in the top bar (tree, file name, open, fullscreen)
// and move the rest into the ⋯ popover. On desktop the controls return to their original
// spots (same DOM nodes, so their handlers + hidden-state logic keep working).
const OVERFLOW_IDS = ['typeSelect', 'rawMode', 'formatBtn', 'downloadBtn', 'screenshotBtn', 'exportBtn', 'metaBtn', 'settingsBtn', 'themeBtn'];
let overflowAnchors = null;
function layoutTopbar() {
  if (!overflowAnchors) {
    overflowAnchors = OVERFLOW_IDS.map((id) => { const el = $(id); return { el, parent: el.parentNode, next: el.nextSibling }; });
  }
  const menu = $('moreMenu');
  if (isMobile()) {
    for (const { el } of overflowAnchors) menu.appendChild(el);   // array order = menu order
    $('moreBtn').hidden = false;
  } else {
    for (const { el, parent, next } of overflowAnchors) parent.insertBefore(el, next);
    $('moreBtn').hidden = true;
    closeMoreMenu();
  }
}
function toggleMoreMenu() {
  const menu = $('moreMenu');
  const open = menu.hidden;
  menu.hidden = !open;
  $('moreBtn').setAttribute('aria-expanded', String(open));
}
function closeMoreMenu() { $('moreMenu').hidden = true; $('moreBtn').setAttribute('aria-expanded', 'false'); }

// Export / Download-as menu — populated on open from core + per-type export actions.
function updateExportButton() { $('exportBtn').hidden = !hasExports(state); }
function closeExportMenu() { $('exportMenu').hidden = true; $('exportBtn').setAttribute('aria-expanded', 'false'); }
async function toggleExportMenu() {
  const menu = $('exportMenu');
  if (!menu.hidden) { closeExportMenu(); return; }
  menu.innerHTML = '<div class="export-loading">…</div>';
  menu.hidden = false;
  $('exportBtn').setAttribute('aria-expanded', 'true');
  const items = await getExports(state, { previewStyle: previewStyle(state.settingsModel.values) });
  if ($('exportMenu').hidden) return;                          // closed while loading
  menu.innerHTML = '';
  if (!items.length) { menu.innerHTML = '<div class="export-loading">No exports available</div>'; return; }
  for (const it of items) {
    const b = document.createElement('button');
    b.className = 'export-item';
    b.textContent = it.label;
    b.addEventListener('click', async () => { closeExportMenu(); try { await it.run(); } catch (e) { toast('Export failed: ' + e.message); } });
    menu.appendChild(b);
  }
}

function setTree(open) {
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

function initTreeResize() {
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
function onTreeKey(e) {
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

function populateTypeSelect(ranking, selectedId) {
  const sel = $('typeSelect');
  // Scores are INDEPENDENT per-type confidences (each detector returns 0..1 on its own),
  // not a distribution that sums to 100%. The `raw`/Plain-text fallback only returns a
  // tiny floor so it always ranks last-but-present — that's a tiebreaker, not a real
  // match, so we never show it as a percentage. By default we list only plausible
  // matches (≥1%); "Show all file types" reveals every registered type. The selected
  // type is always shown (e.g. the fallback, or a manual override).
  const showAll = !!state.settingsModel?.values?.showAllTypes;
  const byScore = new Map(ranking.map((r) => [r.type.id, r.score]));
  const rows = [];
  for (const t of REGISTRY) {
    const match = t === FALLBACK_TYPE ? 0 : (byScore.get(t.id) || 0);  // floor isn't a match
    if (!showAll && match < 0.01 && t.id !== selectedId) continue;
    rows.push({ t, match });
  }
  // The raw scores are independent confidences; normalize the shown matches so the
  // displayed percentages always total 100% (largest-remainder rounding).
  const matched = rows.filter((r) => r.match > 0);
  const pcts = normalizePercents(matched.map((r) => r.match));
  matched.forEach((r, i) => (r.pct = pcts[i]));

  sel.innerHTML = '';
  for (const r of rows) {
    const opt = document.createElement('option');
    opt.value = r.t.id;
    opt.textContent = r.pct != null ? `${r.t.label} (${r.pct}%)` : r.t.label;
    if (r.t.id === selectedId) opt.selected = true;
    sel.appendChild(opt);
  }
}

// Scale values to integer percentages that sum to exactly 100 (largest-remainder method).
function normalizePercents(values) {
  const sum = values.reduce((a, b) => a + b, 0);
  if (!values.length || sum <= 0) return values.map(() => 0);
  const raw = values.map((v) => (v / sum) * 100);
  const out = raw.map((x) => Math.floor(x));
  let rem = 100 - out.reduce((a, b) => a + b, 0);
  const order = raw.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; k < order.length && rem > 0; k++, rem--) out[order[k][1]]++;
  return out;
}

async function activateType(type) {
  state.type = type;
  state.settingsModel = await getModel(type);   // cached per type (no re-fetch per file)
  // Layer 3: does a known-file enhancement apply (e.g. package.json, Dockerfile)? A known
  // renderer can supply a preview even when the base type has none (e.g. Dockerfile→code).
  state.known = matchKnown(state.intake, type);
  state.forceBase = false;
  updateEnhanceChip();
  // Show workspace + relevant chrome.
  $('intake').hidden = true;
  $('workspace').hidden = false;
  $('repoPanel').hidden = true;                 // leave the repo view when opening a file
  $('fileId').hidden = false;
  $('fileName').textContent = state.intake.filename;
  $('settingsBtn').hidden = false;
  $('metaBtn').hidden = false;

  // Capabilities decide which surfaces exist. Some types are preview-only (PDF: no raw
  // editor), some raw-only (code), some both (markdown).
  const canRaw = type.capabilities.rawView;
  // A matched known-file enhancement provides a preview even if the base type doesn't.
  const canPreview = type.capabilities.preview || (!!state.known && !state.forceBase);
  const canDiff = type.capabilities.diff && canRaw && !state.intake.isBinary;
  const both = canRaw && canPreview;
  $('viewMode').hidden = !both || isMobile();
  $('rawMode').hidden = !canDiff;
  $('downloadBtn').hidden = !canDiff;
  $('formatBtn').hidden = !(canRaw && ['json', 'code'].includes(type.id));
  $('tabbar').style.display = both && isMobile() ? 'flex' : 'none';
  $('screenshotBtn').hidden = !(type.capabilities.screenshot && canPreview);
  state.mode = both ? 'split' : (canPreview && !canRaw ? 'preview' : 'raw');
  state.rawMode = 'current';
  resetCompare();                              // a fresh file drops any active two-file comparison
  // On phones, default to Preview when a type has one — reading beats Monaco-on-glass.
  state.tab = both ? (isMobile() ? 'preview' : 'raw') : (canPreview && !canRaw ? 'preview' : 'raw');
  state.htmlAllowScripts = false; state.htmlAsked = false;   // re-ask per file

  if (canRaw) await buildRawView();
  else { state.rawview?.dispose(); state.rawview = null; $('editor').innerHTML = ''; }
  if (canPreview) await renderPreview(); else clearPreview();
  applyLayout();
}

/* ─────────────────────────── Raw side (RawView controller) ─────────────────────────── */

async function buildRawView() {
  state.rawview?.dispose();
  // syntaxLanguage may be a function(intake) for types that pick the language per file (code).
  const sl = state.type.syntaxLanguage;
  const lang = state.intake.isBinary ? 'plaintext' : ((typeof sl === 'function' ? sl(state.intake) : sl) || 'plaintext');
  // Binary files get a read-only hex dump (offset / hex / ASCII) instead of a placeholder.
  const text = state.intake.isBinary
    ? hexDump(state.intake.bytes)
    : (state.intake.text || '');
  state.rawview = await createRawView($('editor'), {
    originalText: text, currentText: text, language: lang,
    theme: themeIsDark() ? 'dark' : 'light',
    options: { readOnly: state.intake.isBinary, ...monacoOptions(state.settingsModel) },
    onChange: debounce((value) => onRawEdited(value), 250),
    onCursor: (line) => mapRawToPreview(line),
    onScroll: () => syncScrollFromRaw(),
    onMoveDiff: async (moveHost, original, current) => {
      const { renderMoveDiff } = await import('./movediff-view.js');
      renderMoveDiff(moveHost, original, current, { threshold: 0.8 });
    },
    // A type (or a matched known-file) can declare a custom diff via loadDiffRenderer;
    // core dispatches generically (no type-name checks). The loader is resolved at call
    // time so the "show plain view" toggle takes effect without rebuilding the editor.
    onCustomDiff: (state.type.loadDiffRenderer || (state.known && state.known.loadDiffRenderer))
      ? async (host, original, current) => {
          const loader = (state.known && !state.forceBase && state.known.loadDiffRenderer) || state.type.loadDiffRenderer;
          if (!loader) { host.textContent = ''; return; }
          const mod = await loader();
          (mod.render || mod.default)(host, original, current);
        }
      : undefined,
  });
  syncRawModeButtons();
}

async function onRawEdited(value) {
  // Keep the working text in sync so download + preview reflect edits.
  state.intake = { ...state.intake, text: value };
  state.downloadedSinceEdit = false;   // there are now edits not yet saved to disk
  // Easter-egg surface: typing `import easteregg` in any editable file unlocks the arcade.
  if (state.games && !state.games.isUnlocked() && /(^|\n)\s*import\s+easteregg\b/.test(value)) {
    state.games.unlock();
    state.games.open();
    toast('🎮 import easteregg — arcade unlocked!');
  }
  if (state.type?.capabilities.preview) await renderPreview();
}

// Unsaved work = the working copy differs from the original AND it wasn't downloaded
// since the last edit. Used to guard against silently discarding progress.
function hasUnsavedWork() {
  return !!(state.rawview?.isDirty() && !state.downloadedSinceEdit);
}
function confirmDiscard() {
  if (!hasUnsavedWork()) return true;
  return confirm('You have unsaved changes that haven’t been downloaded.\n\nDiscard them and continue?');
}

function setRawMode(mode) {
  if (!state.rawview) return;
  state.rawMode = mode;
  state.rawview.setMode(mode);
  syncRawModeButtons();
  // Keep the chosen view layout (split + draggable divider) stable across raw modes so
  // nothing jumps when switching original/current/diff/move-diff. Use the view-mode
  // switch (raw/split/preview) to give a diff full width when you want it.
  applyLayout();
}

function syncRawModeButtons() {
  document.querySelectorAll('#rawMode button:not(#compareBtn)').forEach((b) => b.classList.toggle('active', b.dataset.raw === state.rawMode));
  $('compareBtn')?.classList.toggle('active', !!state.rawview?.hasCompare?.());
}

/* ─────────────── Compare with another file (two-file diff) ─────────────── */

// Pick a second file and diff the CURRENT file against it (current ↔ other), reusing Monaco's
// diff (and any type custom diff). Edit-tracking (original ↔ current) is untouched.
function startCompare() {
  if (!state.rawview) return;
  $('compareInput').value = '';
  $('compareInput').click();
}

async function onComparePicked(e) {
  const file = e.target.files && e.target.files[0];
  if (!file || !state.rawview) return;
  try {
    const other = await intakeFromFile(file);
    if (other.isBinary) { toast('Can’t compare binary files as text.'); return; }
    state.rawview.setCompare(other.text || '');     // keeps the current file's language on both sides
    state.rawMode = 'diff';
    $('rawPane').classList.add('comparing');
    const bar = $('compareBar');
    bar.querySelector('.compare-label').textContent = 'Comparing current ↔ ' + (file.name || 'file');
    bar.hidden = false;
    syncRawModeButtons();
    applyLayout();
    state.rawview.layout();
  } catch (err) {
    toast('Could not read file: ' + err.message);
  }
}

function stopCompare() {
  if (!state.rawview?.hasCompare?.()) { resetCompare(); return; }
  state.rawview.clearCompare();
  resetCompare();
  state.rawMode = state.rawview.mode();
  syncRawModeButtons();
  state.rawview.layout();
}

// Hide the compare UI without touching the rawview (used on file load / teardown).
function resetCompare() {
  $('rawPane')?.classList.remove('comparing');
  const bar = $('compareBar'); if (bar) bar.hidden = true;
}

async function takeScreenshot() {
  if (state.lastBodyHtml == null) { toast('Screenshot not available for script-enabled HTML.'); return; }
  toast('Capturing…', 1500);
  try {
    const url = await captureBodyHtml(state.lastBodyHtml, {
      theme: themeIsDark() ? 'dark' : 'light',
      maxWidth: state.settingsModel.values.previewMaxWidth,
    });
    const a = document.createElement('a');
    a.href = url;
    a.download = (state.intake.filename || 'preview').replace(/\.[^.]+$/, '') + '.png';
    a.click();
    toast('Screenshot saved');
  } catch (err) {
    toast('Screenshot failed: ' + err.message);
  }
}

function downloadCurrent() {
  const blob = new Blob([state.rawview ? state.rawview.getValue() : (state.intake.text || '')], { type: state.intake.mimeType || 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = state.intake.filename || 'download.txt';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  state.downloadedSinceEdit = true;    // current edits are now saved to disk
}

/* ─────────────────────────── Preview (iframe) ─────────────────────────── */

async function renderPreview() {
  const type = state.type;
  // A matched known-file enhancement (Layer 3) overrides the base renderer unless the user
  // toggled "show the plain view".
  const useKnown = state.known && !state.forceBase;
  if (!useKnown && !type.loadRenderer) return clearPreview();
  let rendered;
  try {
    const mod = useKnown ? await state.known.loadRenderer() : await type.loadRenderer();
    const ctx = { settings: state.settingsModel.values, folder: folderContext() };
    if (type.id === 'html') ctx.allowScripts = state.htmlAllowScripts;
    rendered = await mod.render(state.intake, ctx);
  } catch (err) {
    // Offline + this renderer module was never cached (cache-on-use never saw it): a dynamic
    // import()/fetch fails. Show a friendly, actionable note instead of a raw error.
    if (!navigator.onLine) { $('previewHost').innerHTML = offlineMissHtml(); return; }
    $('previewHost').innerHTML = '<p style="padding:16px;color:var(--danger)">Preview failed: ' + escapeHtml(err.message) + '</p>';
    return;
  }
  // WP07 script gate: HTML with scripts is sanitized by default; ask once before running them.
  if (type.id === 'html' && rendered.containsScripts && !state.htmlAllowScripts && !state.htmlAsked) {
    state.htmlAsked = true;
    if (confirm('This HTML contains scripts. Run them in a sandboxed iframe?\n\nThey cannot access this page or your data, but only continue if you trust the source. Cancel to view it sanitized (scripts removed).')) {
      state.htmlAllowScripts = true;
      return renderPreview();
    }
  }
  // Free any previous out-of-sandbox resource (e.g. a media blob URL).
  state.previewCleanup?.(); state.previewCleanup = null;
  // Some types (media) render a live node directly in the preview pane — outside the
  // sandboxed iframe, which can't reach blob: URLs. Safe: media bytes aren't markup.
  if (rendered.parentNode) {
    clearPreview();
    $('previewHost').appendChild(rendered.parentNode);
    state.lastBodyHtml = null;   // not screenshot-able via the sanitized-body path
    state.previewCleanup = rendered.revoke || null;
    state.preview = { iframe: null, highlight() {}, scrollTo() {}, destroy() { $('previewHost').innerHTML = ''; } };
    updateExportButton();
    return;
  }
  // Remember the sanitized body for screenshots + Print/Save-as-PDF (null for script full docs).
  state.lastBodyHtml = rendered.fullDoc ? null : rendered.bodyHtml;
  state.preview = mountPreview($('previewHost'), {
    bodyHtml: rendered.bodyHtml,
    fullDoc: rendered.fullDoc,
    allowScripts: !!rendered.ranScripts,
    theme: themeIsDark() ? 'dark' : 'light',
    style: previewStyle(state.settingsModel.values),
    onSelect: (src) => mapPreviewToRaw(src),
    onHover: (src) => mapPreviewToRaw(src, false),
    onScroll: (ratio) => syncScrollFromPreview(ratio),
    onOpen: rendered.openEntry ? (name) => openInnerEntry(rendered.openEntry, name) : undefined,
  });
  if (rendered.hadUnsafe) toast('Some unsafe HTML (scripts/handlers) was removed for safety.');
  updateExportButton();
}

function clearPreview() {
  state.previewCleanup?.(); state.previewCleanup = null;
  state.preview?.destroy();
  state.preview = null;
  state.lastBodyHtml = null;
  updateExportButton();
  $('previewHost').innerHTML = '';
}

// Open one entry from inside a container preview (e.g. a file inside a zip): the renderer's
// openEntry() extracts that entry's bytes → a fresh intake, which we load through the normal
// detection/render path. No unsaved work exists for a binary container, so loading is safe.
async function openInnerEntry(openEntry, name) {
  try {
    const intake = await openEntry(name);
    if (!intake) { toast('Could not open ' + name); return; }
    state._skipDiscardGuard = true;   // container view holds no editable/unsaved work
    await loadIntake(intake);
  } catch {
    toast('Could not open ' + name);
  }
}

/* ─────────────── Known-file enhancement chip (Layer 3 indicator + revert) ─────────────── */

function updateEnhanceChip() {
  const chip = $('enhanceChip');
  if (!state.known) { chip.hidden = true; return; }
  chip.hidden = false;
  const showingEnhanced = !state.forceBase;
  chip.querySelector('.ec-label').textContent = (showingEnhanced ? '✦ Enhanced: ' : 'Plain view — ') + state.known.label;
  const btn = chip.querySelector('.ec-toggle');
  btn.textContent = showingEnhanced ? 'Show default view' : 'Show enhanced view';
}

function toggleEnhance() {
  if (!state.known) return;
  state.forceBase = !state.forceBase;
  updateEnhanceChip();
  renderPreview();
}

/* ─────────────────────────── Magic selector ─────────────────────────── */

// Preview element carries data-fv-src="startLine:endLine" (0-based, end-exclusive).
function mapPreviewToRaw(src, moveCursor = true) {
  if (!src || !state.rawview) return;
  const [a, b] = src.split(':').map(Number);
  const startLine = a + 1, endLine = Math.max(startLine, b);
  state.rawview.decorate(startLine, endLine);
  if (moveCursor) state.rawview.reveal(startLine);
}

function mapRawToPreview(line) {
  if (!state.preview) return;
  // Find the nearest source block whose range covers this line (0-based).
  state.preview.highlight((line - 1) + ':' + line);
}

/* ─────────────────────────── Scroll sync (WP08 seed) ─────────────────────────── */

function syncScrollFromRaw() {
  if (state.syncing || !state.preview || !state.settingsModel.values.syncScroll) return;
  if (!state.rawview?.canSync()) return;
  const { top, max } = state.rawview.scrollInfo();
  state.syncing = true;
  state.preview.scrollTo(max > 0 ? top / max : 0);
  requestAnimationFrame(() => (state.syncing = false));
}
function syncScrollFromPreview(ratio) {
  if (state.syncing || !state.rawview || !state.settingsModel.values.syncScroll) return;
  if (!state.rawview.canSync()) return;
  const { max } = state.rawview.scrollInfo();
  state.syncing = true;
  state.rawview.setScrollTop(ratio * Math.max(0, max));
  requestAnimationFrame(() => (state.syncing = false));
}

/* ─────────────────────────── Layout / view modes ─────────────────────────── */

function applyLayout() {
  const caps = state.type.capabilities;
  // A matched known-file enhancement supplies a preview even if the base type has none.
  const hasPreview = caps.preview || (!!state.known && !state.forceBase);
  const both = caps.rawView && hasPreview;
  // Forced view for single-surface types: preview-only -> preview, raw-only -> raw.
  const forced = hasPreview && !caps.rawView ? 'preview' : 'raw';
  const panes = $('panes');
  if (isMobile()) {
    panes.removeAttribute('data-mode');
    panes.setAttribute('data-tab', both ? state.tab : forced);
  } else {
    panes.removeAttribute('data-tab');
    panes.setAttribute('data-mode', both ? state.mode : forced);
  }
  document.querySelectorAll('#viewMode button').forEach((b) => b.classList.toggle('active', b.dataset.mode === state.mode));
  document.querySelectorAll('#tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.mode === state.tab));
  applyPreviewPaneWidth();
  state.rawview?.layout();
}

// Desktop split: the preview pane width tracks the "Preview width (px)" setting, clamped
// so the editor keeps a usable minimum. The draggable divider writes back to that setting.
const MIN_EDITOR_PX = 380, DIVIDER_PX = 6;
function applyPreviewPaneWidth() {
  const caps = state.type?.capabilities;
  const both = caps && caps.rawView && caps.preview;
  const splitActive = both && !isMobile() && state.mode === 'split';
  $('splitDivider').hidden = !splitActive;
  const previewPane = $('previewPane'), rawPane = $('rawPane');
  if (!splitActive) { previewPane.style.flex = ''; rawPane.style.flex = ''; return; }
  const total = $('panes').clientWidth || 0;
  const want = Number(state.settingsModel?.values?.previewMaxWidth) || 900;
  const maxPreview = Math.max(320, total - MIN_EDITOR_PX - DIVIDER_PX);
  const w = Math.max(320, Math.min(want, maxPreview));
  previewPane.style.flex = '0 0 ' + Math.round(w) + 'px';
  rawPane.style.flex = '1 1 auto';
}

function initSplitDivider() {
  const divider = $('splitDivider'), panes = $('panes');
  const previewPane = $('previewPane'), rawPane = $('rawPane');
  let dragging = false;
  const onMove = (e) => {
    if (!dragging) return;
    const rect = panes.getBoundingClientRect();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    let w = rect.right - x;                 // preview pane is on the right
    w = Math.max(320, Math.min(w, rect.width - MIN_EDITOR_PX - DIVIDER_PX));
    previewPane.style.flex = '0 0 ' + Math.round(w) + 'px';
    rawPane.style.flex = '1 1 auto';
    if (state.settingsModel) state.settingsModel.values.previewMaxWidth = Math.round(w);  // keep the setting live
    state.rawview?.layout();
    e.preventDefault();
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    document.body.style.userSelect = '';
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    // Width already tracked live in onMove; on release, re-render so the iframe content
    // width matches and refresh the settings UI if it's open.
    const m = state.settingsModel;
    if (m) {
      m.values.previewMaxWidth = Math.round(previewPane.getBoundingClientRect().width);
      syncModelPreset(m);
      renderPreview();
      if (!$('settingsDrawer').hidden) openSettings();
    }
  };
  divider.addEventListener('pointerdown', (e) => {
    if (divider.hidden) return;
    dragging = true;
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    e.preventDefault();
  });
}

/* ─────────────────────────── Settings (WP03) ─────────────────────────── */

function openSettings() {
  renderSettings($('settingsBody'), state.settingsModel, { onChange: onSettingsChange, toast });
}

// Re-apply settings after any change. Editor options apply live; the preview only
// re-renders when a viewer setting that affects rendering changed (syncScroll reads live).
function onSettingsChange(model, changedKey) {
  state.rawview?.updateOptions(monacoOptions(model));
  // "Show all file types" is a global pref applied to the type dropdown immediately.
  if (changedKey === 'showAllTypes') {
    persistGlobalKey('showAllTypes', model.values.showAllTypes);
    if (state.intake && state.type) populateTypeSelect(pickType(state.intake).ranking, state.type.id);
  }
  if (!state.type?.capabilities.preview) return;
  if (changedKey === 'previewMaxWidth') applyLayout();   // resize the split pane too
  const cat = model.descriptors.find((d) => d.key === changedKey)?.category;
  const viewerRenderKey = cat && cat.startsWith('viewer') && changedKey !== 'syncScroll';
  if (!changedKey || viewerRenderKey) renderPreview();
}

/* ─────────────────────────── Metadata ─────────────────────────── */

async function buildMetadata() {
  const body = $('metaBody');
  const i = state.intake;
  const rows = [
    ['Name', i.filename],
    ['Type', state.type.label],
    ['Size', formatBytes(i.size)],
    ['MIME', i.mimeType || '—'],
    ['Modified', i.lastModified ? new Date(i.lastModified).toLocaleString() : '—'],
  ];
  if (state.type.loadMetadata) {
    try { const m = await state.type.loadMetadata(); for (const r of await m.extract(i)) rows.push([r.label, r.value]); } catch {}
  }
  body.innerHTML = '';
  for (const [k, v] of rows) {
    const row = document.createElement('div'); row.className = 'meta-row';
    row.innerHTML = `<span class="k">${escapeHtml(k)}</span><span class="v">${escapeHtml(String(v))}</span>`;
    body.appendChild(row);
  }
  const note = document.createElement('p'); note.className = 'muted'; note.style.marginTop = '12px';
  note.style.fontSize = '12px';
  note.textContent = 'Note: browsers expose only the file’s modified time, never its OS creation time. “Created” dates come only from inside the file (e.g. PDF/EXIF).';
  body.appendChild(note);
}

/* ─────────────────────────── Theme ─────────────────────────── */

function themeIsDark() { return document.documentElement.dataset.theme === 'dark'; }
function applyTheme(dark) {
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  localStorage.setItem('fv:theme', dark ? 'dark' : 'light');
  state.rawview?.setTheme(dark ? 'dark' : 'light');
  if (state.preview && state.type?.capabilities.preview) renderPreview();
}

/* ─────────────────────────── Drawers ─────────────────────────── */

function openDrawer(id, build) {
  build?.();
  $(id).hidden = false; $('scrim').hidden = false;
}
function closeDrawers() {
  $('settingsDrawer').hidden = true; $('metaDrawer').hidden = true; $('scrim').hidden = true;
}

/* ─────────────────────────── Examples ─────────────────────────── */

// Stable display order for the example gallery; unknown categories fall to the end.
const EXAMPLE_CATEGORY_ORDER = ['Documents', 'Data', 'Office', 'Config', 'Code', 'Media', 'Archive & Binary'];

async function loadExamples() {
  try {
    const res = await fetch('examples/index.json');
    if (!res.ok) return;
    const list = await res.json();
    const host = $('examples');
    host.textContent = '';

    // Group by category, preserving in-file order within each group.
    const groups = new Map();
    for (const ex of list) {
      const cat = ex.category || 'Other';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(ex);
    }
    const cats = [...groups.keys()].sort((a, b) => {
      const ia = EXAMPLE_CATEGORY_ORDER.indexOf(a), ib = EXAMPLE_CATEGORY_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
    });

    for (const cat of cats) {
      const group = document.createElement('div');
      group.className = 'ex-group';
      const label = document.createElement('span');
      label.className = 'ex-group-label';
      label.textContent = cat;
      group.appendChild(label);
      const row = document.createElement('div');
      row.className = 'ex-group-items';
      for (const ex of groups.get(cat)) {
        const b = document.createElement('button');
        b.textContent = ex.label || ex.file;
        b.onclick = async () => {
          const r = await fetch('examples/' + ex.file);
          const buf = new Uint8Array(await r.arrayBuffer());
          const { intakeFromFile } = await import('./intake.js');
          await loadIntake(await intakeFromFile(new File([buf], ex.file, { type: ex.mime || '' })));
        };
        row.appendChild(b);
      }
      group.appendChild(row);
      host.appendChild(group);
    }
  } catch {}
}

/* ─────────────────────────── Helpers ─────────────────────────── */

function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function escapeHtml(s) { return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function formatBytes(n) { if (n < 1024) return n + ' B'; if (n < 1048576) return (n / 1024).toFixed(1) + ' KB'; return (n / 1048576).toFixed(2) + ' MB'; }

/* ─────────────────────────── Wire up ─────────────────────────── */

function init() {
  // Theme: saved or system.
  const saved = localStorage.getItem('fv:theme');
  applyTheme(saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches);

  wireIntake({
    dropZone: $('dropZone'), fileInput: $('fileInput'), folderInput: $('folderInput'),
    onIntake: loadIntake, onFolder: loadFolder, onError: (e) => toast('Could not read file: ' + e.message),
  });
  $('treeBtn').addEventListener('click', () => setTree($('fileTree').hidden));
  $('treeCloseBtn').addEventListener('click', () => setTree(false));
  $('fileTree').addEventListener('keydown', onTreeKey);
  $('repoBtn').addEventListener('click', openRepoView);
  initTreeResize();
  $('openInlineBtn').addEventListener('click', showIntake);
  $('newFileBtn').addEventListener('click', createNewFile);
  $('formatBtn').addEventListener('click', () => state.rawview?.format());
  initSplitDivider();

  $('typeSelect').addEventListener('change', (e) => { const t = getType(e.target.value); if (t) activateType(t); });
  $('themeBtn').addEventListener('click', () => applyTheme(!themeIsDark()));
  $('settingsBtn').addEventListener('click', () => openDrawer('settingsDrawer', openSettings));
  $('metaBtn').addEventListener('click', () => openDrawer('metaDrawer', buildMetadata));
  $('scrim').addEventListener('click', () => { closeDrawers(); if (isMobile()) setTree(false); });
  document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeDrawers));
  $('fullscreenBtn').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  });
  $('screenshotBtn').addEventListener('click', takeScreenshot);
  $('exportBtn').addEventListener('click', toggleExportMenu);
  $('enhanceChip').querySelector('.ec-toggle').addEventListener('click', toggleEnhance);
  $('moreBtn').addEventListener('click', toggleMoreMenu);
  $('moreMenu').addEventListener('click', (e) => { if (e.target.closest('button')) closeMoreMenu(); });
  document.addEventListener('click', (e) => {
    if (!$('moreMenu').hidden && !e.target.closest('#moreMenu') && !e.target.closest('#moreBtn')) closeMoreMenu();
    if (!$('exportMenu').hidden && !e.target.closest('#exportMenu') && !e.target.closest('#exportBtn')) closeExportMenu();
  });
  layoutTopbar();

  document.querySelectorAll('#viewMode button').forEach((b) =>
    b.addEventListener('click', () => { state.mode = b.dataset.mode; applyLayout(); }));
  document.querySelectorAll('#tabbar button').forEach((b) =>
    b.addEventListener('click', () => { state.tab = b.dataset.mode; applyLayout(); }));
  document.querySelectorAll('#rawMode button:not(#compareBtn)').forEach((b) =>
    b.addEventListener('click', () => setRawMode(b.dataset.raw)));
  $('compareBtn').addEventListener('click', startCompare);
  $('compareInput').addEventListener('change', onComparePicked);
  $('compareBar').querySelector('.compare-stop').addEventListener('click', stopCompare);
  $('downloadBtn').addEventListener('click', downloadCurrent);

  // Viewport change must NOT rebuild the editor (would drop edits) — just relayout
  // and toggle which view controls apply (desktop split vs mobile tabs).
  window.matchMedia('(max-width: 760px)').addEventListener('change', () => {
    layoutTopbar();                              // move controls in/out of the ⋯ menu
    if (!state.type) return;
    const canPreview = state.type.capabilities.preview && !state.intake.isBinary;
    $('viewMode').hidden = !canPreview || isMobile();
    $('tabbar').style.display = canPreview && isMobile() ? 'flex' : 'none';
    applyLayout();
  });

  // Re-clamp the split pane width when the window resizes on desktop.
  window.addEventListener('resize', debounce(() => { if (state.type) applyPreviewPaneWidth(); }, 100));

  // Warn before leaving/closing the tab if there are unsaved, undownloaded edits.
  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedWork()) { e.preventDefault(); e.returnValue = ''; }
  });

  loadExamples();

  // Startup stays light (Monaco isn't loaded just to show the intake screen). Warm it in
  // the background during idle so the FIRST file opens instantly instead of waiting on
  // the heaviest dependency. loadMonaco() caches its promise, so buildRawView reuses this.
  const warm = () => { loadMonaco().then((m) => registerCodeMetrics(m)).catch(() => {}); preloadModels(REGISTRY); };
  if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 3000 });
  else setTimeout(warm, 1200);

  // Register the service worker + start the background offline precache (spinner → ✓).
  initOffline($('offlineStatus'));

  // Keep the no-install promise: never let Android/desktop offer to install the app. (The one
  // exception — an iOS-only "Add to Home Screen" hint for background audio — is opt-in and shown
  // by the media renderer, not an install prompt.)
  suppressInstallPrompt();

  // Easter-egg games: attaches only a tiny Konami-code keydown listener at startup; the hub and
  // the games themselves are lazy-loaded on first unlock, so this costs ~nothing.
  const games = initGames({ onToast: toast });
  state.games = games;   // so onRawEdited can offer the `import easteregg` unlock

  // Test seam (no data leaves the page; purely in-memory handles for the smoke suite).
  window.__fv = {
    state, setRawMode, downloadCurrent, loadFolder, hasUnsavedWork, openRepoView,
    persistence, games,
    screenshot: () => captureBodyHtml(state.lastBodyHtml, { theme: themeIsDark() ? 'dark' : 'light', style: previewStyle(state.settingsModel.values) }),
  };
}

document.addEventListener('DOMContentLoaded', init);
