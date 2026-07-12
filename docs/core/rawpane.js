// Raw pane (Monaco editor) controller: build the editor for the active file, track edits + unsaved
// work, the original/current/diff/move-diff mode switch, screenshot + download toolbar actions.
// Extracted from app.js; renderPreview (the core re-render) is injected via initRawPane so this
// module doesn't import app.js back.
import { state, $, toast, themeIsDark, debounce } from './state.js';
import { loadGlobal, vendor } from './script-loader.js';
import { startAutosave, stopAutosave, clearAutosave, getAutosave } from './autosave.js';
import { createRawView } from './rawview.js';
import { hexDump } from './hexdump.js';
import { monacoOptions, persistTypeKey } from './settings.js';
import { previewStyle } from './settings-schema.js';
import { captureBodyHtml } from './iframe.js';
import { mapRawToPreview, syncScrollFromRaw } from './sync.js';
import { applyLayout } from './layout.js';
import { markdownLinkForPastedUrl } from '../types/markdown/edit-actions.js';
import { mountWysiwyg, unmountWysiwyg, getWysiwygValue, isWysiwygActive } from '../types/markdown/wysiwyg.js';
import { toggleHtmlWysiwyg, teardownHtmlWysiwyg, getHtmlWysiwygValue,
  setTableMode, wireTableModeBtn, teardownTableEditor, getTableEditorValue } from './rawpane-editors.js';
import { setEnvFormMode, setIniFormMode, setTomlFormMode, setYamlFormMode,
  wireEnvFormBtn, wireIniFormBtn, wireTomlFormBtn, wireYamlFormBtn, getActiveFormValue } from './rawpane-forms.js';
import { setJsonToolsVisible, wireJsonTools, setYamlToolsVisible, wireYamlTools,
  setXmlToolsVisible, wireXmlTools, setTomlToolsVisible, wireTomlTools,
  setTextUtilsVisible, wireTextUtils } from './rawpane-toolbars.js';
import { runMarkdownAction, closeTablePicker, onMarkdownContextMenu } from './rawpane-markdown.js';
import { showEditDisclaimer, showAutosaveBanner, updateWordCount, hideWordCount } from './rawpane-banners.js';
import { applyEditorMode } from './editor-mode.js';
import { parserTextFromSource, sourceTextFromParser, sourceTextOf, withParserText, withSourceText } from './intake.js';

let renderPreview = async () => {};
export function initRawPane(deps) { renderPreview = deps.renderPreview; }

let wysiwygMode = false;
let viewerActionsPromise = null;
function viewerActions() {
  if (!viewerActionsPromise) viewerActionsPromise = import('../games/metagame/viewer-actions.js');
  return viewerActionsPromise;
}

// Re-syncs the has-tools class on rawPane: true iff ANY type-specific toolbar is visible.
// Called after each setXxxToolsVisible so that showing one toolbar and then hiding another
// doesn't incorrectly clear the class when a third toolbar is still active.
export function syncHasToolsClass() {
  const anyVisible = ['markdownTools', 'jsonTools', 'yamlTools', 'xmlTools', 'tomlTools', 'htmlToolbar'].some(
    (id) => { const el = $(id) || document.getElementById(id); return el && !el.hidden; }
  );
  $('rawPane')?.classList.toggle('has-tools', anyVisible);
}

function setMarkdownToolsVisible(visible) {
  const el = $('markdownTools');
  if (!el) return;
  el.hidden = !visible;
  syncHasToolsClass();
}

