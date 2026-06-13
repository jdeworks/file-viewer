// Core shell orchestrator (WP02): intake -> detect -> load type module -> lay out
// raw (Monaco) + preview (sandboxed iframe) per capability and viewport.
// Settings here are intentionally minimal; WP03 replaces buildSettings() with the
// full descriptor-driven system. The contract this file consumes is frozen.

import { REGISTRY, getType } from './registry.js';
import { pickType } from './detect.js';
import { wireIntake, intakeFromFile, LARGE_FILE_BYTES } from './intake.js';
import { buildTree, renderTree } from './filetree.js';
import { createRawView } from './rawview.js';
import { mountPreview } from './iframe.js';
import { buildModel, monacoOptions, renderSettings } from './settings.js';

const $ = (id) => document.getElementById(id);
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

// Return to the intake screen to pick another file/folder (keeps any loaded tree).
function showIntake() {
  $('intake').hidden = false;
  $('workspace').hidden = true;
}

/* ─────────────────────────── Folder tree (sidebar) ─────────────────────────── */

async function loadFolder(entries) {
  // Build + render the tree, reveal the sidebar, and open a sensible default file.
  const rootName = (entries[0]?.path.split('/')[0]) || 'Folder';
  $('ftRoot').textContent = rootName;
  $('ftRoot').title = rootName;
  const tree = buildTree(entries);
  state.treeApi = renderTree($('ftBody'), tree, { onOpen: (node) => openTreeFile(node) });
  $('treeBtn').hidden = false;
  setTree(true);

  // Prefer a README / index, else the first file.
  const pick = entries.find((e) => /(^|\/)(readme|index)\.\w+$/i.test(e.path)) || entries[0];
  if (pick) { await openTreeFile({ file: pick.file, path: pick.path }); state.treeApi.setActive(pick.path); }
}

async function openTreeFile(node) {
  try {
    await loadIntake(await intakeFromFile(node.file));
    if (isMobile()) setTree(false);   // collapse the overlay after picking on phones
  } catch (err) {
    toast('Could not open ' + node.path);
  }
}

function setTree(open) {
  $('fileTree').hidden = !open;
  if (isMobile()) $('scrim').hidden = !open;
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
  state.settingsModel = await buildModel(type);
  // Show workspace + relevant chrome.
  $('intake').hidden = true;
  $('workspace').hidden = false;
  $('fileId').hidden = false;
  $('fileName').textContent = state.intake.filename;
  $('settingsBtn').hidden = false;
  $('metaBtn').hidden = false;

  // Capabilities decide which surfaces exist. Some types are preview-only (PDF: no raw
  // editor), some raw-only (code), some both (markdown).
  const canRaw = type.capabilities.rawView;
  const canPreview = type.capabilities.preview;
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
  state.tab = both ? 'raw' : (canPreview && !canRaw ? 'preview' : 'raw');
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
  const text = state.intake.isBinary
    ? '[binary file — ' + state.intake.size + ' bytes — no text preview]'
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
  });
  syncRawModeButtons();
}

async function onRawEdited(value) {
  // Keep the working text in sync so download + preview reflect edits.
  state.intake = { ...state.intake, text: value };
  if (state.type?.capabilities.preview) await renderPreview();
}

function setRawMode(mode) {
  if (!state.rawview) return;
  state.rawMode = mode;
  state.rawview.setMode(mode);
  syncRawModeButtons();
  // Diff modes are themselves a comparison — give them the full width (desktop).
  if (state.type?.capabilities.preview) {
    const wantRaw = mode === 'diff' || mode === 'movediff';
    state.mode = wantRaw ? 'raw' : 'split';
    state.tab = 'raw';
    applyLayout();
  }
}

function syncRawModeButtons() {
  document.querySelectorAll('#rawMode button').forEach((b) => b.classList.toggle('active', b.dataset.raw === state.rawMode));
}

function downloadCurrent() {
  const blob = new Blob([state.rawview ? state.rawview.getValue() : (state.intake.text || '')], { type: state.intake.mimeType || 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = state.intake.filename || 'download.txt';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ─────────────────────────── Preview (iframe) ─────────────────────────── */

async function renderPreview() {
  const type = state.type;
  if (!type.loadRenderer) return clearPreview();
  let rendered;
  try {
    const mod = await type.loadRenderer();
    const ctx = { settings: state.settingsModel.values };
    if (type.id === 'html') ctx.allowScripts = state.htmlAllowScripts;
    rendered = await mod.render(state.intake, ctx);
  } catch (err) {
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
  state.preview = mountPreview($('previewHost'), {
    bodyHtml: rendered.bodyHtml,
    fullDoc: rendered.fullDoc,
    allowScripts: !!rendered.ranScripts,
    theme: themeIsDark() ? 'dark' : 'light',
    maxWidth: state.settingsModel.values.previewMaxWidth,
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
  const both = caps.rawView && caps.preview;
  // Forced view for single-surface types: preview-only -> preview, raw-only -> raw.
  const forced = caps.preview && !caps.rawView ? 'preview' : 'raw';
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
  state.rawview?.layout();
}

/* ─────────────────────────── Settings (WP03) ─────────────────────────── */

function openSettings() {
  renderSettings($('settingsBody'), state.settingsModel, { onChange: onSettingsChange, toast });
}

// Re-apply settings after any change. Editor options apply live; the preview only
// re-renders when a viewer setting that affects rendering changed (syncScroll reads live).
function onSettingsChange(model, changedKey) {
  state.rawview?.updateOptions(monacoOptions(model));
  if (!state.type?.capabilities.preview) return;
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
    dropZone: $('dropZone'), fileInput: $('fileInput'), folderInput: $('folderInput'),
    onIntake: loadIntake, onFolder: loadFolder, onError: (e) => toast('Could not read file: ' + e.message),
  });
  $('treeBtn').addEventListener('click', () => setTree($('fileTree').hidden));
  $('treeCloseBtn').addEventListener('click', () => setTree(false));
  $('openBtn').addEventListener('click', showIntake);
  $('formatBtn').addEventListener('click', () => state.rawview?.format());

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
  $('screenshotBtn').addEventListener('click', () => toast('Screenshot lands in WP18.'));

  document.querySelectorAll('#viewMode button').forEach((b) =>
    b.addEventListener('click', () => { state.mode = b.dataset.mode; applyLayout(); }));
  document.querySelectorAll('#tabbar button').forEach((b) =>
    b.addEventListener('click', () => { state.tab = b.dataset.mode; applyLayout(); }));
  document.querySelectorAll('#rawMode button').forEach((b) =>
    b.addEventListener('click', () => setRawMode(b.dataset.raw)));
  $('downloadBtn').addEventListener('click', downloadCurrent);

  // Viewport change must NOT rebuild the editor (would drop edits) — just relayout
  // and toggle which view controls apply (desktop split vs mobile tabs).
  window.matchMedia('(max-width: 760px)').addEventListener('change', () => {
    if (!state.type) return;
    const canPreview = state.type.capabilities.preview && !state.intake.isBinary;
    $('viewMode').hidden = !canPreview || isMobile();
    $('tabbar').style.display = canPreview && isMobile() ? 'flex' : 'none';
    applyLayout();
  });

  loadExamples();

  // Test seam (no data leaves the page; purely in-memory handles for the smoke suite).
  window.__fv = { state, setRawMode, downloadCurrent, loadFolder };
}

document.addEventListener('DOMContentLoaded', init);
