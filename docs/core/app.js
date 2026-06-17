// Core shell orchestrator (WP02): intake -> detect -> load type module -> lay out
// raw (Monaco) + preview (sandboxed iframe) per capability and viewport.
// Settings here are intentionally minimal; WP03 replaces buildSettings() with the
// full descriptor-driven system. The contract this file consumes is frozen.

import { REGISTRY, getType, FALLBACK_TYPE } from './registry.js';
import { pickType } from './detect.js';
import { wireIntake, intakeFromFile, intakeFromText, LARGE_FILE_BYTES } from './intake.js';
import { buildTree, renderTree, getDraggedTreeNode, TREE_DRAG_TYPE } from './filetree.js';
import { findGitDir, isGitInternal, openRepo } from './git.js';
import { matchKnown } from '../known/registry.js';
import { renderRepoView } from './repoview.js';
import { createRawView } from './rawview.js';
import { loadMonaco } from './monaco-loader.js';
import { hexDump } from './hexdump.js';
import { initOffline, offlineMissHtml, initOfflineBadge } from './offline.js';
import * as persistence from './persistence.js';
import { suppressInstallPrompt } from './ios-audio.js';
import { registerCodeMetrics } from '../types/text/code/codelens.js';
import { exportFolderZip } from './folder-export.js';
import { mountPreview, captureBodyHtml } from './iframe.js';
import { getModel, preloadModels, monacoOptions, renderSettings, persistGlobalKey, readGlobalKey, syncModelPreset } from './settings.js';
import { previewStyle } from './settings-schema.js';
import { initGames } from '../games/launcher.js';
import { loadExamples } from './examples.js';
import { startSideBySide, openSideBySide } from './sidebyside.js';
import { initLayout, layoutTopbar, toggleMoreMenu, closeMoreMenu, updateExportButton, closeExportMenu, toggleExportMenu, applyLayout, applyPreviewPaneWidth, initSplitDivider } from './layout.js';
import { mapPreviewToRaw, mapRawToPreview, syncScrollFromRaw, syncScrollFromPreview } from './sync.js';
import { initCompare, startCompare, onComparePicked, stopCompare, resetCompare } from './compare.js';
import { initRawPane, buildRawView, onRawEdited, hasUnsavedWork, confirmDiscard, setRawMode, syncRawModeButtons, takeScreenshot, downloadCurrent } from './rawpane.js';
import { buildMetadata } from './meta-drawer.js';
import { initFolder, loadFolder, openRepoView, onTreeSearchInput, searchTreeContents, exportFolder, folderContext, setTree, initTreeResize, onTreeKey, flushFolderEdit } from './folder.js';
import { $, isMobile, state, toast, themeIsDark, escapeHtml, debounce } from './state.js';
import { recordMetagameViewerOpen, recordStage2SearchResult } from '../games/metagame/viewer-actions.js';

/* ─────────────────────────── Intake → render ─────────────────────────── */

async function loadIntake(intake) {
  // Guard unsaved work — unless loadFolder already asked for this same action.
  const fromTree = state._skipDiscardGuard;
  if (state._skipDiscardGuard) state._skipDiscardGuard = false;
  else if (!confirmDiscard()) return;
  // Leaving folder context for a fresh top-level file open: discard stale folder state so
  // old folderEdits don't trigger a false "unsaved changes" prompt on the next open.
  if (!fromTree) { state.folderEdits = new Map(); state.folderExported = false; }
  if (intake.truncated) {
    const mb = (intake.size / 1048576).toFixed(0);
    const shown = (intake.loadedBytes / 1048576).toFixed(0);
    if (!confirm(`This file is ${mb} MB — too large to load fully. Only the first ${shown} MB will be shown. Open anyway?`)) return;
  } else if (!intake.streamed && intake.size > LARGE_FILE_BYTES) {
    const mb = (intake.size / 1048576).toFixed(1);
    if (!confirm(`This file is ${mb} MB. Large files may be slow in the editor. Open anyway?`)) return;
  }
  state.downloadedSinceEdit = true;    // fresh document — nothing unsaved yet
  state.currentFolderPath = null;      // single-file load by default; openTreeFile re-sets it
  state.intake = intake;
  const { type, ranking } = pickType(intake);
  populateTypeSelect(ranking, type.id);
  await activateType(type);
  if (intake.truncated) {
    const shown = (intake.loadedBytes / 1048576).toFixed(0);
    const total = (intake.size / 1048576).toFixed(0);
    toast(`Large file: showing the first ${shown} MB of ${total} MB.`, 6000);
  }
  updateSessionTree(intake);
}

