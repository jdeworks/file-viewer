// Core shell orchestrator (WP02): intake -> detect -> load type module -> lay out
// raw (Monaco) + preview (sandboxed iframe) per capability and viewport.
// Settings here are intentionally minimal; WP03 replaces buildSettings() with the
// full descriptor-driven system. The contract this file consumes is frozen.

import { wireIntake, intakeFromFile, withSourceText, LARGE_FILE_BYTES } from './intake.js';
import { getDraggedTreeNode, TREE_DRAG_TYPE } from './filetree.js';
import { initOffline, offlineMissHtml, initOfflineBadge } from './offline.js';
import * as persistence from './persistence.js';
import { mountPreview, captureBodyHtml, applyPreviewHostStyle } from './iframe.js';
import { getModel, monacoOptions, renderSettings, persistGlobalKey, readGlobalKey, syncModelPreset } from './settings.js';
import { previewStyle } from './settings-schema.js';
import { initLayout, layoutTopbar, toggleMoreMenu, closeMoreMenu, updateExportButton, closeExportMenu, toggleExportMenu, applyLayout, applyPreviewPaneWidth, initSplitDivider } from './layout.js';
import { mapPreviewToRaw, syncScrollFromPreview } from './sync.js';
import { initCompare, startCompare, onComparePicked, stopCompare, resetCompare, initCompareDropTarget } from './compare.js';
import { initRawPane, buildRawView, onRawEdited, hasUnsavedWork, confirmDiscard, setRawMode, syncRawModeButtons, takeScreenshot, downloadCurrent, exitWysiwygForFeature } from './rawpane.js';
import { initFolder, loadFolder, openRepoView, onTreeSearchInput, searchTreeContents, exportFolder, folderContext, setTree, initTreeResize, onTreeKey, showFolderLoading, hideFolderLoading } from './folder.js';
import { clearArchiveTree, mountArchiveTree } from './archive-tree.js';
import { $, isMobile, state, toast, themeIsDark, escapeHtml, debounce, activeRawviews } from './state.js';
import { initCompanionUi, isCompanionAvailable, hasCompanionFolderRoot, setCompanionLinked, resetCompanionFolderRoot, resolveDroppedFolderRoot, activateCompanionSidebarRoot, absolutePathForFile, startWatching, syncSaveBtn, onSaveClick, onDeleteClick, renderCompanionSettings, detectCompanionOnStartup, tryAutoLink, deleteTreePath, revealTreePath, onConnButtonClick } from './companion-ui.js';
import { initSessionTree, updateSessionTree, createNewFile, flushSessionEdit } from './session-tree.js';
import { initViewerOpen, openExampleFile, openViewerFile, openBlobFile, searchViewerFile } from './viewer-open.js';
import { initSidebarRoots, captureActiveSidebarRoot, removeActiveSidebarRoot, expandActiveFileRootToFolder } from './sidebar-roots.js';
import { installGlobalScreensaver } from './global-screensaver.js';
import { rankLiteCandidates } from './detect-lite.js';
import { createLatestRequestController } from './request-lifecycle.js';

/* ─────────────────────────── Intake → render ─────────────────────────── */

const previewRequests = createLatestRequestController({
  onCleanupError: (error) => console.warn('Preview cleanup failed:', error),
});
const activationRequests = createLatestRequestController({
  onCleanupError: (error) => console.warn('Activation cleanup failed:', error),
});

function beginActivation(intake) {
  previewRequests.invalidate('new activation intent');
  return activationRequests.begin({ intake });
}

function activationIsCurrent(activation) {
  return activationRequests.isCurrent(activation)
    && activation.snapshot.intake === state.intake;
}

function snapshotSettings(values) {
  try { return structuredClone(values || {}); }
  catch { return { ...(values || {}) }; }
}

