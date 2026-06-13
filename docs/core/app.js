// Core shell orchestrator (WP02): intake -> detect -> load type module -> lay out
// raw (Monaco) + preview (sandboxed iframe) per capability and viewport.
// Settings here are intentionally minimal; WP03 replaces buildSettings() with the
// full descriptor-driven system. The contract this file consumes is frozen.

import { REGISTRY, getType } from './registry.js';
import { pickType } from './detect.js';
import { wireIntake, LARGE_FILE_BYTES } from './intake.js';
import { loadMonaco } from './monaco-loader.js';
import { mountPreview } from './iframe.js';

const $ = (id) => document.getElementById(id);
const state = {
  intake: null,
  type: null,
  settings: {},          // current setting values for the active type
  editor: null,
  monaco: null,
  preview: null,         // iframe controller
  mode: 'split',         // desktop view mode: raw | split | preview
  tab: 'raw',            // mobile active tab
  syncing: false,
  decorations: [],
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
  if (intake.size > LARGE_FILE_BYTES) {
    const mb = (intake.size / 1048576).toFixed(1);
    if (!confirm(`This file is ${mb} MB. Large files may be slow in the editor. Open anyway?`)) return;
  }
  state.intake = intake;
  const { type, ranking } = pickType(intake);
  populateTypeSelect(ranking, type.id);
  await activateType(type);
}

function populateTypeSelect(ranking, selectedId) {
  const sel = $('typeSelect');
  // Show all registered types; annotate the auto-detected ranking.
  const byScore = new Map(ranking.map((r) => [r.type.id, r.score]));
  sel.innerHTML = '';
  for (const t of REGISTRY) {
    const score = byScore.get(t.id) || 0;
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = score > 0 ? `${t.label} (${Math.round(score * 100)}%)` : t.label;
    if (t.id === selectedId) opt.selected = true;
    sel.appendChild(opt);
  }
}

async function activateType(type) {
  state.type = type;
  state.settings = await loadSettings(type);
  // Show workspace + relevant chrome.
  $('intake').hidden = true;
  $('workspace').hidden = false;
  $('fileId').hidden = false;
  $('fileName').textContent = state.intake.filename;
  $('settingsBtn').hidden = false;
  $('metaBtn').hidden = false;

  const canPreview = type.capabilities.preview && !state.intake.isBinary;
  $('viewMode').hidden = !canPreview || isMobile();
  $('tabbar').style.display = canPreview && isMobile() ? 'flex' : 'none';
  $('screenshotBtn').hidden = !(type.capabilities.screenshot && canPreview);
  state.mode = canPreview ? 'split' : 'raw';

  await renderRaw();
  if (canPreview) await renderPreview(); else clearPreview();
  applyLayout();
}

/* ─────────────────────────── Raw (Monaco) ─────────────────────────── */

async function renderRaw() {
  const monaco = state.monaco || (state.monaco = await loadMonaco());
  const lang = state.intake.isBinary ? 'plaintext' : (state.type.syntaxLanguage || 'plaintext');
  const value = state.intake.isBinary
    ? '[binary file — ' + state.intake.size + ' bytes — no text preview]'
    : (state.intake.text || '');

  if (!state.editor) {
    state.editor = monaco.editor.create($('editor'), {
      value, language: lang, automaticLayout: true,
      theme: themeIsDark() ? 'vs-dark' : 'vs',
      readOnly: state.intake.isBinary,
      ...monacoOptionsFromSettings(),
    });
    // raw -> preview magic selector + scroll sync
    state.editor.onDidChangeCursorPosition((e) => mapRawToPreview(e.position.lineNumber));
    state.editor.onDidScrollChange(() => syncScrollFromRaw());
    // live re-render preview on edit (WP08 seed)
    state.editor.onDidChangeModelContent(debounce(() => onRawEdited(), 250));
  } else {
    const model = state.editor.getModel();
    monaco.editor.setModelLanguage(model, lang);
    state.editor.updateOptions({ readOnly: state.intake.isBinary, ...monacoOptionsFromSettings() });
    if (model.getValue() !== value) model.setValue(value);
  }
}

function monacoOptionsFromSettings() {
  const s = state.settings;
  return {
    wordWrap: s.wordWrap ?? 'on',
    fontSize: s.fontSize ?? 14,
    minimap: { enabled: !!s.minimap },
    lineNumbers: s.lineNumbers ?? 'on',
  };
}

