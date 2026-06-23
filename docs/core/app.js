// Core shell orchestrator (WP02): intake -> detect -> load type module -> lay out
// raw (Monaco) + preview (sandboxed iframe) per capability and viewport.
// Settings here are intentionally minimal; WP03 replaces buildSettings() with the
// full descriptor-driven system. The contract this file consumes is frozen.

import { getType } from './registry-runtime.generated.js';
import { pickType } from './detect.js';
import { wireIntake, LARGE_FILE_BYTES } from './intake.js';
import { getDraggedTreeNode, TREE_DRAG_TYPE } from './filetree.js';
import { matchKnown, matchAllKnown } from '../known/registry.generated.js';
import { createRawView } from './rawview.js';
import { loadMonaco } from './monaco-loader.js';
import { initOffline, offlineMissHtml, initOfflineBadge } from './offline.js';
import * as persistence from './persistence.js';
import { registerCodeMetrics } from '../types/text/code/codelens.js';
import { mountPreview, captureBodyHtml } from './iframe.js';
import { getModel, monacoOptions, renderSettings, persistGlobalKey, readGlobalKey, syncModelPreset } from './settings.js';
import { previewStyle } from './settings-schema.js';
import { initGames } from '../games/launcher.js';
import { loadExamples } from './examples.js';
import { initLayout, layoutTopbar, toggleMoreMenu, closeMoreMenu, updateExportButton, closeExportMenu, toggleExportMenu, applyLayout, applyPreviewPaneWidth, initSplitDivider } from './layout.js';
import { mapPreviewToRaw, syncScrollFromPreview } from './sync.js';
import { initCompare, startCompare, onComparePicked, stopCompare, resetCompare, initCompareDropTarget } from './compare.js';
import { initRawPane, buildRawView, onRawEdited, hasUnsavedWork, confirmDiscard, setRawMode, syncRawModeButtons, takeScreenshot, downloadCurrent, exitWysiwygForFeature } from './rawpane.js';
import { initFolder, loadFolder, openRepoView, onTreeSearchInput, searchTreeContents, exportFolder, folderContext, setTree, initTreeResize, onTreeKey, showFolderLoading, hideFolderLoading } from './folder.js';
import { clearArchiveTree, mountArchiveTree } from './archive-tree.js';
import { $, isMobile, state, toast, themeIsDark, escapeHtml, debounce } from './state.js';
import { initCompanionUi, isCompanionAvailable, hasCompanionFolderRoot, setCompanionLinked, resetCompanionFolderRoot, resolveDroppedFolderRoot, absolutePathForFile, startWatching, syncSaveBtn, onSaveClick, onDeleteClick, renderCompanionSettings, detectCompanionOnStartup, tryAutoLink, deleteTreePath, onConnButtonClick } from './companion-ui.js';
import { initSessionTree, updateSessionTree, createNewFile, onTreeFileDrop, flushSessionEdit } from './session-tree.js';
import { populateTypeSelect } from './type-select.js';
import { initViewerOpen, openExampleFile, openViewerFile, openBlobFile, searchViewerFile } from './viewer-open.js';

/* ─────────────────────────── Intake → render ─────────────────────────── */

