// Raw pane (Monaco editor) controller: build the editor for the active file, track edits + unsaved
// work, the original/current/diff/move-diff mode switch, screenshot + download toolbar actions.
// Extracted from app.js; renderPreview (the core re-render) is injected via initRawPane so this
// module doesn't import app.js back.
import { state, $, toast, themeIsDark, debounce } from './state.js';
import { loadGlobal, vendor } from './script-loader.js';
import { startAutosave, stopAutosave, saveNow, clearAutosave, getAutosave } from './autosave.js';
import { createRawView } from './rawview.js';
import { hexDump } from './hexdump.js';
import { monacoOptions, persistTypeKey } from './settings.js';
import { previewStyle } from './settings-schema.js';
import { captureBodyHtml } from './iframe.js';
import { mapRawToPreview, syncScrollFromRaw } from './sync.js';
import { applyLayout } from './layout.js';
import { recordStage1RawEdit } from '../games/metagame/viewer-actions.js';
import { markdownHeading, markdownLinkForPastedUrl, markdownTable, markdownWrap, markdownCodeBlock, markdownInlineCode, markdownBlockquote, markdownBulletList, markdownOrderedList, markdownStrikethrough, sortMarkdownTable, tableSortOptions } from '../types/markdown/edit-actions.js';
import { mountWysiwyg, unmountWysiwyg, getWysiwygValue, isWysiwygActive, getWysiwygCodeMirror } from '../types/markdown/wysiwyg.js';
import { HtmlWysiwygEditor } from '../types/html/wysiwyg-html.js';
import { TableEditor } from '../types/text/csv/table-editor.js';
import { setEnvFormMode, setIniFormMode, setTomlFormMode, setYamlFormMode,
  wireEnvFormBtn, wireIniFormBtn, wireTomlFormBtn, wireYamlFormBtn, getActiveFormValue } from './rawpane-forms.js';
import { setJsonToolsVisible, wireJsonTools, setYamlToolsVisible, wireYamlTools,
  setXmlToolsVisible, wireXmlTools, setTomlToolsVisible, wireTomlTools } from './rawpane-toolbars.js';

let renderPreview = async () => {};
export function initRawPane(deps) { renderPreview = deps.renderPreview; }

const DISCLAIMER_KEY = 'fv:edit-disclaimer';
let markdownContextMenu = null;
let wysiwygMode = false;
let htmlWysiwyg = null;
let tableEditor = null;

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

function formatAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return Math.floor(diff / 86400000) + 'd ago';
}

function showAutosaveBanner(saved) {
  const el = $('autosaveBanner');
  if (!el) return;
  el.querySelector('.autosave-age').textContent = `Autosave from ${formatAgo(saved.ts)} found.`;
  el.hidden = false;
  $('rawPane')?.classList.add('has-autosave');

  if (!el.dataset.wired) {
    el.dataset.wired = '1';
    el.querySelector('.autosave-restore').addEventListener('click', () => {
      state.rawview?.setValue?.(saved.text);
      state.intake = { ...state.intake, text: saved.text };
      el.hidden = true;
      $('rawPane')?.classList.remove('has-autosave');
    });
    el.querySelector('.autosave-dismiss').addEventListener('click', () => {
      el.hidden = true;
      $('rawPane')?.classList.remove('has-autosave');
      clearAutosave(state.intake?.filename || state.intake?.name);
    });
  }
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

// ── Text utilities toolbar ────────────────────────────────────────────────────
function setTextUtilsVisible(visible) {
  const el = $('textUtils');
  if (!el) return;
  el.hidden = !visible;
  $('rawPane')?.classList.toggle('has-textutils', visible);
}

function wireTextUtils() {
  const el = $('textUtils');
  if (!el || el.dataset.wired) return;
  el.dataset.wired = '1';
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-textutil]');
    if (!btn) return;
    applyTextUtil(btn.dataset.textutil);
  });
}