function wireMarkdownTools() {
  const el = $('markdownTools');
  if (!el || el.dataset.wired) return;
  el.dataset.wired = '1';
  // Use mousedown + preventDefault to preserve Monaco's selection before focus shifts.
  // Table action stays on click (needs position info for the picker).
  el.addEventListener('mousedown', (e) => {
    const btn = e.target.closest('[data-md-action]');
    if (!btn || btn.dataset.mdAction === 'table') return;
    e.preventDefault();
    runMarkdownAction(btn.dataset.mdAction, btn);
  });
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-md-action]');
    if (!btn || btn.dataset.mdAction === 'table') return;
    // Already handled on mousedown — prevent double-fire
    e.preventDefault();
  });
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-md-action="table"]');
    if (!btn) return;
    runMarkdownAction('table', btn);
  });
  // Dismiss the table picker when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.md-table-picker') && !e.target.closest('[data-md-action="table"]')) {
      closeTablePicker();
    }
  });
  // WYSIWYG toggle button
  document.getElementById('wysiwygBtn')?.addEventListener('click', () => toggleWysiwyg());
}

function updateWysiwygBtn() {
  // The WYSIWYG editor already shows the rendered+editable document, so it runs full-width with
  // the preview pane hidden (applyLayout reads state.wysiwygActive to force raw mode). Without this
  // the preview pane renders the same markdown next to the editor — a confusing duplicate.
  state.wysiwygActive = wysiwygMode;
  const btn = document.getElementById('wysiwygBtn');
  if (!btn) return;
  btn.classList.toggle('active', wysiwygMode);
  btn.setAttribute('aria-pressed', String(wysiwygMode));
  btn.title = wysiwygMode ? 'Switch to code editor' : 'Switch to visual editor (WYSIWYG)';
}

export async function toggleWysiwyg({ skipPersist = false } = {}) {
  if (state.type?.id !== 'markdown') return;

  if (!wysiwygMode) {
    // Switching TO WYSIWYG: capture current Monaco text, dispose Monaco, mount EasyMDE
    if (!state.rawview) return;
    const text = parserTextFromSource(state.rawview.getValue());
    state.rawview.dispose();
    state.rawview = null;
    wysiwygMode = true;
    updateWysiwygBtn();
    await mountWysiwyg(document.getElementById('editor'), text, async (value) => {
      state.intake = withParserText(state.intake, value);
      state.downloadedSinceEdit = false;
      if (state.currentFolderPath) {
        state.folderEdits.set(state.currentFolderPath, value);
        state.folderExported = false;
        state.treeApi?.setEdited?.(state.currentFolderPath, true);
      } else if (state.sessionIntakes.has(state.intake?.filename)) {
        state.sessionEdits.set(state.intake.filename, value);
        state.treeApi?.setEdited?.(state.intake.filename, true);
      }
      // Preview pane is hidden while WYSIWYG is full-screen, so don't re-render it per keystroke;
      // buildRawView() re-renders it when the user switches back to the code editor.
      updateWordCount(value, 'markdown');
    });
    if (!skipPersist && state.settingsModel) {
      state.settingsModel.values.markdownEditor = 'wysiwyg';
      persistTypeKey('markdown', 'markdownEditor', 'wysiwyg');
    }
    applyLayout();   // go full-width: hide the now-redundant preview pane
    setTextUtilsVisible(false);   // line-based utils (sort/trim/dedup/base64) don't apply to the rich editor
  } else {
    // Switching BACK to Monaco: capture EasyMDE text, unmount, rebuild rawview.
    const text = getWysiwygValue();
    unmountWysiwyg();
    wysiwygMode = false;
    state.intake = withParserText(state.intake, text);
    updateWysiwygBtn();
    // Persist 'monaco' BEFORE buildRawView: buildRawView's auto-activate step reads
    // settingsModel.markdownEditor and would immediately re-enter WYSIWYG (disposing the
    // just-built Monaco) if it still read 'wysiwyg'. Order matters here.
    if (!skipPersist && state.settingsModel) {
      state.settingsModel.values.markdownEditor = 'monaco';
      persistTypeKey('markdown', 'markdownEditor', 'monaco');
    }
    await buildRawView();
    await renderPreview();
    applyLayout();
  }
}

// Compare / side-by-side need the Monaco raw editor. If the WYSIWYG editor is active,
// switch back to it first (this persists the 'monaco' choice so buildRawView doesn't
// immediately re-enter WYSIWYG). Returns true if it switched. Awaitable so callers can
// run the feature once the rawview exists again.
export async function exitWysiwygForFeature() {
  if (!wysiwygMode) return false;
  await toggleWysiwyg();
  return true;
}