async function loadIntake(intake) {
  // Guard unsaved work — unless loadFolder already asked for this same action.
  const fromTree = state._skipDiscardGuard;
  if (fromTree) flushSessionEdit();
  if (state._skipDiscardGuard) state._skipDiscardGuard = false;
  else {
    const retainedSessionEdit = flushSessionEdit();
    const onlyRetainedSessionEdits = state.sessionEdits.size > 0
      && state.folderEdits.size === 0
      && !state.binaryEdit?.dirty
      && !(state.rawview?.isDirty() && !retainedSessionEdit);
    if (!onlyRetainedSessionEdits && !confirmDiscard()) return;
  }
  // Leaving folder context for a fresh top-level file open: discard stale folder state so
  // old folderEdits don't trigger a false "unsaved changes" prompt on the next open.
  if (!fromTree) {
    state.folderEdits = new Map(); state.folderMoves = new Map(); state.folderExported = false;
    clearArchiveTree();
  }
  if (intake.truncated) {
    const mb = (intake.size / 1048576).toFixed(0);
    const shown = (intake.loadedBytes / 1048576).toFixed(0);
    if (!confirm(`This file is ${mb} MB — too large to load fully. Only the first ${shown} MB will be shown. Open anyway?`)) return;
  } else if (!intake.streamed && intake.size > LARGE_FILE_BYTES) {
    const mb = (intake.size / 1048576).toFixed(1);
    if (!confirm(`This file is ${mb} MB. Large files may be slow in the editor. Open anyway?`)) return;
  }
  state.downloadedSinceEdit = true;    // fresh document — nothing unsaved yet
  state.binaryEdit = null;
  state.currentFolderPath = null;      // single-file load by default; openTreeFile re-sets it
  state.intake = intake;
  metaBtnClicks = 0; clearTimeout(_metaBtnTimer);  // opening a file ends any meta-button click streak (resets the easter-egg counter)
  setCompanionLinked(null);            // clear any prior linked path on new file open
  // When loading a single top-level file (not a folder-tree navigation), reset the folder root
  // so save doesn't accidentally compute paths against a stale folder.
  if (!fromTree) resetCompanionFolderRoot();
  const { type, ranking } = pickType(intake);
  state.knownCandidates = matchAllKnown(intake, ranking);
  populateTypeSelect(ranking, type.id, !!state.settingsModel?.values?.showAllTypes, intake, state.knownCandidates);
  await activateType(type);
  if (intake.truncated) {
    const shown = (intake.loadedBytes / 1048576).toFixed(0);
    const total = (intake.size / 1048576).toFixed(0);
    toast(`Large file: showing the first ${shown} MB of ${total} MB.`, 6000);
  }
  updateSessionTree(intake);
  // Silently link a single opened file to its on-disk match (recursive in watched folders, incl.
  // subfolders) so Save-to-existing and Delete light up without a manual save first.
  if (!fromTree) tryAutoLink();
  maybeUnlockEasteregg(intake.text);
}

// Easter egg: opening (or editing) any file whose text contains a line `import easteregg`
// unlocks the arcade. Mirrors the edit-time hook in rawpane.js so a dedicated easter-egg file
// (docs/examples/easteregg.txt) enables it just by being opened.
function maybeUnlockEasteregg(text) {
  if (!text || !state.games || state.games.isUnlocked()) return;
  if (!/(^|\n)\s*import\s+easteregg\b/.test(text)) return;
  state.games.unlock();
  $('gamesBtn').hidden = false;
  toast('🎮 import easteregg — arcade unlocked!');
  state.games.open();
}

// Load a dropped/picked folder: reset any prior companion root, build the tree, then resolve the
// dropped folder's real disk root (for save/watch). Shared by wireIntake and the boot bridge.
async function openFolderEntries(entries) {
  resetCompanionFolderRoot();
  await loadFolder(entries);
  resolveDroppedFolderRoot(entries);   // pass {file, path} entries — `path` is the real relative path
}

// Return to the intake screen to pick another file/folder (keeps any loaded tree).
function showIntake() {
  $('intake').hidden = false;
  $('workspace').hidden = true;
  $('repoPanel').hidden = true;
}

/* ─────────────────────────── Type activation ─────────────────────────── */