let previewTestHook = null;
async function previewCheckpoint(stage, request) {
  if (typeof previewTestHook !== 'function') return;
  await previewTestHook({
    stage,
    id: request.id,
    snapshot: request.snapshot,
    signal: request.signal,
    onCleanup: (cleanup) => request.registerCleanup(cleanup),
  });
}

let knownRegistryPromise = null;
function knownRegistry() {
  if (!knownRegistryPromise) knownRegistryPromise = import('../known/registry.generated.js');
  return knownRegistryPromise;
}
let detectRuntimePromise = null;
function detectRuntime() {
  if (!detectRuntimePromise) detectRuntimePromise = import('./detect.js');
  return detectRuntimePromise;
}
let registryRuntimePromise = null;
function registryRuntime() {
  if (!registryRuntimePromise) registryRuntimePromise = import('./registry-runtime.generated.js');
  return registryRuntimePromise;
}
let typeSelectPromise = null;
function typeSelectRuntime() {
  if (!typeSelectPromise) typeSelectPromise = import('./type-select.js');
  return typeSelectPromise;
}

async function loadIntake(intake, { sidebarNavigationToken = null } = {}) {
  if (state.sidebarNavigationPending
    && sidebarNavigationToken !== state.sidebarNavigationToken) return false;
  if (state.companionOperationToken
    && state.companionReloadToken !== state.companionOperationToken) return false;
  // Guard unsaved work — unless loadFolder already asked for this same action.
  const fromTree = state._skipDiscardGuard;
  const skipSidebarRoot = state._skipSidebarRoot;
  // Combined-sidebar navigation captures the previous root before activating the target. Repeating
  // that capture now would see the old dirty editor with the new root's maps and cross-contaminate
  // them during the async transition.
  if (fromTree && !state.sidebarNavigationPending && !flushSessionEdit()) captureActiveSidebarRoot();
  if (state._skipDiscardGuard) state._skipDiscardGuard = false;
  if (state._skipSidebarRoot) state._skipSidebarRoot = false;
  else {
    const retainedSessionEdit = flushSessionEdit();
    const retainedSidebarEdit = retainedSessionEdit ? false : captureActiveSidebarRoot();
    const retainedCurrentEdit = retainedSessionEdit || retainedSidebarEdit;
    const onlyRetainedSessionEdits = (state.sessionEdits.size > 0 || retainedSidebarEdit)
      && state.folderEdits.size === 0
      && !state.binaryEdit?.dirty
      && !(state.rawview?.isDirty() && !retainedCurrentEdit);
    if (!onlyRetainedSessionEdits && !confirmDiscard()) return false;
  }
  // Leaving folder context for a fresh top-level file open: discard stale folder state so
  // old folderEdits don't trigger a false "unsaved changes" prompt on the next open.
  if (!fromTree) {
    state.folderEdits = new Map(); state.folderMoves = new Map(); state.folderExported = false;
    clearArchiveTree({ keepRoot: true });
  }
  if (intake.truncated) {
    const mb = (intake.size / 1048576).toFixed(0);
    const shown = (intake.loadedBytes / 1048576).toFixed(0);
    if (!confirm(`This file is ${mb} MB — too large to load fully. Only the first ${shown} MB will be shown. Open anyway?`)) return false;
  } else if (!intake.streamed && intake.size > LARGE_FILE_BYTES) {
    const mb = (intake.size / 1048576).toFixed(1);
    if (!confirm(`This file is ${mb} MB. Large files may be slow in the editor. Open anyway?`)) return false;
  }
  // Invalidate the prior activation/preview as soon as the new file intent is accepted — before
  // detection or renderer imports. Otherwise an older async activation can finish last and become
  // the apparent newest file.
  const activation = beginActivation(intake);
  state.downloadedSinceEdit = true;    // fresh document — nothing unsaved yet
  state.binaryEdit = null;
  state.currentFolderPath = null;      // single-file load by default; openTreeFile re-sets it
  state.intake = intake;
  metaBtnClicks = 0; clearTimeout(_metaBtnTimer);  // opening a file ends any meta-button click streak (resets the easter-egg counter)
  // Clear the live link while loading without erasing the append-only root we are leaving; that
  // root restores its own association when activated again.
  setCompanionLinked(null, { persist: false });
  // When loading a single top-level file (not a folder-tree navigation), reset the folder root
  // so save doesn't accidentally compute paths against a stale folder.
  if (!fromTree) resetCompanionFolderRoot();
  const liteCandidates = await rankLiteCandidates(intake);
  if (!activationIsCurrent(activation)) return false;
  if (liteCandidates.length) {
    showFileLoading('Detecting file type', { detail: liteCandidates.map((row) => row.type.label).join(', ') });
  }
  const [{ pickType }, { populateTypeSelect }] = await Promise.all([detectRuntime(), typeSelectRuntime()]);
  if (!activationIsCurrent(activation)) return false;
  const enableEmulators = readGlobalKey('enableEmulators', false) === true;
  const { type, ranking } = pickType(intake, { enableEmulators });
  const { matchAllKnown } = await knownRegistry();
  if (!activationIsCurrent(activation)) return false;
  state.knownCandidates = matchAllKnown(intake, ranking);
  populateTypeSelect(ranking, type.id, !!state.settingsModel?.values?.showAllTypes, intake, state.knownCandidates);
  if (!await activateType(type, null, activation)) return false;
  if (!activationIsCurrent(activation)) return false;
  showFileLoading(null);
  if (intake.truncated) {
    const shown = (intake.loadedBytes / 1048576).toFixed(0);
    const total = (intake.size / 1048576).toFixed(0);
    toast(`Large file: showing the first ${shown} MB of ${total} MB.`, 6000);
  }
  updateSessionTree(intake, { skipSidebarRoot });
  // A new desktop root docks the sidebar after activateType() performed its first layout.
  // Re-read the now-smaller pane width so the preview clamp cannot leave a stale, tiny editor.
  // On mobile this also reapplies the active tab after registering the intentionally closed root.
  applyLayout();
  // Silently link a single opened file to its on-disk match (recursive in watched folders, incl.
  // subfolders) so Save-to-existing and Delete light up without a manual save first.
  if (!fromTree) tryAutoLink();
  maybeUnlockEasteregg(intake.text);
  return true;
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

function showFileLoading(message, { detail = '' } = {}) {
  let el = document.getElementById('fileLoadStatus');
  if (!message) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('div');
    el.id = 'fileLoadStatus';
    el.className = 'file-loading';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<span class="boot-spinner-ring" aria-hidden="true"></span><span class="file-loading-copy"><span class="file-loading-label"></span><span class="file-loading-detail"></span></span>';
    document.body.appendChild(el);
  }
  el.querySelector('.file-loading-label').textContent = message;
  const detailEl = el.querySelector('.file-loading-detail');
  detailEl.textContent = detail;
  detailEl.hidden = !detail;
}