async function onRawEdited() {
  if (!state.type?.capabilities.preview) return;
  // Update the working text and re-render preview from the editor's current value.
  state.intake = { ...state.intake, text: state.editor.getValue() };
  await renderPreview();
}

/* ─────────────────────────── Preview (iframe) ─────────────────────────── */

async function renderPreview() {
  const type = state.type;
  if (!type.loadRenderer) return clearPreview();
  let rendered;
  try {
    const mod = await type.loadRenderer();
    rendered = await mod.render(state.intake, { settings: state.settings });
  } catch (err) {
    $('previewHost').innerHTML = '<p style="padding:16px;color:var(--danger)">Preview failed: ' + escapeHtml(err.message) + '</p>';
    return;
  }
  state.preview = mountPreview($('previewHost'), {
    bodyHtml: rendered.bodyHtml,
    theme: themeIsDark() ? 'dark' : 'light',
    onSelect: (src) => mapPreviewToRaw(src),
    onHover: (src) => mapPreviewToRaw(src, false),
    onScroll: (ratio) => syncScrollFromPreview(ratio),
  });
  if (rendered.hadUnsafe) toast('Some unsafe HTML (scripts/handlers) was removed for safety.');
}

function clearPreview() {
  state.preview?.destroy();
  state.preview = null;
  $('previewHost').innerHTML = '';
}

/* ─────────────────────────── Magic selector ─────────────────────────── */

// Preview element carries data-fv-src="startLine:endLine" (0-based, end-exclusive).
function mapPreviewToRaw(src, moveCursor = true) {
  if (!src || !state.editor || !state.monaco) return;
  const [a, b] = src.split(':').map(Number);
  const startLine = a + 1, endLine = Math.max(startLine, b);
  const monaco = state.monaco;
  state.decorations = state.editor.deltaDecorations(state.decorations, [{
    range: new monaco.Range(startLine, 1, endLine, 1),
    options: { isWholeLine: true, className: 'fv-line-hl', inlineClassName: 'fv-line-hl' },
  }]);
  if (moveCursor) state.editor.revealLineInCenter(startLine);
}

function mapRawToPreview(line) {
  if (!state.preview) return;
  // Find the nearest source block whose range covers this line (0-based).
  state.preview.highlight((line - 1) + ':' + line);
}

/* ─────────────────────────── Scroll sync (WP08 seed) ─────────────────────────── */

function syncScrollFromRaw() {
  if (state.syncing || !state.preview || !state.settings.syncScroll) return;
  const ed = state.editor;
  const top = ed.getScrollTop(), max = ed.getScrollHeight() - ed.getLayoutInfo().height;
  state.syncing = true;
  state.preview.scrollTo(max > 0 ? top / max : 0);
  requestAnimationFrame(() => (state.syncing = false));
}
function syncScrollFromPreview(ratio) {
  if (state.syncing || !state.editor || !state.settings.syncScroll) return;
  const ed = state.editor;
  const max = ed.getScrollHeight() - ed.getLayoutInfo().height;
  state.syncing = true;
  ed.setScrollTop(ratio * Math.max(0, max));
  requestAnimationFrame(() => (state.syncing = false));
}

/* ─────────────────────────── Layout / view modes ─────────────────────────── */