async function activateType(type, knownOverride = null) {
  state.type = type;
  state.settingsModel = await getModel(type);   // cached per type (no re-fetch per file)
  // Layer 3: does a known-file enhancement apply (e.g. package.json, Dockerfile)? A known
  // renderer can supply a preview even when the base type has none (e.g. Dockerfile→code).
  // knownOverride lets the type-select force a specific known-file view.
  state.known = knownOverride || matchKnown(state.intake, type);
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
  $('typeHelpBtn').hidden = false;

  // Capabilities decide which surfaces exist. Some types are preview-only (PDF: no raw
  // editor), some raw-only (code), some both (markdown).
  const canRaw = type.capabilities.rawView;
  $('previewOnlyBadge').hidden = canRaw !== false;
  // A matched known-file enhancement provides a preview even if the base type doesn't.
  const canPreview = type.capabilities.preview || (!!state.known && !state.forceBase);
  const canDiff = type.capabilities.diff && canRaw && !state.intake.isBinary;
  const both = canRaw && canPreview;
  $('viewMode').hidden = !both || isMobile();
  $('rawMode').hidden = !canDiff;
  $('downloadBtn').hidden = !canDiff;
  $('formatBtn').hidden = !(canRaw && ['json', 'code'].includes(type.id));
  syncSaveBtn();
  $('tabbar').style.display = both && isMobile() ? 'flex' : 'none';
  $('screenshotBtn').hidden = !(type.capabilities.screenshot && canPreview);
  $('sbsBtn').hidden = !canPreview;            // view this file beside another
  const preferredMode = ['raw', 'split', 'preview'].includes(type.preferredMode) ? type.preferredMode : 'split';
  state.mode = both ? preferredMode : (canPreview && !canRaw ? 'preview' : 'raw');
  state.rawMode = 'current';
  resetCompare();                              // a fresh file drops any active two-file comparison
  // On phones, default to Preview when a type has one — reading beats Monaco-on-glass.
  state.tab = both ? (isMobile() ? 'preview' : 'raw') : (canPreview && !canRaw ? 'preview' : 'raw');
  state.htmlAllowScripts = false; state.htmlAsked = false;   // re-ask per file

  if (canRaw) await buildRawView();
  else { state.rawview?.dispose(); state.rawview = null; $('editor').innerHTML = ''; }
  // Clear the prior file's preview synchronously before the (async) render of this new file, so
  // the previous file's DOM can't linger in #previewHost during the await (stale-content flash /
  // a fast reader seeing the wrong file). Done here on the new-file path only — NOT in
  // renderPreview(), which also runs for same-file re-renders (e.g. theme toggle) where clearing
  // would cause an empty-pane flash.
  clearPreview();
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
    const ctx = {
      settings: state.settingsModel.values,
      folder: folderContext(),
      onBinaryEdit: (edit) => {
        if (state.archiveTree && state.currentFolderPath && edit?.dirty) {
          (state.binaryEdits = state.binaryEdits || new Map()).set(state.currentFolderPath, edit);
        }
        state.binaryEdit = edit || null;
        state.downloadedSinceEdit = !edit?.dirty;
        syncSaveBtn();
      },
    };
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
    // Live-node previews aren't screenshot-able via the sanitized-body path UNLESS the renderer
    // also supplies a static bodyHtml (e.g. structured trees that add a live query panel but keep
    // a screenshot-able HTML tree).
    state.lastBodyHtml = rendered.bodyHtml || null;
    state.previewCleanup = rendered.revoke || null;
    state.preview = { iframe: null, highlight() {}, scrollTo() {}, destroy() { $('previewHost').innerHTML = ''; } };
    updateExportButton();
    return;
  }
  if (rendered.archiveTree) mountArchiveTree(rendered.archiveTree, rendered.openEntry, loadIntake, state.intake);
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
    if (state.archiveTree && state.archiveOpenNode) {
      await state.archiveOpenNode(name);
      return;
    }
    const intake = await openEntry(name);
    if (!intake) { toast('Could not open ' + name); return; }
    state._skipDiscardGuard = true;   // container view holds no editable/unsaved work
    await loadIntake(intake);
    state.treeApi?.setActive?.(name);
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
  renderCompanionSettings($('settingsBody'));
}

// Re-apply settings after any change. Editor options apply live; the preview only
// re-renders when a viewer setting that affects rendering changed (syncScroll reads live).
function onSettingsChange(model, changedKey) {
  state.rawview?.updateOptions(monacoOptions(model));
  // "Show all file types" is a global pref applied to the type dropdown immediately.
  if (changedKey === 'showAllTypes') {
    persistGlobalKey('showAllTypes', model.values.showAllTypes);
    if (state.intake && state.type) {
      const { ranking } = pickType(state.intake);
      const selId = state.known && !state.forceBase ? 'known:' + state.known.id : state.type.id;
      populateTypeSelect(ranking, selId, !!state.settingsModel?.values?.showAllTypes, state.intake, state.knownCandidates || []);
    }
  }
  // "Reduce motion" is a global pref that toggles a root class disabling all CSS animation.
  if (changedKey === 'reduceMotion') {
    persistGlobalKey('reduceMotion', model.values.reduceMotion);
    applyReduceMotion(model.values.reduceMotion);
  }
  if (!state.type?.capabilities.preview) return;
  if (changedKey === 'previewMaxWidth' || changedKey === 'previewWidthMode') applyLayout();   // resize the split pane too
  const cat = model.descriptors.find((d) => d.key === changedKey)?.category;
  const viewerRenderKey = cat && cat.startsWith('viewer') && changedKey !== 'syncScroll';
  if (!changedKey || viewerRenderKey) renderPreview();
}