// Load a dropped/picked folder: reset any prior companion root, build the tree, then resolve the
// dropped folder's real disk root (for save/watch). Shared by wireIntake and the boot bridge.
async function openFolderEntries(entries) {
  const folderRoot = await loadFolder(entries);
  if (!folderRoot) return false;        // discard/cancel left the previous root completely intact
  // Pass the exact newly-created root. Resolution is async and another root may become active
  // before /find-folder responds; the result must never be attached to whichever root is current.
  resolveDroppedFolderRoot(entries, folderRoot);
  return true;
}

// Return to the intake screen to pick another file/folder (keeps any loaded tree).
function showIntake() {
  $('intake').hidden = false;
  $('workspace').hidden = true;
  $('repoPanel').hidden = true;
  if (isMobile()) layoutTopbar();
}

async function openSidebarDropSideBySide(node) {
  if (!state.intake) return;
  if (!node?.file) { toast('Could not find that sidebar file.'); return; }
  try {
    const path = node.path || node.sidebarInnerPath || node.file.name;
    const edited = state.folderEdits?.get(path) ?? state.sessionEdits?.get(path);
    const originalIntake = await intakeFromFile(node.file);
    const intake2 = edited != null ? withSourceText(originalIntake, edited) : originalIntake;
    const { openSideBySideWithIntake } = await import('./sidebyside.js');
    await openSideBySideWithIntake(intake2);
  } catch (err) {
    toast('Could not read file: ' + err.message);
  }
}

