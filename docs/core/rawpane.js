// Raw pane (Monaco editor) controller: build the editor for the active file, track edits + unsaved
// work, the original/current/diff/move-diff mode switch, screenshot + download toolbar actions.
// Extracted from app.js; renderPreview (the core re-render) is injected via initRawPane so this
// module doesn't import app.js back.
import { state, $, toast, themeIsDark, debounce } from './state.js';
import { createRawView } from './rawview.js';
import { hexDump } from './hexdump.js';
import { monacoOptions } from './settings.js';
import { previewStyle } from './settings-schema.js';
import { captureBodyHtml } from './iframe.js';
import { mapRawToPreview, syncScrollFromRaw } from './sync.js';
import { applyLayout } from './layout.js';
import { recordStage1RawEdit } from '../games/metagame/viewer-actions.js';
import { markdownHeading, markdownLinkForPastedUrl, markdownTable, markdownWrap, sortMarkdownTable, tableSortOptions } from '../types/markdown/edit-actions.js';

let renderPreview = async () => {};
export function initRawPane(deps) { renderPreview = deps.renderPreview; }

const DISCLAIMER_KEY = 'fv:edit-disclaimer';
let markdownContextMenu = null;

// Show the in-memory edit banner (B). Wires the dismiss buttons once, idempotently.
function setDisclaimerVisible(visible) {
  const el = $('editDisclaimer');
  if (!el) return;
  el.hidden = !visible;
  $('rawPane')?.classList.toggle('has-disclaimer', visible);
}

function showEditDisclaimer() {
  if (localStorage.getItem(DISCLAIMER_KEY) === 'never') return;
  const el = $('editDisclaimer');
  if (!el) return;
  setDisclaimerVisible(true);
  if (el.dataset.wired) return;
  el.dataset.wired = '1';
  el.querySelector('.edit-disclaimer-close').addEventListener('click', () => setDisclaimerVisible(false));
  el.querySelector('.edit-disclaimer-never').addEventListener('click', () => {
    try { localStorage.setItem(DISCLAIMER_KEY, 'never'); } catch { /* private mode */ }
    setDisclaimerVisible(false);
  });
}

function setMarkdownToolsVisible(visible) {
  const el = $('markdownTools');
  if (!el) return;
  el.hidden = !visible;
  $('rawPane')?.classList.toggle('has-tools', visible);
}