export async function buildRawView({ isCurrent = () => true, signal } = {}) {
  if (!isCurrent() || signal?.aborted) return false;
  stopAutosave();
  hideWordCount();
  // Tear down the alternate editor surfaces (HTML visual / CSV table) when rebuilding.
  teardownHtmlWysiwyg();
  teardownTableEditor();
  // Tear down env form editor when rebuilding (e.g. file changed)
  setEnvFormMode(false);
  // Tear down ini form editor when rebuilding (e.g. file changed)
  setIniFormMode(false);
  // Tear down toml form editor when rebuilding (e.g. file changed)
  setTomlFormMode(false);
  // Tear down yaml form editor when rebuilding (e.g. file changed)
  setYamlFormMode(false);
  // If WYSIWYG was active (e.g. file changed), tear it down first
  if (wysiwygMode) {
    unmountWysiwyg();
    wysiwygMode = false;
    updateWysiwygBtn();
  }
  state.rawview?.dispose();
  state.rawview = null;
  // syntaxLanguage may be a function(intake) for types that pick the language per file (code).
  const sl = state.type.syntaxLanguage;
  const lang = state.intake.isBinary ? 'plaintext' : ((typeof sl === 'function' ? sl(state.intake) : sl) || 'plaintext');
  // Binary files get a read-only hex dump (offset / hex / ASCII) instead of a placeholder.
  const text = state.intake.isBinary
    ? hexDump(state.intake.bytes)
    : sourceTextOf(state.intake);
  const originalText = state.intake.isBinary ? text : (state.intake.originalText ?? text);
  const nextRawview = await createRawView($('editor'), {
    originalText, currentText: text, language: lang,
    theme: themeIsDark() ? 'dark' : 'light',
    options: { readOnly: state.intake.isBinary, ...monacoOptions(state.settingsModel) },
    onChange: debounce((value) => onRawEdited(value), 250),
    onCursor: (line) => mapRawToPreview(line),
    onScroll: () => syncScrollFromRaw(),
    onContextMenu: state.type?.id === 'markdown' ? onMarkdownContextMenu : undefined,
    onPaste: state.type?.id === 'markdown'
      ? ({ text, selected }) => markdownLinkForPastedUrl(selected, text)
      : undefined,
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
    signal,
    isCurrent,
  });
  if (!nextRawview || !isCurrent() || signal?.aborted) {
    nextRawview?.dispose();
    return false;
  }
  state.rawview = nextRawview;
  if (!state.intake.isBinary) state.rawview.addCommand?.('ctrl+s', downloadCurrent);
  // Editor mode for Monaco-backed code types (code/dockerfile/dxf/gcode): explicitly editable
  // Monaco + Ctrl+S download. Additive — read view + Download button are untouched.
  applyEditorMode(state.rawview, state.type, { isBinary: state.intake.isBinary, onSave: downloadCurrent });
  wireMarkdownTools();
  setMarkdownToolsVisible(state.type?.id === 'markdown' && !state.intake.isBinary);
  if (state.type?.id === 'markdown' && !state.intake.isBinary) {
    state.rawview.addCommand?.('ctrl+b', () => runMarkdownAction('bold'));
    state.rawview.addCommand?.('ctrl+i', () => runMarkdownAction('italic'));
  }
  // Auto-activate WYSIWYG if the user's preference is set
  if (state.type?.id === 'markdown' && !state.intake.isBinary
      && state.settingsModel?.values?.markdownEditor === 'wysiwyg') {
    if (!isCurrent() || signal?.aborted) return false;
    await toggleWysiwyg({ skipPersist: true });
    if (!isCurrent() || signal?.aborted) return false;
  }
  wireJsonTools();
  setJsonToolsVisible(state.type?.id === 'json' && !state.intake.isBinary);
  wireYamlTools();
  setYamlToolsVisible(state.type?.id === 'yaml' && !state.intake.isBinary);
  wireXmlTools();
  setXmlToolsVisible(state.type?.id === 'xml' && !state.intake.isBinary);
  wireTomlTools();
  setTomlToolsVisible(state.type?.id === 'toml' && !state.intake.isBinary);
  wireTableModeBtn();
  const isTabular = state.type?.id === 'csv' && !state.intake.isBinary;
  const tableModeBtn = document.getElementById('tableModeBtn');
  if (tableModeBtn) {
    tableModeBtn.hidden = !isTabular;
    tableModeBtn.classList.remove('active');
    tableModeBtn.setAttribute('aria-pressed', 'false');
  }
  wireTextUtils();
  // Show text-utils only when no structured-type toolbar is active in raw mode.
  // Markdown co-exists (both bars show; markdown toolbar = first row, textutils = second row).
  // JSON/YAML/XML/CSV have always-on toolbars that would overlap textutils at top:0,
  // so hide textutils for those types. HTML toolbar only appears in WYSIWYG mode (not raw),
  // so HTML files are fine to show textutils in raw mode. CSV has table mode btn, not a toolbar.
  const hasAlwaysOnToolbar = ['json', 'yaml', 'xml'].includes(state.type?.id);
  setTextUtilsVisible(!state.intake?.isBinary && !hasAlwaysOnToolbar);
  wireEnvFormBtn();
  const filename = (state.intake?.filename || state.intake?.name || '').split('/').pop().toLowerCase();
  const isEnv = (state.type?.id === 'env' || filename.endsWith('.env')) && !state.intake.isBinary;
  const envFormBtn = document.getElementById('envFormBtn');
  if (envFormBtn) {
    envFormBtn.hidden = !isEnv;
    envFormBtn.classList.remove('active');
    envFormBtn.setAttribute('aria-pressed', 'false');
  }
  wireIniFormBtn();
  const isIni = state.type?.id === 'ini' && !state.intake.isBinary;
  const iniFormBtn = document.getElementById('iniFormBtn');
  if (iniFormBtn) {
    iniFormBtn.hidden = !isIni;
    iniFormBtn.classList.remove('active');
    iniFormBtn.setAttribute('aria-pressed', 'false');
  }
  wireTomlFormBtn();
  // Reset tomlFormBtn active state (visibility is inherited from #tomlTools parent)
  const tomlFormBtn = document.getElementById('tomlFormBtn');
  if (tomlFormBtn) {
    tomlFormBtn.classList.remove('active');
    tomlFormBtn.setAttribute('aria-pressed', 'false');
  }
  wireYamlFormBtn();
  // Reset yamlFormBtn active state (visibility is inherited from #yamlTools parent)
  const yamlFormBtn = document.getElementById('yamlFormBtn');
  if (yamlFormBtn) {
    yamlFormBtn.classList.remove('active');
    yamlFormBtn.setAttribute('aria-pressed', 'false');
  }
  // HTML Visual button
  const htmlVisualBtn = document.getElementById('htmlVisualBtn');
  if (htmlVisualBtn) {
    const isHtml = state.type?.id === 'html' && !state.intake.isBinary;
    htmlVisualBtn.hidden = !isHtml;
    htmlVisualBtn.classList.remove('active');
    htmlVisualBtn.setAttribute('aria-pressed', 'false');
    if (isHtml && !htmlVisualBtn.dataset.wired) {
      htmlVisualBtn.dataset.wired = '1';
      htmlVisualBtn.addEventListener('click', () => toggleHtmlWysiwyg());
    }
  }
  syncRawModeButtons();
  showEditDisclaimer();
  // Autosave: hide any previous banner, then check for a saved version
  const _autosaveBanner = $('autosaveBanner');
  if (_autosaveBanner) { _autosaveBanner.hidden = true; $('rawPane')?.classList.remove('has-autosave'); }
  if (!state.intake?.isBinary) {
    const filename = state.intake?.filename || state.intake?.name;
    const saved = getAutosave(filename);
    if (saved && saved.text !== sourceTextOf(state.intake)) {
      showAutosaveBanner(saved);
    }
    startAutosave();
    updateWordCount(sourceTextOf(state.intake), state.type?.id);
  }
  return true;
}