/* ─────────────────────────── Type activation ─────────────────────────── */

async function activateType(type, knownOverride = null, activation = null) {
  const request = activation || beginActivation(state.intake);
  const intake = request.snapshot.intake;
  const [settingsModel, { matchKnown }] = await Promise.all([
    getModel(type),
    knownRegistry(),
  ]);
  if (!activationIsCurrent(request)) return false;
  state.type = type;
  state.settingsModel = settingsModel;   // cached per type (no re-fetch per file)
  // Layer 3: does a known-file enhancement apply (e.g. package.json, Dockerfile)? A known
  // renderer can supply a preview even when the base type has none (e.g. Dockerfile→code).
  // knownOverride lets the type-select force a specific known-file view.
  state.known = knownOverride || matchKnown(intake, type);
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
  // Compare/merge (side-by-side) is independent of the in-editor Diff: it stays available for text
  // types that disable Diff (e.g. .env, whose Merge mode is the secret-safe alternative).
  const canCompare = canRaw && !state.intake.isBinary;
  const both = canRaw && canPreview;
  $('viewMode').hidden = !both || isMobile();
  $('rawMode').hidden = !canDiff;
  $('compareBtn').hidden = !canCompare;
  $('downloadBtn').hidden = !canDiff;
  $('formatBtn').hidden = !(canRaw && ['json', 'code'].includes(type.id));
  syncSaveBtn();
  $('tabbar').style.display = both && isMobile() ? 'flex' : 'none';
  $('screenshotBtn').hidden = !(type.capabilities.screenshot && canPreview);
  const preferredMode = ['raw', 'split', 'preview'].includes(type.preferredMode) ? type.preferredMode : 'split';
  state.mode = both ? preferredMode : (canPreview && !canRaw ? 'preview' : 'raw');
  state.rawMode = 'current';
  resetCompare();                              // a fresh file drops any active two-file comparison
  // On phones, default to Preview when a type has one — reading beats Monaco-on-glass.
  state.tab = both ? (isMobile() ? 'preview' : 'raw') : (canPreview && !canRaw ? 'preview' : 'raw');
  state.htmlAllowScripts = false; state.htmlAsked = false;   // re-ask per file

  if (canRaw) {
    const built = await buildRawView({
      isCurrent: () => activationIsCurrent(request),
      signal: request.signal,
    });
    if (built === false || !activationIsCurrent(request)) return false;
  }
  else { state.rawview?.dispose(); state.rawview = null; $('editor').innerHTML = ''; }
  // Clear the prior file's preview synchronously before the (async) render of this new file, so
  // the previous file's DOM can't linger in #previewHost during the await (stale-content flash /
  // a fast reader seeing the wrong file). Done here on the new-file path only — NOT in
  // renderPreview(), which also runs for same-file re-renders (e.g. theme toggle) where clearing
  // would cause an empty-pane flash.
  clearPreview();
  if (canPreview) await renderPreview(); else clearPreview();
  if (!activationIsCurrent(request)) return false;
  applyLayout();
  if (isMobile()) layoutTopbar();   // re-sync ⋯ visibility now that button hidden-states are set
  return true;
}

/* ─────────────────────────── Preview (iframe) ─────────────────────────── */