function applyLayout() {
  const panes = $('panes');
  if (isMobile()) {
    panes.removeAttribute('data-mode');
    panes.setAttribute('data-tab', state.type.capabilities.preview ? state.tab : 'raw');
  } else {
    panes.removeAttribute('data-tab');
    panes.setAttribute('data-mode', state.type.capabilities.preview ? state.mode : 'raw');
  }
  // reflect active buttons
  document.querySelectorAll('#viewMode button').forEach((b) => b.classList.toggle('active', b.dataset.mode === state.mode));
  document.querySelectorAll('#tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.mode === state.tab));
  state.editor?.layout();
}

/* ─────────────────────────── Settings (minimal; WP03 replaces) ─────────────────────────── */

async function loadSettings(type) {
  try {
    const res = await fetch(type.settingsUrl);
    const json = await res.json();
    const saved = JSON.parse(localStorage.getItem('fv:settings:' + type.id) || 'null');
    return { ...json.values, ...(saved?.values || {}) };
  } catch {
    return {};
  }
}

function buildSettings() {
  const body = $('settingsBody');
  const s = state.settings;
  const rows = [
    ['Word wrap', selectCtl('wordWrap', s.wordWrap, ['on', 'off'])],
    ['Font size', numCtl('fontSize', s.fontSize, 8, 40)],
    ['Line numbers', selectCtl('lineNumbers', s.lineNumbers, ['on', 'off', 'relative'])],
    ['Minimap', boolCtl('minimap', s.minimap)],
  ];
  if (state.type.capabilities.preview) rows.push(['Sync scroll', boolCtl('syncScroll', s.syncScroll)]);
  body.innerHTML = '';
  for (const [label, ctl] of rows) {
    const row = document.createElement('div'); row.className = 'set-row';
    const l = document.createElement('label'); l.textContent = label;
    row.append(l, ctl); body.appendChild(row);
  }
  const save = document.createElement('button');
  save.className = 'btn'; save.style.marginTop = '12px'; save.textContent = 'Save for this file type';
  save.onclick = () => { localStorage.setItem('fv:settings:' + state.type.id, JSON.stringify({ version: 1, values: state.settings })); toast('Saved'); };
  body.appendChild(save);
}
function applySetting(key, val) {
  state.settings[key] = val;
  state.editor?.updateOptions(monacoOptionsFromSettings());
  if (['previewMaxWidth', 'syncScroll'].includes(key) && state.type?.capabilities.preview) renderPreview();
}
function selectCtl(key, val, opts) {
  const el = document.createElement('select');
  for (const o of opts) { const op = document.createElement('option'); op.value = o; op.textContent = o; if (o === String(val)) op.selected = true; el.appendChild(op); }
  el.onchange = () => applySetting(key, el.value); return el;
}
function numCtl(key, val, min, max) {
  const el = document.createElement('input'); el.type = 'number'; el.min = min; el.max = max; el.value = val ?? 14;
  el.onchange = () => applySetting(key, Number(el.value)); return el;
}
function boolCtl(key, val) {
  const el = document.createElement('input'); el.type = 'checkbox'; el.checked = !!val;
  el.onchange = () => applySetting(key, el.checked); return el;
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
  if (state.type.loadMetadata && !i.isBinary) {
    try { const m = await state.type.loadMetadata(); for (const r of m.extract(i)) rows.push([r.label, r.value]); } catch {}
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
  state.monaco?.editor.setTheme(dark ? 'vs-dark' : 'vs');
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

async function loadExamples() {
  try {
    const res = await fetch('examples/index.json');
    if (!res.ok) return;
    const list = await res.json();
    const host = $('examples');
    for (const ex of list) {
      const b = document.createElement('button');
      b.textContent = ex.label || ex.file;
      b.onclick = async () => {
        const r = await fetch('examples/' + ex.file);
        const buf = new Uint8Array(await r.arrayBuffer());
        const { intakeFromFile } = await import('./intake.js');
        await loadIntake(await intakeFromFile(new File([buf], ex.file, { type: ex.mime || '' })));
      };
      host.appendChild(b);
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
    dropZone: $('dropZone'), fileInput: $('fileInput'),
    onIntake: loadIntake, onError: (e) => toast('Could not read file: ' + e.message),
  });

  $('typeSelect').addEventListener('change', (e) => { const t = getType(e.target.value); if (t) activateType(t); });
  $('themeBtn').addEventListener('click', () => applyTheme(!themeIsDark()));
  $('settingsBtn').addEventListener('click', () => openDrawer('settingsDrawer', buildSettings));
  $('metaBtn').addEventListener('click', () => openDrawer('metaDrawer', buildMetadata));
  $('scrim').addEventListener('click', closeDrawers);
  document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeDrawers));
  $('fullscreenBtn').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  });
  $('screenshotBtn').addEventListener('click', () => toast('Screenshot lands in WP18.'));

  document.querySelectorAll('#viewMode button').forEach((b) =>
    b.addEventListener('click', () => { state.mode = b.dataset.mode; applyLayout(); }));
  document.querySelectorAll('#tabbar button').forEach((b) =>
    b.addEventListener('click', () => { state.tab = b.dataset.mode; applyLayout(); }));

  window.matchMedia('(max-width: 760px)').addEventListener('change', () => { if (state.type) activateType(state.type); });

  loadExamples();
}

document.addEventListener('DOMContentLoaded', init);