// Track individually-opened files in a session sidebar so users can switch back to any prior file.
// Only activates when 2+ distinct files have been opened without a real folder loaded.
function updateSessionTree(intake) {
  // A real folder or synthetic dual-view tree (createNewFile / onTreeFileDrop) owns the sidebar.
  if (state.treeEntries && !state.sessionTree) return;

  const alreadyTracked = state.sessionIntakes.has(intake.filename);
  state.sessionIntakes.set(intake.filename, intake);

  if (state.sessionIntakes.size < 2) return; // need at least 2 files to justify showing the tree

  if (state.sessionTree && alreadyTracked) {
    // Tree already shown and no new entry — just update the active marker.
    state.treeApi?.setActive?.(intake.filename);
    return;
  }

  // Build/rebuild the session tree. Each entry needs a File object for the tree row display;
  // actual re-open uses the stored intake, not this File.
  const entries = [...state.sessionIntakes.entries()].map(([name, si]) => ({
    file: new File([si.bytes || (si.text != null ? si.text : '')], name),
    path: name,
  }));
  state.treeEntries = entries;
  state.sessionTree = true;

  if (state.treeApi) state.treeApi.stop();
  state.treeApi = renderTree($('ftBody'), buildTree(entries), { onOpen: (node) => {
    const si = state.sessionIntakes.get(node.path);
    if (!si) return;
    state._skipDiscardGuard = true;
    loadIntake(si);
  } });
  $('ftRoot').textContent = 'Session';
  $('ftRoot').title = 'Session files';
  $('repoBtn').hidden = true;
  $('ftExportBtn').hidden = true;
  $('ftSearch').hidden = true;
  $('treeBtn').hidden = false;
  setTree(true);
  state.treeApi.setActive(intake.filename);
}

// Create a new, empty file and open it in the editor. The name's extension drives type detection,
// so "notes.md" opens as Markdown, "main.py" as Python code, etc. The surface for the
// `import easteregg` unlock too (see onRawEdited).
async function createNewFile() {
  const name = prompt('New file name (include an extension, e.g. notes.md, script.js, data.json):', 'untitled.txt');
  if (name == null) return;                         // cancelled
  const filename = (name.trim() || 'untitled.txt');
  // If a file is already open, switch to folder mode so both files stay active in the tree.
  if (state.type && !$('workspace').hidden) {
    flushFolderEdit();
    const prevName = state.intake.filename;
    const prevText = state.rawview ? state.rawview.getValue() : (state.intake.text || '');
    const prevFile = new File([prevText], prevName, { type: 'text/plain' });
    const newFile = new File([''], filename, { type: 'text/plain' });
    const entries = [{ file: prevFile, path: prevName }, { file: newFile, path: filename }];
    state.sessionTree = false; state.sessionIntakes = new Map();
    state.treeEntries = entries;
    state.folderEdits = new Map([[prevName, prevText]]);
    state.folderExported = false;
    const tree = buildTree(entries);
    state.treeApi = renderTree($('ftBody'), tree, { onOpen: (node) => {
      const stashed = state.folderEdits.get(node.path);
      const intake = stashed != null
        ? intakeFromText(stashed, node.path.split('/').pop())
        : intakeFromText('', node.path.split('/').pop());
      state._skipDiscardGuard = true;
      loadIntake(intake).then(() => { state.currentFolderPath = node.path; });
    } });
    $('ftRoot').textContent = 'New files';
    $('ftRoot').title = 'New files';
    $('repoBtn').hidden = true;
    $('ftExportBtn').hidden = true;
    $('ftSearch').hidden = true;
    $('treeBtn').hidden = false;
    setTree(true);
    state._skipDiscardGuard = true;
  }
  await loadIntake(intakeFromText('', filename));
  if (state.treeEntries) {
    state.currentFolderPath = filename;
    state.treeApi?.setActive?.(filename);
  }
}