function applyTextUtil(action) {
  if (!state.rawview) return;
  const text = state.rawview.getValue();
  let result;

  if (action === 'sortAsc') {
    result = text.split('\n').sort((a, b) => a.localeCompare(b)).join('\n');
  } else if (action === 'sortDesc') {
    result = text.split('\n').sort((a, b) => b.localeCompare(a)).join('\n');
  } else if (action === 'trim') {
    result = text.split('\n').map((l) => l.trimEnd()).join('\n');
  } else if (action === 'dedup') {
    const seen = new Set();
    result = text.split('\n').filter((l) => { if (seen.has(l)) return false; seen.add(l); return true; }).join('\n');
  } else if (action === 'b64encode') {
    const sel = state.rawview.selectionText?.();
    const target = (sel && sel.trim()) ? sel : text;
    try {
      const encoded = btoa(unescape(encodeURIComponent(target)));
      if (sel && sel.trim()) {
        state.rawview.replaceSelection(encoded);
        return;
      }
      result = encoded;
    } catch (e) { toast('Base64 encode failed: ' + e.message); return; }
  } else if (action === 'b64decode') {
    const sel = state.rawview.selectionText?.();
    const target = ((sel && sel.trim()) ? sel : text).trim();
    try {
      const decoded = decodeURIComponent(escape(atob(target)));
      if (sel && sel.trim()) {
        state.rawview.replaceSelection(decoded);
        return;
      }
      result = decoded;
    } catch (e) { toast('Not valid Base64'); return; }
  }

  if (result !== undefined && result !== text) {
    state.rawview.setValue(result);
  }
}

let tablePicker = null;

function closeTablePicker() {
  if (tablePicker) { tablePicker.remove(); tablePicker = null; }
}

function showTablePicker(anchorEl) {
  closeTablePicker();
  const picker = document.createElement('div');
  picker.className = 'md-table-picker';
  const ROWS = 5, COLS = 5;
  const cells = [];
  const label = document.createElement('div');
  label.className = 'md-table-picker-label';
  label.textContent = '1×1';
  picker.append(label);
  const grid = document.createElement('div');
  grid.className = 'md-table-picker-grid';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'md-table-picker-cell';
      cell.dataset.r = r; cell.dataset.c = c;
      grid.append(cell);
      cells.push(cell);
    }
  }
  picker.append(grid);
  document.body.append(picker);
  tablePicker = picker;

  function highlight(rows, cols) {
    label.textContent = `${cols}×${rows}`;
    cells.forEach((cell) => {
      const r = Number(cell.dataset.r), c = Number(cell.dataset.c);
      cell.classList.toggle('active', r < rows && c < cols);
    });
  }

  grid.addEventListener('mousemove', (e) => {
    const cell = e.target.closest('.md-table-picker-cell');
    if (!cell) return;
    highlight(Number(cell.dataset.r) + 1, Number(cell.dataset.c) + 1);
  });
  grid.addEventListener('mouseleave', () => highlight(0, 0));
  grid.addEventListener('click', (e) => {
    const cell = e.target.closest('.md-table-picker-cell');
    if (!cell) return;
    const rows = Number(cell.dataset.r) + 1, cols = Number(cell.dataset.c) + 1;
    closeTablePicker();
    if (wysiwygMode && isWysiwygActive()) {
      const cm = getWysiwygCodeMirror();
      if (cm) { cm.replaceSelection(markdownTable(rows, cols)); cm.focus(); }
    } else {
      state.rawview.replaceSelection(markdownTable(rows, cols), { source: 'markdown-table', selectInserted: true });
    }
  });

  const rect = anchorEl.getBoundingClientRect();
  picker.style.left = Math.min(rect.left, window.innerWidth - 180) + 'px';
  picker.style.top = (rect.bottom + 4) + 'px';
}