// §10A.3 — The Defragmenter cheat-disable toast. Prefer the app's toast; else a 3s DIY overlay.
function showCheatToast(msg) {
  if (typeof toast === 'function') { toast(msg); return; }
  if (window.__fv && window.__fv.showToast) { window.__fv.showToast(msg); return; }
  const div = document.createElement('div');
  div.textContent = msg;
  div.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1e2a1e;color:#3fb950;padding:10px 20px;border-radius:6px;z-index:9999;font-size:14px;box-shadow:0 2px 8px #0008;transition:opacity .4s';
  document.body.appendChild(div);
  setTimeout(() => { div.style.opacity = '0'; setTimeout(() => div.remove(), 400); }, 3000);
}

export async function onRawEdited(value) {
  viewerActions().then(({ recordStage1RawEdit }) => {
    if (recordStage1RawEdit({ file: state.intake?.filename || '', text: value })) {
      showCheatToast('The Defragmenter cheat routine has been disabled.');
    }
  });

  // One-time toast (A): fire on the very first edit ever to explain the in-memory model.
  try {
    if (!localStorage.getItem(DISCLAIMER_KEY + ':toast')) {
      localStorage.setItem(DISCLAIMER_KEY + ':toast', '1');
      toast('ℹ Changes are in-memory — download to save them to your device.');
    }
  } catch { /* private mode */ }

  // Keep the working text in sync so download + preview reflect edits.
  state.intake = withSourceText(state.intake, value);
  state.downloadedSinceEdit = false;   // there are now edits not yet saved to disk
  // Folder file: stash the edit so it survives navigation + feeds "Export folder as .zip".
  if (state.currentFolderPath) {
    state.folderEdits.set(state.currentFolderPath, value);
    state.folderExported = false;      // a new edit invalidates any prior export
    state.treeApi?.setEdited?.(state.currentFolderPath, true);
  } else if (state.sessionIntakes.has(state.intake?.filename)) {
    state.sessionEdits.set(state.intake.filename, value);
    state.treeApi?.setEdited?.(state.intake.filename, true);
  }
  // Easter-egg surface: typing `import easteregg` in any editable file unlocks the arcade.
  if (state.games && !state.games.isUnlocked() && /(^|\n)\s*import\s+easteregg\b/.test(value)) {
    state.games.unlock();
    state.games.open();
    $('gamesBtn').hidden = false;
    toast('🎮 import easteregg — arcade unlocked!');
  }
  if (state.type?.capabilities.preview) await renderPreview();
  updateWordCount(value, state.type?.id);
}