async function renderPreview() {
  const type = state.type;
  const intake = state.intake;
  if (!type || !intake) { clearPreview(); return false; }
  // A matched known-file enhancement (Layer 3) overrides the base renderer unless the user
  // toggled "show the plain view".
  const known = state.known;
  const forceBase = state.forceBase;
  const useKnown = known && !forceBase;
  const snapshot = {
    intake,
    type,
    known,
    forceBase,
    renderMode: useKnown ? 'enhanced' : 'default',
    layoutMode: state.mode,
    mobile: isMobile(),
    settingsModel: state.settingsModel,
    settings: snapshotSettings(state.settingsModel?.values),
    folder: folderContext(),
    htmlAllowScripts: state.htmlAllowScripts,
    htmlAsked: state.htmlAsked,
    theme: themeIsDark() ? 'dark' : 'light',
  };
  const request = previewRequests.begin(snapshot);
  if (!useKnown && !type.loadRenderer) {
    if (request.isCurrent()) clearMountedPreview();
    request.dispose('no renderer');
    return false;
  }
  let rendered;
  try {
    await previewCheckpoint('request-started', request);
    if (!request.isCurrent()) return false;
    const mod = useKnown ? await known.loadRenderer() : await type.loadRenderer();
    if (!request.isCurrent()) return false;
    await previewCheckpoint('module-loaded', request);
    if (!request.isCurrent()) return false;
    const ctx = {
      settings: snapshot.settings,
      folder: snapshot.folder,
      signal: request.signal,
      onCleanup: (cleanup) => request.registerCleanup(cleanup),
      onBinaryEdit: (edit) => {
        if (!request.isCurrent()) return;
        if (state.archiveTree && state.currentFolderPath && edit?.dirty) {
          (state.binaryEdits = state.binaryEdits || new Map()).set(state.currentFolderPath, edit);
        }
        state.binaryEdit = edit || null;
        state.downloadedSinceEdit = !edit?.dirty;
        syncSaveBtn();
      },
      openIntake: async (innerIntake, activePath = null) => {
        if (!request.isCurrent()) return false;
        state._skipDiscardGuard = true;
        const loaded = await loadIntake(innerIntake);
        if (loaded !== false && activePath && state.intake === innerIntake) state.treeApi?.setActive?.(activePath);
        return loaded;
      },
      toast: (...args) => { if (request.isCurrent()) toast(...args); },
    };
    if (type.id === 'html') ctx.allowScripts = snapshot.htmlAllowScripts;
    rendered = await mod.render(intake, ctx);
    if (rendered?.revoke) request.registerCleanup(rendered.revoke);
    if (rendered?.destroy && rendered.destroy !== rendered.revoke) request.registerCleanup(rendered.destroy);
    if (!request.isCurrent()) return false;
    await previewCheckpoint('rendered', request);
    if (!request.isCurrent()) return false;
    await previewCheckpoint('before-commit', request);
    if (!request.isCurrent()) return false;
  } catch (err) {
    if (!request.isCurrent()) return false;
    clearMountedPreview();
    // Offline + this renderer module was never cached (cache-on-use never saw it): a dynamic
    // import()/fetch fails. Show a friendly, actionable note instead of a raw error.
    if (!navigator.onLine) $('previewHost').innerHTML = offlineMissHtml();
    else $('previewHost').innerHTML = '<p style="padding:16px;color:var(--danger)">Preview failed: ' + escapeHtml(err.message) + '</p>';
    request.dispose('render failed');
    updateExportButton();
    return false;
  }
  // WP07 script gate: HTML with scripts is sanitized by default; ask once before running them.
  if (type.id === 'html' && rendered.containsScripts && !snapshot.htmlAllowScripts && !snapshot.htmlAsked) {
    if (!request.isCurrent()) return false;
    state.htmlAsked = true;
    if (confirm('This HTML contains scripts. Run them in a sandboxed iframe?\n\nThey cannot access this page or your data, but only continue if you trust the source. Cancel to view it sanitized (scripts removed).')) {
      if (!request.isCurrent()) return false;
      state.htmlAllowScripts = true;
      request.dispose('HTML script choice changed');
      return renderPreview();
    }
  }
  if (!request.isCurrent()) return false;
  // The final current check and the synchronous clear/mount below form one atomic commit.
  clearMountedPreview();
  // Some types (media) render a live node directly in the preview pane — outside the
  // sandboxed iframe, which can't reach blob: URLs. Safe: media bytes aren't markup.
  if (rendered.parentNode) {
    $('previewHost').appendChild(rendered.parentNode);
    // parentNode renderers normally bypass previewStyle. A renderer can opt in (styledHost) to have
    // the generic Preview settings (width/font/line-height) applied to its host — used by csv/json,
    // whose viewers most plausibly want them. Re-applied on every render, so live changes stick.
    if (rendered.styledHost) applyPreviewHostStyle(rendered.parentNode, previewStyle(snapshot.settings));
    if (rendered.archiveTree && request.isCurrent()) {
      // The mounted archive root deliberately outlives this preview: opening one entry replaces
      // the preview while the root remains available for sibling navigation. Transfer its
      // extractor at commit time instead of tying it to the disposed preview request.
      mountArchiveTree(rendered.archiveTree, rendered.openEntry, loadIntake, intake);
    }
    // Live-node previews aren't screenshot-able via the sanitized-body path UNLESS the renderer
    // also supplies a static bodyHtml (e.g. structured trees that add a live query panel but keep
    // a screenshot-able HTML tree).
    state.lastBodyHtml = rendered.bodyHtml || null;
    state.previewCleanup = () => request.dispose('preview unmounted');
    state.preview = { iframe: null, highlight() {}, scrollTo() {}, destroy() { $('previewHost').innerHTML = ''; } };
    updateExportButton();
    return true;
  }
  if (rendered.archiveTree && request.isCurrent()) {
    // See the live-node path above: archive-tree ownership persists independently after commit.
    mountArchiveTree(rendered.archiveTree, rendered.openEntry, loadIntake, intake);
  }
  // Remember the sanitized body for screenshots + Print/Save-as-PDF (null for script full docs).
  state.lastBodyHtml = rendered.fullDoc ? null : rendered.bodyHtml;
  const preview = mountPreview($('previewHost'), {
    bodyHtml: rendered.bodyHtml,
    fullDoc: rendered.fullDoc,
    allowScripts: !!rendered.ranScripts,
    theme: snapshot.theme,
    style: previewStyle(snapshot.settings),
    onSelect: (src) => { if (request.isCurrent()) mapPreviewToRaw(src); },
    onHover: (src) => { if (request.isCurrent()) mapPreviewToRaw(src, false); },
    onScroll: (ratio) => { if (request.isCurrent()) syncScrollFromPreview(ratio); },
    onOpen: rendered.openEntry ? (name) => {
      if (request.isCurrent()) openInnerEntry(guardedOpenEntry(request, rendered.openEntry), name);
    } : undefined,
  });
  request.registerCleanup(() => preview.destroy());
  state.preview = preview;
  state.previewCleanup = () => request.dispose('preview unmounted');
  if (rendered.hadUnsafe && request.isCurrent()) toast('Some unsafe HTML (scripts/handlers) was removed for safety.');
  updateExportButton();
  return true;
}