// Handle a file dragged from the folder tree and dropped onto the main workspace.
// If a file is already open, enter dual-view so both files stay accessible side by side.
async function onTreeFileDrop(node) {
  if (!node) return;
  if (state.type && !$('workspace').hidden && !state.treeEntries) {
    // A single file is open and no folder tree exists yet: build a synthetic two-file tree
    // so both files remain accessible side by side (mirrors the createNewFile dual-view path).
    flushFolderEdit();
    const prevName = state.intake.filename;
    const prevText = state.rawview ? state.rawview.getValue() : (state.intake.text || '');
    const prevFileObj = new File([prevText], prevName, { type: 'text/plain' });
    const entries = [{ file: prevFileObj, path: prevName }, { file: node.file, path: node.path }];
    state.sessionTree = false; state.sessionIntakes = new Map();
    state.treeEntries = entries;
    state.folderEdits = new Map([[prevName, prevText]]);
    state.folderExported = false;
    const tree = buildTree(entries);
    state.treeApi = renderTree($('ftBody'), tree, { onOpen: (n) => {
      const stashed = state.folderEdits.get(n.path);
      const getIntake = stashed != null
        ? Promise.resolve(intakeFromText(stashed, n.path.split('/').pop()))
        : intakeFromFile(n.file);
      getIntake.then((i) => { state._skipDiscardGuard = true; loadIntake(i).then(() => { state.currentFolderPath = n.path; }); });
    } });
    $('ftRoot').textContent = 'Files';
    $('ftRoot').title = 'Files';
    $('repoBtn').hidden = true;
    $('ftExportBtn').hidden = true;
    $('ftSearch').hidden = true;
    $('treeBtn').hidden = false;
    setTree(true);
    state._skipDiscardGuard = true;
  }
  // Open the dragged file (whether or not we just set up a tree above).
  const stashed = state.folderEdits?.get(node.path);
  const intake = stashed != null
    ? intakeFromText(stashed, node.path.split('/').pop())
    : await intakeFromFile(node.file);
  state._skipDiscardGuard = true;
  await loadIntake(intake);
  if (state.treeEntries) {
    state.currentFolderPath = node.path;
    state.treeApi?.setActive?.(node.path);
  }
}

// Return to the intake screen to pick another file/folder (keeps any loaded tree).
function showIntake() {
  $('intake').hidden = false;
  $('workspace').hidden = true;
  $('repoPanel').hidden = true;
}