// Unsaved work = the working copy differs from the original AND it wasn't downloaded
// since the last edit. Used to guard against silently discarding progress.
export function hasUnsavedWork() {
  if (state.rawview?.isDirty() && !state.downloadedSinceEdit) return true;
  if (wysiwygMode && isWysiwygActive() && !state.downloadedSinceEdit &&
      sourceTextFromParser(state.intake, getWysiwygValue()) !== (state.intake?.originalText ?? sourceTextOf(state.intake))) return true;
  const htmlValue = getHtmlWysiwygValue();
  if (htmlValue != null && !state.downloadedSinceEdit &&
      sourceTextFromParser(state.intake, htmlValue) !== (state.intake?.originalText ?? sourceTextOf(state.intake))) return true;
  if (state.binaryEdit?.dirty && !state.downloadedSinceEdit) return true;
  // Table editor: dirty when current CSV differs from the original load
  const tableValue = getTableEditorValue();
  if (tableValue != null && !state.downloadedSinceEdit &&
      sourceTextFromParser(state.intake, tableValue) !== (state.intake?.originalText ?? sourceTextOf(state.intake))) return true;
  // env/ini/toml/yaml form editor: dirty when the active form's text differs from the original load
  const formValue = getActiveFormValue();
  if (formValue != null && !state.downloadedSinceEdit &&
      sourceTextFromParser(state.intake, formValue) !== (state.intake?.originalText ?? sourceTextOf(state.intake))) return true;
  if (state.sessionEdits.size > 0) return true;
  // Folder edits stashed but not yet exported also count — closing the tab would lose them.
  return state.folderEdits.size > 0 && !state.folderExported;
}
export function confirmDiscard() {
  if (!hasUnsavedWork()) return true;
  return confirm('You have unsaved changes that haven’t been downloaded.\n\nDiscard them and continue?');
}