function runMarkdownActionWysiwyg(action, btn) {
  const cm = getWysiwygCodeMirror();
  if (!cm) return;
  const selected = cm.getSelection();
  function wrap(before, after, placeholder) {
    const text = selected || placeholder || '';
    const aft = after ?? before;
    // Toggle off if selection is already wrapped with these markers
    if (selected && selected.startsWith(before) && selected.endsWith(aft) && selected.length >= before.length + aft.length) {
      cm.replaceSelection(selected.slice(before.length, selected.length - aft.length));
      return;
    }
    cm.replaceSelection(before + text + aft);
  }
  function wrapLines(prefix, placeholder) {
    const text = selected || placeholder || '';
    const lines = text.split('\n');
    cm.replaceSelection(lines.map((l) => prefix + l).join('\n'));
  }
  if (action === 'bold') { wrap('**', '**', 'strong text'); }
  else if (action === 'italic') { wrap('*', '*', 'emphasis'); }
  else if (action === 'strikethrough') { wrap('~~', '~~', 'text'); }
  else if (action === 'inline-code') { wrap('`', '`', 'code'); }
  else if (action === 'code-block') { wrap('```\n', '\n```', selected || 'code'); }
  else if (action === 'blockquote') { wrapLines('> ', 'quote'); }
  else if (action === 'bullet-list') { wrapLines('- ', 'item'); }
  else if (action === 'ordered-list') {
    const text = selected || 'item';
    const lines = text.split('\n');
    cm.replaceSelection(lines.map((l, i) => `${i + 1}. ${l}`).join('\n'));
  }
  else if (action === 'heading') { wrap('# ', '', selected || 'Heading'); }
  else if (action === 'table') {
    if (tablePicker) { closeTablePicker(); return; }
    showTablePicker(btn || document.getElementById('mdTableBtn'));
  }
  cm.focus();
}

function runMarkdownAction(action, btn) {
  if (wysiwygMode && isWysiwygActive()) {
    runMarkdownActionWysiwyg(action, btn);
    return;
  }
  if (!state.rawview || state.type?.id !== 'markdown') return;
  if (action === 'heading') {
    state.rawview.transformSelection((text) => markdownHeading(text, 1), { expandToLines: true, source: 'markdown-heading' });
  } else if (action === 'bold') {
    state.rawview.transformSelection((text) => markdownWrap(text, '**', 'strong text'), { source: 'markdown-bold' });
  } else if (action === 'italic') {
    state.rawview.transformSelection((text) => markdownWrap(text, '*', 'emphasis'), { source: 'markdown-italic' });
  } else if (action === 'strikethrough') {
    state.rawview.transformSelection((text) => markdownStrikethrough(text), { source: 'markdown-strikethrough' });
  } else if (action === 'inline-code') {
    state.rawview.transformSelection((text) => markdownInlineCode(text), { source: 'markdown-inline-code' });
  } else if (action === 'code-block') {
    state.rawview.transformSelection((text) => markdownCodeBlock(text), { source: 'markdown-code-block' });
  } else if (action === 'blockquote') {
    state.rawview.transformSelection((text) => markdownBlockquote(text), { expandToLines: true, source: 'markdown-blockquote' });
  } else if (action === 'bullet-list') {
    state.rawview.transformSelection((text) => markdownBulletList(text), { expandToLines: true, source: 'markdown-bullet-list' });
  } else if (action === 'ordered-list') {
    state.rawview.transformSelection((text) => markdownOrderedList(text), { expandToLines: true, source: 'markdown-ordered-list' });
  } else if (action === 'table') {
    if (tablePicker) { closeTablePicker(); return; }
    showTablePicker(btn || $('mdTableBtn'));
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

function updateWysiwygBtn() {
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
    const text = state.rawview.getValue();
    state.rawview.dispose();
    state.rawview = null;
    wysiwygMode = true;
    updateWysiwygBtn();
    await mountWysiwyg(document.getElementById('editor'), text, async (value) => {
      state.intake = { ...state.intake, text: value };
      state.downloadedSinceEdit = false;
      if (state.currentFolderPath) {
        state.folderEdits.set(state.currentFolderPath, value);
        state.folderExported = false;
        state.treeApi?.setEdited?.(state.currentFolderPath, true);
      } else if (state.sessionIntakes.has(state.intake?.filename)) {
        state.sessionEdits.set(state.intake.filename, value);
        state.treeApi?.setEdited?.(state.intake.filename, true);
      }
      if (state.type?.capabilities.preview) await renderPreview();
      updateWordCount(value, 'markdown');
    });
    if (!skipPersist && state.settingsModel) {
      state.settingsModel.values.markdownEditor = 'wysiwyg';
      persistTypeKey('markdown', 'markdownEditor', 'wysiwyg');
    }
  } else {
    // Switching BACK to Monaco: capture EasyMDE text, unmount, rebuild rawview.
    const text = getWysiwygValue();
    unmountWysiwyg();
    wysiwygMode = false;
    state.intake = { ...state.intake, text };
    updateWysiwygBtn();
    // Persist 'monaco' BEFORE buildRawView: buildRawView's auto-activate step reads
    // settingsModel.markdownEditor and would immediately re-enter WYSIWYG (disposing the
    // just-built Monaco) if it still read 'wysiwyg'. Order matters here.
    if (!skipPersist && state.settingsModel) {
      state.settingsModel.values.markdownEditor = 'monaco';
      persistTypeKey('markdown', 'markdownEditor', 'monaco');
    }
    await buildRawView();
  }
}

function setHtmlToolbarVisible(visible) {
  const el = document.getElementById('htmlToolbar');
  if (!el) return;
  el.hidden = !visible;
  syncHasToolsClass();
}

function wireHtmlToolbar() {
  const el = document.getElementById('htmlToolbar');
  if (!el || el.dataset.wired) return;
  el.dataset.wired = '1';
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cmd]');
    if (!btn || !htmlWysiwyg) return;
    const cmd = btn.dataset.cmd;
    const val = btn.dataset.val || undefined;
    if (cmd === 'createLink') { htmlWysiwyg.execLink(); }
    else { htmlWysiwyg.exec(cmd, val); }
  });
  document.getElementById('htmlLinkBtn')?.addEventListener('click', () => htmlWysiwyg?.execLink());
}