/* ─────────────────────────── Theme ─────────────────────────── */

function applyTheme(dark) {
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  // Parent-pane (parentNode) renderers theme off `body.fv-dark` — the same class the iframe body
  // gets — so mirror the dark state there too. Without this, those renderers' dark rules never
  // applied in the parent (the class was only ever set inside the sandboxed iframe).
  document.body.classList.toggle('fv-dark', !!dark);
  localStorage.setItem('fv:theme', dark ? 'dark' : 'light');
  state.rawview?.setTheme(dark ? 'dark' : 'light');
  // Re-render to re-theme the preview — but NOT while there are unsaved binary
  // edits (image draw/crop/etc.), since a re-render rebuilds the viewer from the
  // original bytes and would silently discard the user's in-progress edits.
  if (state.preview && state.type?.capabilities.preview && !state.binaryEdit?.dirty) renderPreview();
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

// Type documentation opens as a centered modal dialog (not a side drawer).
async function openTypeHelp() {
  const dialog = $('typeHelpDialog');
  if (!dialog) return;
  const { buildTypeHelp } = await import('./type-help.js');
  buildTypeHelp(state.type?.id);
  if (!dialog.dataset.wired) {
    dialog.dataset.wired = '1';
    dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close());
    // Close on backdrop click (clicks that land on the <dialog> element itself).
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  }
  if (!dialog.open) dialog.showModal();
}

/* ─────────────────────────── metaBtn Easter egg ─────────────────────────── */

let metaBtnClicks = 0;
let _metaBtnTimer = null;
const META_BTN_MSGS = [
  'You found a secret. Keep clicking...',
  'Interesting. Most people stop before now.',
  'Almost there...',
  'One more.',
];

/* ─────────────────────────── Examples ─────────────────────────── */

/* ─────────────────────────── Helpers ─────────────────────────── */

/* ─────────────────────────── Wire up ─────────────────────────── */