function guardedOpenEntry(request, openEntry) {
  if (typeof openEntry !== 'function') return undefined;
  return async (...args) => {
    if (!request.isCurrent()) return null;
    return openEntry(...args);
  };
}

function clearMountedPreview() {
  const cleanup = state.previewCleanup;
  state.previewCleanup = null;
  if (cleanup) cleanup();
  else state.preview?.destroy();
  state.preview = null;
  state.lastBodyHtml = null;
  updateExportButton();
  $('previewHost').innerHTML = '';
}

function clearPreview() {
  previewRequests.invalidate('preview cleared');
  clearMountedPreview();
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
  chip.querySelector('.ec-label').textContent = (showingEnhanced ? '✦ Enhanced summary: ' : 'Plain view — ') + state.known.label;
  const btn = chip.querySelector('.ec-toggle');
  btn.textContent = showingEnhanced ? 'Show default view' : 'Show enhanced summary';
}

async function toggleEnhance() {
  if (!state.known) return;
  state.forceBase = !state.forceBase;
  const expected = {
    intake: state.intake,
    type: state.type,
    known: state.known,
    forceBase: state.forceBase,
  };
  updateEnhanceChip();
  await renderPreview();
  if (state.intake !== expected.intake || state.type !== expected.type
      || state.known !== expected.known || state.forceBase !== expected.forceBase) return;
  // The enhancement can add a preview to a raw-only base type. Recompute forced/raw vs
  // preview-tab layout after each transition so mobile never remains on an empty preview pane.
  applyLayout();
}