function wireMarkdownTools() {
  const el = $('markdownTools');
  if (!el || el.dataset.wired) return;
  el.dataset.wired = '1';
  const menu = el.querySelector('.md-tools-menu');
  const toggle = el.querySelector('.md-tools-toggle');
  toggle.addEventListener('click', () => {
    menu.hidden = !menu.hidden;
    toggle.setAttribute('aria-expanded', String(!menu.hidden));
  });
  el.addEventListener('click', (e) => {
    const action = e.target.closest('[data-md-action]')?.dataset.mdAction;
    if (!action) return;
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    runMarkdownAction(action);
  });
  document.addEventListener('click', (e) => {
    if (!menu.hidden && !e.target.closest('#markdownTools')) {
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}

function runMarkdownAction(action) {
  if (!state.rawview || state.type?.id !== 'markdown') return;
  if (action === 'heading') {
    state.rawview.transformSelection((text) => markdownHeading(text, 1), { expandToLines: true, source: 'markdown-heading' });
  } else if (action === 'bold') {
    state.rawview.transformSelection((text) => markdownWrap(text, '**', 'strong text'), { source: 'markdown-bold' });
  } else if (action === 'italic') {
    state.rawview.transformSelection((text) => markdownWrap(text, '*', 'emphasis'), { source: 'markdown-italic' });
  } else if (action === 'table') {
    const dims = prompt('Insert table as rows, columns', '3,3');
    if (dims == null) return;
    const [rows, cols] = dims.split(/[,\sx]+/i).map((n) => Number(n)).filter((n) => Number.isFinite(n));
    state.rawview.replaceSelection(markdownTable(rows || 3, cols || 3), { source: 'markdown-table', selectInserted: true });
  }
}

function onMarkdownContextMenu(e) {
  const selected = state.rawview?.selectionText?.() || '';
  const options = tableSortOptions(selected);
  if (!options.length) return;
  const range = state.rawview.selectionRange?.();
  e.event?.preventDefault?.();
  e.event?.stopPropagation?.();
  showMarkdownTableSortMenu(e.event?.browserEvent || e.event, options, { selected, range });
}

function showMarkdownTableSortMenu(event, options, selection) {
  closeMarkdownContextMenu();
  const menu = document.createElement('div');
  menu.className = 'md-context-menu';
  menu.setAttribute('role', 'menu');
  const title = document.createElement('div');
  title.className = 'md-context-title';
  title.textContent = 'Sort table by';
  menu.append(title);
  for (const opt of options) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = opt.label;
    btn.addEventListener('click', () => {
      const sorted = sortMarkdownTable(selection.selected, opt.index);
      if (sorted && selection.range) state.rawview.replaceRange(selection.range, sorted, { source: 'markdown-table-sort', selectInserted: true });
      closeMarkdownContextMenu();
    });
    menu.append(btn);
  }
  document.body.append(menu);
  const x = event?.clientX || 20;
  const y = event?.clientY || 20;
  menu.style.left = Math.min(x, window.innerWidth - 220) + 'px';
  menu.style.top = Math.min(y, window.innerHeight - 180) + 'px';
  markdownContextMenu = menu;
  setTimeout(() => document.addEventListener('click', closeMarkdownContextMenu, { once: true }), 0);
}

function closeMarkdownContextMenu() {
  markdownContextMenu?.remove();
  markdownContextMenu = null;
}

export async function buildRawView() {
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
  });
  wireMarkdownTools();
  setMarkdownToolsVisible(state.type?.id === 'markdown' && !state.intake.isBinary);
  syncRawModeButtons();
  showEditDisclaimer();
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
  if (recordStage1RawEdit({ file: state.intake?.filename || '', text: value })) {
    showCheatToast('The Defragmenter cheat routine has been disabled.');
  }

  // One-time toast (A): fire on the very first edit ever to explain the in-memory model.
  try {
    if (!localStorage.getItem(DISCLAIMER_KEY + ':toast')) {
      localStorage.setItem(DISCLAIMER_KEY + ':toast', '1');
      toast('ℹ Changes are in-memory — download to save them to your device.');
    }
  } catch { /* private mode */ }

  // Keep the working text in sync so download + preview reflect edits.
  state.intake = { ...state.intake, text: value };
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
}

// Unsaved work = the working copy differs from the original AND it wasn't downloaded
// since the last edit. Used to guard against silently discarding progress.
export function hasUnsavedWork() {
  if (state.rawview?.isDirty() && !state.downloadedSinceEdit) return true;
  if (state.binaryEdit?.dirty && !state.downloadedSinceEdit) return true;
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

export async function downloadCurrent() {
  let blob;
  if (state.binaryEdit?.dirty && typeof state.binaryEdit.getBytes === 'function') {
    const bytes = await state.binaryEdit.getBytes();
    blob = new Blob([bytes], { type: state.binaryEdit.mimeType || state.intake.mimeType || 'application/octet-stream' });
    state.binaryEdit.dirty = false;
  } else {
    blob = new Blob([state.rawview ? state.rawview.getValue() : (state.intake.text || '')], { type: state.intake.mimeType || 'text/plain' });
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = state.intake.filename || 'download.txt';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  if (state.sessionEdits.has(state.intake.filename)) {
    const text = state.rawview ? state.rawview.getValue() : state.sessionEdits.get(state.intake.filename);
    state.sessionIntakes.set(state.intake.filename, { ...state.sessionIntakes.get(state.intake.filename), text });
    state.sessionEdits.delete(state.intake.filename);
    state.treeApi?.setEdited?.(state.intake.filename, false);
  }
  state.downloadedSinceEdit = true;    // current edits are now saved to disk
}
