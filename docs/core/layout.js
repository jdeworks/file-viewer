// View layout: the responsive top-bar overflow (⋯ popover on phones), the Export/Download-as menu,
// the raw|split|preview mode switch, and the draggable split divider. Extracted from app.js. The
// core re-render (renderPreview) and the settings drawer (openSettings) are injected via initLayout
// so this module never imports app.js back (no circular dependency).
import { state, $, isMobile, toast } from './state.js';
import { hasExports, getExports } from './exports.js';
import { previewSizing, previewStyle } from './settings-schema.js';
import { syncModelPreset } from './settings.js';

let renderPreview = () => {};
let openSettings = () => {};
export function initLayout(deps) { renderPreview = deps.renderPreview; openSettings = deps.openSettings; }

/* ── Top bar (responsive overflow) ── */

// On phones, keep only the essentials in the top bar (tree, file name, open, fullscreen)
// and move the rest into the ⋯ popover. On desktop the controls return to their original
// spots (same DOM nodes, so their handlers + hidden-state logic keep working).
const OVERFLOW_IDS = ['typeSelect', 'rawMode', 'tableModeBtn', 'formatBtn', 'saveBtn', 'downloadBtn', 'screenshotBtn', 'sbsBtn', 'exportBtn', 'metaBtn', 'settingsBtn'];
let overflowAnchors = null;
export function layoutTopbar() {
  if (!overflowAnchors) {
    overflowAnchors = OVERFLOW_IDS.map((id) => { const el = $(id); return { el, parent: el.parentNode, next: el.nextSibling }; });
  }
  const menu = $('moreMenu');
  if (isMobile()) {
    for (const { el } of overflowAnchors) menu.appendChild(el);   // array order = menu order
    const anyVisible = overflowAnchors.some(({ el }) => !el.hidden);
    $('moreBtn').hidden = !anyVisible;
  } else {
    for (const { el, parent, next } of overflowAnchors) parent.insertBefore(el, next);
    $('moreBtn').hidden = true;
    closeMoreMenu();
  }
}
export function toggleMoreMenu() {
  const menu = $('moreMenu');
  const open = menu.hidden;
  menu.hidden = !open;
  $('moreBtn').setAttribute('aria-expanded', String(open));
}
export function closeMoreMenu() { $('moreMenu').hidden = true; $('moreBtn').setAttribute('aria-expanded', 'false'); }