/* ─────────────────────────── Settings (WP03) ─────────────────────────── */

function openSettings() {
  renderSettings($('settingsBody'), state.settingsModel, { onChange: onSettingsChange, toast });
  renderCompanionSettings($('settingsBody'));
}

// Re-apply settings after any change. Editor options apply live; the preview only
// re-renders when a viewer setting that affects rendering changed (syncScroll reads live).
async function onSettingsChange(model, changedKey) {
  const editorOpts = monacoOptions(model);
  state.rawview?.updateOptions(editorOpts);
  // Live-propagate editor settings to any open side-by-side / compare Monaco instances too.
  for (const rv of activeRawviews) rv.updateOptions(editorOpts);
  // "Show all file types" is a global pref applied to the type dropdown immediately.
  if (changedKey === 'showAllTypes') {
    persistGlobalKey('showAllTypes', model.values.showAllTypes);
    if (state.intake && state.type) {
      const [{ pickType }, { populateTypeSelect }] = await Promise.all([detectRuntime(), typeSelectRuntime()]);
      const { ranking } = pickType(state.intake, {
        enableEmulators: readGlobalKey('enableEmulators', false) === true,
      });
      const selId = state.known && !state.forceBase ? 'known:' + state.known.id : state.type.id;
      populateTypeSelect(ranking, selId, !!state.settingsModel?.values?.showAllTypes, state.intake, state.knownCandidates || []);
    }
  }
  // "Reduce motion" is a global pref that toggles a root class disabling all CSS animation.
  if (changedKey === 'reduceMotion') {
    persistGlobalKey('reduceMotion', model.values.reduceMotion);
    applyReduceMotion(model.values.reduceMotion);
  }
  // Heavy opt-in packages persist immediately (don't wait for "Save as global default") so the
  // eager download + "Reload to apply" flow actually sticks across the reload.
  if (changedKey === 'enableFfmpeg' || changedKey === 'enableArchiveWasm' || changedKey === 'enableEmulators') {
    persistGlobalKey(changedKey, model.values[changedKey]);
  }
  if (changedKey === 'enableEmulators' && state.intake && state.type) {
    const activation = beginActivation(state.intake);
    const [{ pickType }, { populateTypeSelect }] = await Promise.all([detectRuntime(), typeSelectRuntime()]);
    if (!activationIsCurrent(activation)) return;
    const { type, ranking } = pickType(state.intake, { enableEmulators: model.values.enableEmulators === true });
    populateTypeSelect(ranking, type.id, !!model.values.showAllTypes, state.intake, state.knownCandidates || []);
    if (type.id !== state.type.id) await activateType(type, null, activation);
    else await renderPreview();
    return;
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
  buildTypeHelp(state.type?.id, { openExampleFile });
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
  initSidebarRoots({
    loadIntake,
    onDelete: deleteTreePath,
    onReveal: revealTreePath,
    onActivate: activateCompanionSidebarRoot,
  });
  initViewerOpen({ loadIntake });
  installGlobalScreensaver();   // app-wide idle screensaver (suppressed during media/games/fullscreen)
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
    onTreeReveal: revealTreePath,   // per-row "reveal in file manager"
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
    onFileStatus: showFileLoading,
    onFolderStatus: (message, opts = {}) => {
      if (!message) { hideFolderLoading(); return; }
      $('ftRoot').textContent = 'Loading folder'; $('treeBtn').hidden = false; setTree(true);
      showFolderLoading(message, opts);
    },
  });

  // Tree-to-workspace drag: dropping a sidebar file onto the workspace opens it beside the
  // current file. Plain sidebar clicks still navigate normally.
  $('workspace').addEventListener('dragover', (e) => {
    if (!e.dataTransfer?.types?.includes(TREE_DRAG_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  $('workspace').addEventListener('drop', async (e) => {
    if (!e.dataTransfer?.types?.includes(TREE_DRAG_TYPE)) return;
    e.preventDefault();
    e.stopPropagation();
    await openSidebarDropSideBySide(getDraggedTreeNode());
  });
  $('treeBtn').addEventListener('click', () => setTree($('fileTree').hidden));
  $('treeCloseBtn').addEventListener('click', () => setTree(false));
  $('ftRemoveRootBtn').addEventListener('click', removeActiveSidebarRoot);
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
    const activation = beginActivation(state.intake);
    if (val.startsWith('known:')) {
      const knownId = val.slice(6);
      const match = (state.knownCandidates || []).find((m) => m.known.id === knownId);
      if (match) await activateType(match.baseType, match.known, activation);
      else if (activationIsCurrent(activation)) await renderPreview();
      return;
    }
    const { getType } = await registryRuntime();
    if (!activationIsCurrent(activation)) return;
    const t = getType(val);
    if (t) await activateType(t, null, activation);
    else if (activationIsCurrent(activation)) await renderPreview();
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
    applyLayout();
  });

  // Re-clamp the split pane width when the window resizes on desktop.
  window.addEventListener('resize', debounce(() => { if (state.type) applyPreviewPaneWidth(); }, 100));

  // Warn before leaving/closing the tab if there are unsaved, undownloaded edits.
  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedWork()) { e.preventDefault(); e.returnValue = ''; }
  });

  // Keep the examples catalogue out of the startup network lane. It pulls a large JSON index and
  // several helper modules, so load it only when the user asks for sample files.
  const loadGallery = async () => {
    const host = $('examples');
    if (host && !host.querySelector('.boot-spinner-ring')) {
      host.innerHTML = '<div class="ex-loading" role="status" aria-live="polite"><span class="boot-spinner-ring" aria-hidden="true"></span><span>Loading examples...</span></div>';
    }
    const { loadExamples } = await import('./examples.js');
    return loadExamples(loadIntake);
  };
  document.getElementById('loadExamplesBtn')?.addEventListener('click', loadGallery, { once: true });

  // Register the service worker + start the background offline precache (spinner → ✓).
  initOffline($('offlineStatus'));
  initOfflineBadge();

  detectCompanionOnStartup();

  // Easter-egg games: attaches only a tiny Konami-code keydown listener at startup; the hub and
  // the games themselves are lazy-loaded on first unlock, so this costs ~nothing.
  import('../games/launcher.js').then(({ initGames }) => {
    const games = initGames({ onToast: toast });
    state.games = games;   // so onRawEdited can offer the `import easteregg` unlock
    if (games.isUnlocked()) $('gamesBtn').hidden = false;
    $('gamesBtn').addEventListener('click', () => games.open());
  });

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
    // Expand the active single-file root (e.g. an open GIF) into an in-place folder of
    // entries (e.g. its split frames) — the same sidebar item gains the frames underneath.
    expandFileRootToFolder: (opts) => expandActiveFileRootToFolder(opts),
    persistence,
    rerenderPreview: renderPreview,
    setPreviewTestHook: (hook) => { previewTestHook = typeof hook === 'function' ? hook : null; },
    previewRequest: () => {
      const request = previewRequests.current();
      return request ? { id: request.id, snapshot: request.snapshot } : null;
    },
    get games() { return state.games; },
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