export function setRawMode(mode) {
  if (!state.rawview) return;
  state.rawMode = mode;
  state.rawview.setMode(mode);
  // Stage-10 finale echo: switching a memory's echo artifact into its gated raw mode (genesis →
  // Original, memory → Diff) witnesses that echo via the real feature (self-gates on the fixture).
  viewerActions().then(({ recordStage10EchoRawMode }) => recordStage10EchoRawMode({ file: state.intake?.filename || '', mode }));
  syncRawModeButtons();
  // Keep the chosen view layout (split + draggable divider) stable across raw modes so
  // nothing jumps when switching original/current/diff/move-diff. Use the view-mode
  // switch (raw/split/preview) to give a diff full width when you want it.
  applyLayout();
}

export function syncRawModeButtons() {
  document.querySelectorAll('#rawMode button:not(#compareBtn)').forEach((b) => b.classList.toggle('active', b.dataset.raw === state.rawMode));
  $('compareBtn')?.classList.toggle('active', !!state.rawview?.hasCompare?.());
}

export async function takeScreenshot() {
  if (state.lastBodyHtml == null) { toast('Screenshot not available for script-enabled HTML.'); return; }
  toast('Capturing…', 1500);
  try {
    const url = await captureBodyHtml(state.lastBodyHtml, {
      theme: themeIsDark() ? 'dark' : 'light',
      style: previewStyle(state.settingsModel.values),
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

export function currentEditableSource() {
  const tableValue = getTableEditorValue();
  if (tableValue != null) return sourceTextFromParser(state.intake, tableValue);
  const formValue = getActiveFormValue();
  if (formValue != null) return sourceTextFromParser(state.intake, formValue);
  const htmlValue = getHtmlWysiwygValue();
  if (htmlValue != null) return sourceTextFromParser(state.intake, htmlValue);
  if (wysiwygMode && isWysiwygActive()) return sourceTextFromParser(state.intake, getWysiwygValue());
  return state.rawview ? state.rawview.getValue() : sourceTextOf(state.intake);
}

export async function downloadCurrent() {
  // Stage-10 finale echo: downloading the entropy echo artifact witnesses its echo via the real
  // download feature (self-gates on the fixture; fires before the download work, so it's recorded
  // even if the browser handles the save oddly).
  viewerActions().then(({ recordStage10EchoDownload }) => recordStage10EchoDownload({ file: state.intake?.filename || '' }));
  let blob;
  if (state.binaryEdit?.dirty && typeof state.binaryEdit.getBytes === 'function') {
    const bytes = await state.binaryEdit.getBytes();
    blob = new Blob([bytes], { type: state.binaryEdit.mimeType || state.intake.mimeType || 'application/octet-stream' });
    state.binaryEdit.dirty = false;
  } else {
    const text = currentEditableSource();
    blob = new Blob([text], { type: state.intake.mimeType || 'text/plain' });
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = state.intake.filename || 'download.txt';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  if (state.sessionEdits.has(state.intake.filename)) {
    const text = currentEditableSource();
    state.sessionIntakes.set(state.intake.filename, withSourceText(state.sessionIntakes.get(state.intake.filename), text));
    state.sessionEdits.delete(state.intake.filename);
    state.treeApi?.setEdited?.(state.intake.filename, false);
  }
  state.downloadedSinceEdit = true;    // current edits are now saved to disk
  clearAutosave(state.intake?.filename || state.intake?.name);
}