async function openExampleFile(path, opts = {}) {
  const clean = String(path || '').replace(/^\/?docs\/examples\//, '').replace(/^\/?examples\//, '');
  if (!clean) return false;
  const index = await fetch('examples/index.json').then((r) => r.ok ? r.json() : []).catch(() => []);
  const meta = Array.isArray(index) ? index.find((entry) => entry.file === clean) : null;
  const res = await fetch('examples/' + clean);
  if (!res.ok) return false;
  const buf = new Uint8Array(await res.arrayBuffer());
  state._skipDiscardGuard = true;
  await loadIntake(await intakeFromFile(new File([buf], clean.split('/').pop(), { type: opts.mime || meta?.mime || '' })));
  return true;
}

async function openViewerFile(path, opts = {}) {
  const target = String(path || '');
  if (opts.text != null) {
    state._skipDiscardGuard = true;
    await loadIntake(intakeFromText(String(opts.text), target.split('/').pop() || opts.filename || 'generated.txt'));
    recordMetagameViewerOpen({ path: target, opts });
    return true;
  }
  if (target.includes('/docs/bts/') || target.includes('/bts/')) {
    const clean = target.replace(/^\/?docs\/bts\//, '').replace(/^\/?bts\//, '');
    const res = await fetch('bts/' + clean);
    if (!res.ok) return false;
    const text = await res.text();
    state._skipDiscardGuard = true;
    await loadIntake(intakeFromText(text, clean));
    recordMetagameViewerOpen({ path: target, opts });
    return true;
  }
  const opened = await openExampleFile(target, opts);
  if (opened) recordMetagameViewerOpen({ path: target, opts });
  return opened;
}

async function searchViewerFile(path, query, opts = {}) {
  const target = String(path || '');
  const clean = target.replace(/^\/?docs\/examples\//, '').replace(/^\/?examples\//, '');
  const text = opts.text || (state.intake?.filename === clean.split('/').pop() ? state.rawview?.getValue?.() || state.intake.text : null);
  const sourceText = text == null ? await fetch('examples/' + clean).then((r) => r.ok ? r.text() : '').catch(() => '') : text;
  const line = sourceText.split(/\r?\n/).find((entry) => entry.includes(query));
  const result = line && line.trim();
  recordStage2SearchResult({ file: target || clean, query, result });
  return { found: Boolean(result), result };
}

/* ─────────────────────────── Type activation ─────────────────────────── */

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
  $('sbsBtn').hidden = !canPreview;            // view this file beside another
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
  if (isMobile()) layoutTopbar();   // re-sync ⋯ visibility now that button hidden-states are set
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
  // "Reduce motion" is a global pref that toggles a root class disabling all CSS animation.
  if (changedKey === 'reduceMotion') {
    persistGlobalKey('reduceMotion', model.values.reduceMotion);
    applyReduceMotion(model.values.reduceMotion);
  }
  if (!state.type?.capabilities.preview) return;
  if (changedKey === 'previewMaxWidth') applyLayout();   // resize the split pane too
  const cat = model.descriptors.find((d) => d.key === changedKey)?.category;
  const viewerRenderKey = cat && cat.startsWith('viewer') && changedKey !== 'syncScroll';
  if (!changedKey || viewerRenderKey) renderPreview();
}

/* ─────────────────────────── Theme ─────────────────────────── */

function applyTheme(dark) {
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  localStorage.setItem('fv:theme', dark ? 'dark' : 'light');
  state.rawview?.setTheme(dark ? 'dark' : 'light');
  if (state.preview && state.type?.capabilities.preview) renderPreview();
}
// Toggle the root `reduce-motion` class — CSS kills all transitions/animations under it.
function applyReduceMotion(on) {
  document.documentElement.classList.toggle('reduce-motion', !!on);
}

/* ─────────────────────────── Drawers ─────────────────────────── */

function openDrawer(id, build) {
  build?.();
  $(id).hidden = false; $('scrim').hidden = false;
}
function closeDrawers() {
  $('settingsDrawer').hidden = true; $('metaDrawer').hidden = true; $('scrim').hidden = true;
}

/* ─────────────────────────── metaBtn Easter egg ─────────────────────────── */

let metaBtnClicks = 0;
const META_BTN_MSGS = ['Stop it.', 'That hurts!', 'Why are you doing this?', 'Leave me alone!'];
function showMetaBtnEgg(msg, onDismiss) {
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;cursor:pointer;';
  const card = document.createElement('div');
  card.style.cssText = 'background:var(--bg);color:var(--fg);border:1px solid var(--border);border-radius:12px;padding:2rem 2.5rem;max-width:320px;text-align:center;font-size:1.1rem;font-weight:600;pointer-events:none;box-shadow:0 8px 32px rgba(0,0,0,.3);';
  card.textContent = msg;
  ov.appendChild(card);
  document.body.appendChild(ov);
  ov.addEventListener('click', () => { ov.remove(); onDismiss?.(); }, { once: true });
}

/* ─────────────────────────── Examples ─────────────────────────── */

/* ─────────────────────────── Helpers ─────────────────────────── */

/* ─────────────────────────── Wire up ─────────────────────────── */

function init() {
  // Inject the core-flow callbacks the folder module needs (one-way: app imports folder, folder
  // gets these via init — no circular import).
  initFolder({ loadIntake, confirmDiscard });
  initLayout({ renderPreview, openSettings });
  initRawPane({ renderPreview });
  initCompare({ syncRawModeButtons });
  // Theme: saved or system.
  const saved = localStorage.getItem('fv:theme');
  applyTheme(saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches);
  applyReduceMotion(readGlobalKey('reduceMotion', false));

  wireIntake({
    dropZone: $('dropZone'), fileInput: $('fileInput'), folderInput: $('folderInput'),
    onIntake: loadIntake, onFolder: loadFolder, onError: (e) => toast('Could not read file: ' + e.message),
  });

  // Tree-to-workspace drag: when a file is dragged from the sidebar tree onto the workspace
  // (editor or preview), enter dual-view mode if a file is already open.
  $('workspace').addEventListener('dragover', (e) => {
    if (e.dataTransfer?.types?.includes(TREE_DRAG_TYPE)) e.preventDefault();
  });
  $('workspace').addEventListener('drop', (e) => {
    if (!e.dataTransfer?.types?.includes(TREE_DRAG_TYPE)) return;
    e.preventDefault();
    e.stopPropagation();
    onTreeFileDrop(getDraggedTreeNode());
  });
  $('treeBtn').addEventListener('click', () => setTree($('fileTree').hidden));
  $('treeCloseBtn').addEventListener('click', () => setTree(false));
  $('fileTree').addEventListener('keydown', onTreeKey);
  $('repoBtn').addEventListener('click', openRepoView);
  $('ftExportBtn').addEventListener('click', () => exportFolder(false));
  $('ftSearchInput').addEventListener('input', onTreeSearchInput);
  $('ftSearchInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); searchTreeContents(); } });
  initTreeResize();
  $('openInlineBtn').addEventListener('click', showIntake);
  $('newFileBtn').addEventListener('click', createNewFile);
  $('formatBtn').addEventListener('click', () => state.rawview?.format());
  initSplitDivider();

  $('typeSelect').addEventListener('change', (e) => { const t = getType(e.target.value); if (t) activateType(t); });
  $('themeBtn').addEventListener('click', () => applyTheme(!themeIsDark()));
  $('settingsBtn').addEventListener('click', () => openDrawer('settingsDrawer', openSettings));
  $('metaBtn').addEventListener('click', () => {
    metaBtnClicks++;
    if (metaBtnClicks <= 4) openDrawer('metaDrawer', buildMetadata);
    else if (metaBtnClicks <= 8) showMetaBtnEgg(META_BTN_MSGS[metaBtnClicks - 5]);
    else showMetaBtnEgg('Ok, FINE. Take this and leave me alone.', () => { state.games?.unlock(); $('gamesBtn').hidden = false; state.games?.open(); });
  });
  $('scrim').addEventListener('click', () => { closeDrawers(); if (isMobile()) setTree(false); });
  document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeDrawers));
  $('fullscreenBtn').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  });
  $('screenshotBtn').addEventListener('click', takeScreenshot);
  $('sbsBtn').addEventListener('click', startSideBySide);
  $('sbsInput').addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (f) openSideBySide(f); });
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

  loadExamples(loadIntake);

  // Startup stays light (Monaco isn't loaded just to show the intake screen). Warm it in
  // the background during idle so the FIRST file opens instantly instead of waiting on
  // the heaviest dependency. loadMonaco() caches its promise, so buildRawView reuses this.
  const warm = () => { loadMonaco().then((m) => registerCodeMetrics(m)).catch(() => {}); preloadModels(REGISTRY); };
  if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 3000 });
  else setTimeout(warm, 1200);

  // Register the service worker + start the background offline precache (spinner → ✓).
  initOffline($('offlineStatus'));
  initOfflineBadge();

  // Keep the no-install promise: never let Android/desktop offer to install the app. (The one
  // exception — an iOS-only "Add to Home Screen" hint for background audio — is opt-in and shown
  // by the media renderer, not an install prompt.)
  suppressInstallPrompt();

  // Easter-egg games: attaches only a tiny Konami-code keydown listener at startup; the hub and
  // the games themselves are lazy-loaded on first unlock, so this costs ~nothing.
  const games = initGames({ onToast: toast });
  state.games = games;   // so onRawEdited can offer the `import easteregg` unlock
  if (games.isUnlocked()) $('gamesBtn').hidden = false;
  $('gamesBtn').addEventListener('click', () => games.open());

  async function openExampleByLabel(label) {
    const index = await fetch('examples/index.json').then((r) => r.ok ? r.json() : []).catch(() => []);
    const entry = index.find((e) => e.label === label || e.file === label);
    if (!entry) return false;
    return openExampleFile(entry.file);
  }

  // Test seam (no data leaves the page; purely in-memory handles for the smoke suite).
  window.__fv = {
    state, setRawMode, downloadCurrent, loadFolder, hasUnsavedWork, openRepoView,
    openViewerFile, openFile: openViewerFile, openExampleFile, openExampleByLabel, searchViewerFile,
    persistence, games,
    screenshot: () => captureBodyHtml(state.lastBodyHtml, { theme: themeIsDark() ? 'dark' : 'light', style: previewStyle(state.settingsModel.values) }),
  };
}

// Run init once the DOM is ready. A bare addEventListener('DOMContentLoaded') would miss the
// event if it already fired — which happens now that an imported module (iframe.js) uses a
// top-level await, delaying this module's evaluation past DOMContentLoaded. So fire immediately
// if the document is already parsed.
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