function init() {
  initCompanionUi({ loadIntake });
  initSessionTree({ loadIntake });
  initViewerOpen({ loadIntake });
  // Inject the core-flow callbacks the folder module needs (one-way: app imports folder, folder
  // gets these via init — no circular import).
  initFolder({
    loadIntake, confirmDiscard,
    // Called after each folder-tree file opens so we can start watching its absolute disk path.
    onFolderFileOpened: (node) => {
      if (!isCompanionAvailable() || !hasCompanionFolderRoot()) return;
      const absPath = absolutePathForFile(node.path);
      if (!absPath) return;
      // Watch this specific file for changes on disk (replaces any prior single-file watch).
      startWatching(absPath);
      syncSaveBtn(); // re-evaluate save button now that currentFolderPath + root are known
    },
    // Per-row delete (file or folder) straight from the tree, without opening the file first.
    onTreeDelete: deleteTreePath,
  });
  initLayout({ renderPreview, openSettings });
  initRawPane({ renderPreview });
  initCompare({ syncRawModeButtons });
  // Theme: saved or system.
  const saved = localStorage.getItem('fv:theme');
  applyTheme(saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches);
  applyReduceMotion(readGlobalKey('reduceMotion', false));

  wireIntake({
    dropZone: $('dropZone'), fileInput: $('fileInput'), folderInput: $('folderInput'),
    onIntake: loadIntake,
    onFolder: openFolderEntries,
    onError: (e) => toast('Could not read file: ' + e.message),
    onFolderStatus: (message, opts = {}) => {
      if (!message) { hideFolderLoading(); return; }
      $('ftRoot').textContent = 'Loading folder'; $('treeBtn').hidden = false; setTree(true);
      showFolderLoading(message, opts);
    },
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

  $('typeSelect').addEventListener('change', async (e) => {
    const val = e.target.value;
    if (val.startsWith('known:')) {
      const knownId = val.slice(6);
      const match = (state.knownCandidates || []).find((m) => m.known.id === knownId);
      if (match) await activateType(match.baseType, match.known);
      return;
    }
    const t = getType(val);
    if (t) await activateType(t);
  });
  $('themeBtn').addEventListener('click', () => applyTheme(!themeIsDark()));
  $('settingsBtn').addEventListener('click', () => openDrawer('settingsDrawer', openSettings));
  $('typeHelpBtn').addEventListener('click', () => openTypeHelp());
  $('metaBtn').addEventListener('click', async () => {
    metaBtnClicks++;
    clearTimeout(_metaBtnTimer);
    _metaBtnTimer = setTimeout(() => { metaBtnClicks = 0; }, 2000);
    if (metaBtnClicks <= 4) {
      const { buildMetadata } = await import('./meta-drawer.js');
      openDrawer('metaDrawer', buildMetadata);
      return;
    }
    if (metaBtnClicks <= 8) { toast(META_BTN_MSGS[metaBtnClicks - 5]); return; }
    metaBtnClicks = 0;
    clearTimeout(_metaBtnTimer);
    state.games?.unlock();
    $('gamesBtn').hidden = false;
    toast('🎮 Games unlocked!');
    state.games?.open();
  });
  $('scrim').addEventListener('click', () => { closeDrawers(); if (isMobile()) setTree(false); });
  document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeDrawers));
  $('fullscreenBtn').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  });
  $('screenshotBtn').addEventListener('click', takeScreenshot);
  $('sbsBtn').addEventListener('click', async () => { await exitWysiwygForFeature(); const { startSideBySide } = await import('./sidebyside.js'); startSideBySide(); });
  $('sbsInput').addEventListener('change', async (e) => { const f = e.target.files && e.target.files[0]; if (f) { const { openSideBySide } = await import('./sidebyside.js'); openSideBySide(f); } });
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
  $('compareBtn').addEventListener('click', async () => { await exitWysiwygForFeature(); startCompare(); });
  $('compareInput').addEventListener('change', onComparePicked); initCompareDropTarget();
  $('compareBar').querySelector('.compare-stop').addEventListener('click', stopCompare);
  $('downloadBtn').addEventListener('click', downloadCurrent);
  $('saveBtn').addEventListener('click', onSaveClick);
  $('deleteBtn').addEventListener('click', onDeleteClick);
  $('companionStatusBtn').addEventListener('click', onConnButtonClick);

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

  // Defer the example gallery until after the main UI is wired and first paint has settled. The
  // intake screen shows a lightweight "Loading examples…" placeholder (in index.html) meanwhile,
  // so the ~1154-entry catalogue render stays off the critical interaction path.
  const loadGallery = () => loadExamples(loadIntake);
  if ('requestIdleCallback' in window) requestIdleCallback(loadGallery, { timeout: 2000 });
  else setTimeout(loadGallery, 0);

  // Startup stays light (Monaco isn't loaded just to show the intake screen). Warm it in
  // the background during idle so the FIRST file opens instantly instead of waiting on
  // the heaviest dependency. loadMonaco() caches its promise, so buildRawView reuses this.
  const warm = () => { loadMonaco().then((m) => registerCodeMetrics(m)).catch(() => {}); };
  if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 3000 });
  else setTimeout(warm, 1200);

  // Register the service worker + start the background offline precache (spinner → ✓).
  initOffline($('offlineStatus'));
  initOfflineBadge();

  detectCompanionOnStartup();

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
    openViewerFile, openFile: openViewerFile, openExampleFile, openExampleByLabel, openBlobFile, searchViewerFile,
    persistence, games,
    screenshot: () => captureBodyHtml(state.lastBodyHtml, { theme: themeIsDark() ? 'dark' : 'light', style: previewStyle(state.settingsModel.values) }),
  };

  // Signal the eager boot shell that the full pipeline is live, handing it the open functions so it
  // can drain any file/folder/paste captured before this heavy module finished loading (forwarded
  // through the exact same pipeline as a live drop), then resolve window.__fvReady. Runs during this
  // module's evaluation — before import('./app.js') resolves — so we pass the bridge directly rather
  // than rely on the module export. No-op if loaded without boot.js.
  window.__fvOnReady?.({
    openIntake: loadIntake,
    openFolder: openFolderEntries,
    onError: (err) => toast('Could not read file: ' + err.message),
  });
}

// Run init once the DOM is ready. A bare addEventListener('DOMContentLoaded') would miss the
// event if it already fired — which happens now that an imported module (iframe.js) uses a
// top-level await, delaying this module's evaluation past DOMContentLoaded. So fire immediately
// if the document is already parsed.
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