// Export / Download-as menu — populated on open from core + per-type export actions.
export function updateExportButton() { $('exportBtn').hidden = !hasExports(state); }
export function closeExportMenu() { $('exportMenu').hidden = true; $('exportBtn').setAttribute('aria-expanded', 'false'); }
export async function toggleExportMenu() {
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

/* ── View modes: raw | split | preview + the draggable split divider ── */

export function applyLayout() {
  const caps = state.type.capabilities;
  // A matched known-file enhancement supplies a preview even if the base type has none.
  const hasPreview = caps.preview || (!!state.known && !state.forceBase);
  const both = caps.rawView && hasPreview;
  // Forced view for single-surface types: preview-only -> preview, raw-only -> raw.
  const forced = hasPreview && !caps.rawView ? 'preview' : 'raw';
  // The markdown WYSIWYG editor is the rendered+editable document, so it runs full-width with the
  // preview hidden — force 'raw' and hide the view-mode switcher regardless of the saved mode.
  const wysiwyg = !!state.wysiwygActive;
  const panes = $('panes');
  if (isMobile()) {
    panes.removeAttribute('data-mode');
    panes.setAttribute('data-tab', wysiwyg ? 'raw' : (both ? state.tab : forced));
  } else {
    panes.removeAttribute('data-tab');
    panes.setAttribute('data-mode', wysiwyg ? 'raw' : (both ? state.mode : forced));
  }
  const vm = $('viewMode'); if (vm) vm.hidden = wysiwyg || !both || isMobile();
  document.querySelectorAll('#viewMode button').forEach((b) => b.classList.toggle('active', b.dataset.mode === state.mode));
  document.querySelectorAll('#tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.mode === state.tab));
  applyPreviewPaneWidth();
  state.rawview?.layout();
}

// Desktop split: the preview pane width tracks the "Preview width (px)" setting, clamped
// so the editor keeps a usable minimum. The draggable divider writes back to that setting.
const MIN_EDITOR_PX = 380, DIVIDER_PX = 6;
export function applyPreviewPaneWidth() {
  const caps = state.type?.capabilities;
  const both = caps && caps.rawView && caps.preview;
  const splitActive = both && !isMobile() && state.mode === 'split' && !state.wysiwygActive;
  $('splitDivider').hidden = !splitActive;
  const previewPane = $('previewPane'), rawPane = $('rawPane');
  if (!splitActive) { previewPane.style.flex = ''; rawPane.style.flex = ''; return; }
  const total = $('panes').clientWidth || 0;
  const sizing = previewSizing(state.settingsModel?.values);
  const want = sizing.paneWidth || Math.round(total / 2);
  const maxPreview = Math.max(320, total - MIN_EDITOR_PX - DIVIDER_PX);
  const w = Math.max(320, Math.min(want, maxPreview));
  previewPane.style.flex = '0 0 ' + Math.round(w) + 'px';
  rawPane.style.flex = '1 1 auto';
}

export function initSplitDivider() {
  const divider = $('splitDivider'), panes = $('panes');
  const previewPane = $('previewPane'), rawPane = $('rawPane');
  let dragging = false;
  let activePointerId = null;
  let shieldedNodes = [];
  const shieldInteractiveSurfaces = () => {
    shieldedNodes = [...previewPane.querySelectorAll('iframe'), $('editor')].filter(Boolean).map((node) => ({
      node,
      pointerEvents: node.style.pointerEvents,
    }));
    for (const { node } of shieldedNodes) node.style.pointerEvents = 'none';
  };
  const restoreInteractiveSurfaces = () => {
    for (const { node, pointerEvents } of shieldedNodes) node.style.pointerEvents = pointerEvents;
    shieldedNodes = [];
  };
  const onMove = (e) => {
    if (!dragging) return;
    const rect = panes.getBoundingClientRect();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    let w = rect.right - x;                 // preview pane is on the right
    w = Math.max(320, Math.min(w, rect.width - MIN_EDITOR_PX - DIVIDER_PX));
    previewPane.style.flex = '0 0 ' + Math.round(w) + 'px';
    rawPane.style.flex = '1 1 auto';
    if (state.settingsModel) {
      state.settingsModel.values.previewWidthMode = 'custom';
      state.settingsModel.values.previewMaxWidth = Math.round(w);  // keep the setting live
    }
    state.rawview?.layout();
    e.preventDefault();
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    document.body.style.userSelect = '';
    restoreInteractiveSurfaces();
    window.removeEventListener('pointermove', onMove, true);
    window.removeEventListener('pointerup', onUp, true);
    window.removeEventListener('pointercancel', onUp, true);
    if (activePointerId != null) {
      try { divider.releasePointerCapture(activePointerId); } catch {}
      activePointerId = null;
    }
    // Width already tracked live in onMove; on release, re-render so the iframe content
    // width matches and refresh the settings UI if it's open.
    const m = state.settingsModel;
    if (m) {
      m.values.previewMaxWidth = Math.round(previewPane.getBoundingClientRect().width);
      m.values.previewWidthMode = 'custom';
      syncModelPreset(m);
      renderPreview();
      if (!$('settingsDrawer').hidden) openSettings();
    }
  };
  divider.addEventListener('pointerdown', (e) => {
    if (divider.hidden) return;
    dragging = true;
    activePointerId = e.pointerId;
    try { divider.setPointerCapture(e.pointerId); } catch {}
    shieldInteractiveSurfaces();
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', onUp, true);
    e.preventDefault();
  });
}
