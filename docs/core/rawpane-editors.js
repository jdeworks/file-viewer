// Alternate editor surfaces that replace Monaco in the #editor host: the HTML visual (WYSIWYG)
// editor and the CSV/TSV table editor. Both freeze/hide Monaco while active and flush their value
// back on exit. Extracted from rawpane.js for modularity. syncHasToolsClass + buildRawView are
// imported from rawpane.js at call-time (safe cycle — only invoked inside handlers).
import { state } from './state.js';
import { HtmlWysiwygEditor } from '../types/html/wysiwyg-html.js';
import { TableEditor } from '../types/text/csv/table-editor.js';
import { syncHasToolsClass, buildRawView } from './rawpane.js';

// ── HTML visual (WYSIWYG) editor ───────────────────────────────────────────────
let htmlWysiwyg = null;

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

// Tear down the HTML editor when rebuilding the raw view (e.g. file changed). Idempotent.
export function teardownHtmlWysiwyg() {
  if (!htmlWysiwyg) return;
  htmlWysiwyg.unmount();
  htmlWysiwyg = null;
  setHtmlToolbarVisible(false);
  const btn = document.getElementById('htmlVisualBtn');
  if (btn) { btn.classList.remove('active'); btn.setAttribute('aria-pressed', 'false'); }
  const editorEl = document.getElementById('editor');
  if (editorEl) editorEl.style.display = '';
}

// Current HTML value if the visual editor is active, else null (for unsaved-work + download).
export function getHtmlWysiwygValue() {
  return htmlWysiwyg ? htmlWysiwyg.getValue() : null;
}

// ── CSV / TSV table editor ──────────────────────────────────────────────────────
let tableEditor = null;

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

export function wireTableModeBtn() {
  const btn = document.getElementById('tableModeBtn');
  if (!btn || btn.dataset.wired) return;
  btn.dataset.wired = '1';
  btn.addEventListener('click', () => {
    const isOn = btn.classList.contains('active');
    setTableMode(!isOn);
  });
}

// Tear down the table editor when rebuilding the raw view (e.g. file changed). Idempotent.
export function teardownTableEditor() {
  if (!tableEditor) return;
  tableEditor.destroy();
  tableEditor = null;
  const host = document.getElementById('tableEditorHost');
  if (host) host.hidden = true;
  const editorEl = document.getElementById('editor');
  if (editorEl) editorEl.style.display = '';
}

// Current CSV value if the table editor is active, else null (for unsaved-work + download).
export function getTableEditorValue() {
  return tableEditor ? tableEditor.getValue() : null;
}