export async function toggleHtmlWysiwyg() {
  if (state.type?.id !== 'html') return;

  if (!htmlWysiwyg) {
    // Enter visual mode: capture Monaco text, hide Monaco, mount contenteditable div
    const text = state.rawview?.getValue?.() ?? (state.intake?.text || '');
    state.rawview?.dispose?.();
    state.rawview = null;
    const editorEl = document.getElementById('editor');
    if (editorEl) editorEl.style.display = 'none';
    const editorParent = editorEl?.parentElement || document.getElementById('rawPane');
    htmlWysiwyg = new HtmlWysiwygEditor(editorParent, text, async (newHtml) => {
      state.intake = { ...state.intake, text: newHtml };
      state.downloadedSinceEdit = false;
      if (state.currentFolderPath) {
        state.folderEdits.set(state.currentFolderPath, newHtml);
        state.folderExported = false;
        state.treeApi?.setEdited?.(state.currentFolderPath, true);
      } else if (state.sessionIntakes.has(state.intake?.filename)) {
        state.sessionEdits.set(state.intake.filename, newHtml);
        state.treeApi?.setEdited?.(state.intake.filename, true);
      }
    });
    htmlWysiwyg.mount();
    wireHtmlToolbar();
    setHtmlToolbarVisible(true);
    const btn = document.getElementById('htmlVisualBtn');
    if (btn) { btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true'); }
  } else {
    // Exit visual mode: capture value, unmount, restore Monaco
    const html = htmlWysiwyg.getValue();
    htmlWysiwyg.unmount();
    htmlWysiwyg = null;
    setHtmlToolbarVisible(false);
    const btn = document.getElementById('htmlVisualBtn');
    if (btn) { btn.classList.remove('active'); btn.setAttribute('aria-pressed', 'false'); }
    const editorEl = document.getElementById('editor');
    if (editorEl) editorEl.style.display = '';
    state.intake = { ...state.intake, text: html };
    await buildRawView();
  }
}

export function setTableMode(on) {
  const editorEl = document.getElementById('editor');
  const btn = document.getElementById('tableModeBtn');
  if (on) {
    // Detect separator: prefer delimiter setting, fall back to filename extension
    const settings = state.settingsModel?.values || {};
    const delimSetting = settings.delimiter;
    const DELIMS = { comma: ',', semicolon: ';', tab: '\t', pipe: '|' };
    let sep;
    if (delimSetting && delimSetting !== 'auto') {
      sep = DELIMS[delimSetting] || ',';
    } else {
      sep = (state.intake?.filename || '').toLowerCase().endsWith('.tsv') ? '\t' : ',';
    }
    const text = state.rawview ? state.rawview.getValue() : (state.intake?.text || '');
    // Freeze Monaco while table is active so its model stays consistent
    state.rawview?.updateOptions?.({ readOnly: true });
    // Mount table editor in a sibling div that overlays the editor
    let host = document.getElementById('tableEditorHost');
    if (!host) {
      host = document.createElement('div');
      host.id = 'tableEditorHost';
      // Inherit editor-host positioning + all banner-offset overrides automatically
      host.className = 'editor-host';
      editorEl?.parentNode?.insertBefore(host, editorEl);
    }
    host.hidden = false;
    if (editorEl) editorEl.style.display = 'none';
    tableEditor = new TableEditor(host, text, sep, (newCsv) => {
      state.intake = { ...state.intake, text: newCsv };
      state.downloadedSinceEdit = false;
    });
  } else {
    // Flush table editor value back to Monaco before hiding
    if (tableEditor) {
      const csv = tableEditor.getValue();
      tableEditor.destroy();
      tableEditor = null;
      if (state.rawview) {
        state.rawview.setValue(csv);
        state.rawview.updateOptions?.({ readOnly: false });
      }
      state.intake = { ...state.intake, text: csv };
    }
    const host = document.getElementById('tableEditorHost');
    if (host) host.hidden = true;
    if (editorEl) editorEl.style.display = '';
  }
  if (btn) {
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', String(on));
  }
}

function wireTableModeBtn() {
  const btn = document.getElementById('tableModeBtn');
  if (!btn || btn.dataset.wired) return;
  btn.dataset.wired = '1';
  btn.addEventListener('click', () => {
    const isOn = btn.classList.contains('active');
    setTableMode(!isOn);
  });
}

function updateWordCount(text, typeId) {
  const bar = document.getElementById('wordCountBar');
  if (!bar) return;
  if (!text || state.intake?.isBinary) {
    bar.hidden = true;
    document.getElementById('rawPane')?.classList.remove('has-wordcount');
    return;
  }
  const lines = text.split('\n').length;
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  let label;
  if (typeId === 'markdown') {
    const readMins = Math.ceil(words / 200);
    label = `${words.toLocaleString()} words · ${chars.toLocaleString()} chars · ~${readMins} min read`;
  } else if (typeId === 'text') {
    label = `${lines.toLocaleString()} lines · ${words.toLocaleString()} words · ${chars.toLocaleString()} chars`;
  } else {
    label = `${lines.toLocaleString()} lines · ${chars.toLocaleString()} chars`;
  }
  bar.textContent = label;
  bar.hidden = false;
  document.getElementById('rawPane')?.classList.add('has-wordcount');
}

function hideWordCount() {
  const bar = document.getElementById('wordCountBar');
  if (bar) bar.hidden = true;
  document.getElementById('rawPane')?.classList.remove('has-wordcount');
}

export async function buildRawView() {
  stopAutosave();
  hideWordCount();
  // Tear down HTML WYSIWYG when rebuilding (e.g. file changed)
  if (htmlWysiwyg) {
    htmlWysiwyg.unmount();
    htmlWysiwyg = null;
    setHtmlToolbarVisible(false);
    const btn = document.getElementById('htmlVisualBtn');
    if (btn) { btn.classList.remove('active'); btn.setAttribute('aria-pressed', 'false'); }
    const editorEl = document.getElementById('editor');
    if (editorEl) editorEl.style.display = '';
  }
  // Tear down table editor when rebuilding (e.g. file changed)
  if (tableEditor) {
    tableEditor.destroy();
    tableEditor = null;
    const host = document.getElementById('tableEditorHost');
    if (host) host.hidden = true;
    const editorEl = document.getElementById('editor');
    if (editorEl) editorEl.style.display = '';
  }
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
  if (!state.intake.isBinary) state.rawview.addCommand?.('ctrl+s', downloadCurrent);
  wireMarkdownTools();
  setMarkdownToolsVisible(state.type?.id === 'markdown' && !state.intake.isBinary);
  if (state.type?.id === 'markdown' && !state.intake.isBinary) {
    state.rawview.addCommand?.('ctrl+b', () => runMarkdownAction('bold'));
    state.rawview.addCommand?.('ctrl+i', () => runMarkdownAction('italic'));
  }
  // Auto-activate WYSIWYG if the user's preference is set
  if (state.type?.id === 'markdown' && !state.intake.isBinary
      && state.settingsModel?.values?.markdownEditor === 'wysiwyg') {
    await toggleWysiwyg({ skipPersist: true });
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
    if (saved && saved.text !== (state.intake?.text || '')) {
      showAutosaveBanner(saved);
    }
    startAutosave();
    updateWordCount(state.intake?.text || '', state.type?.id);
  }
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
  updateWordCount(value, state.type?.id);
}

// Unsaved work = the working copy differs from the original AND it wasn't downloaded
// since the last edit. Used to guard against silently discarding progress.
export function hasUnsavedWork() {
  if (state.rawview?.isDirty() && !state.downloadedSinceEdit) return true;
  if (wysiwygMode && isWysiwygActive() && !state.downloadedSinceEdit &&
      getWysiwygValue() !== (state.intake?.originalText ?? state.intake?.text ?? '')) return true;
  if (htmlWysiwyg && !state.downloadedSinceEdit &&
      htmlWysiwyg.getValue() !== (state.intake?.originalText ?? '')) return true;
  if (state.binaryEdit?.dirty && !state.downloadedSinceEdit) return true;
  // Table editor: dirty when current CSV differs from the original load
  if (tableEditor && !state.downloadedSinceEdit &&
      tableEditor.getValue() !== (state.intake?.originalText ?? '')) return true;
  // env/ini/toml/yaml form editor: dirty when the active form's text differs from the original load
  const formValue = getActiveFormValue();
  if (formValue != null && !state.downloadedSinceEdit &&
      formValue !== (state.intake?.originalText ?? '')) return true;
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
    const formValue = getActiveFormValue();
    const text = tableEditor ? tableEditor.getValue()
      : formValue != null ? formValue
      : htmlWysiwyg ? htmlWysiwyg.getValue()
      : wysiwygMode && isWysiwygActive() ? getWysiwygValue()
      : (state.rawview ? state.rawview.getValue() : (state.intake.text || ''));
    blob = new Blob([text], { type: state.intake.mimeType || 'text/plain' });
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = state.intake.filename || 'download.txt';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  if (state.sessionEdits.has(state.intake.filename)) {
    const formValue = getActiveFormValue();
    const text = tableEditor ? tableEditor.getValue()
      : formValue != null ? formValue
      : htmlWysiwyg ? htmlWysiwyg.getValue()
      : wysiwygMode && isWysiwygActive() ? getWysiwygValue()
      : (state.rawview ? state.rawview.getValue() : state.sessionEdits.get(state.intake.filename));
    state.sessionIntakes.set(state.intake.filename, { ...state.sessionIntakes.get(state.intake.filename), text });
    state.sessionEdits.delete(state.intake.filename);
    state.treeApi?.setEdited?.(state.intake.filename, false);
  }
  state.downloadedSinceEdit = true;    // current edits are now saved to disk
  clearAutosave(state.intake?.filename || state.intake?.name);
}
