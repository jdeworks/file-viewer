// Side-by-side pane builder: turns one .sbs-pane into a self-contained mini-editor.
//
// Each pane owns its OWN state (its intake copy, its Monaco rawview, its blob URLs) and never
// touches the global `state` editor fields or the sibling pane — so two panes edit independently.
//
// Editable panes (type.capabilities.rawView && !isBinary) get a Source ⇆ Preview toggle backed by
// a dedicated createRawView() Monaco editor (lazy: created the first time Source is shown) plus a
// Download of the editor's current text. Preview-only panes (images/PDF/binary/audio/video) get
// just the rendered preview + a Download of the original bytes.
import { themeIsDark, escapeHtml } from './state.js';
import { pickType } from './detect.js';
import { matchKnown } from '../known/registry.generated.js';
import { mountPreview } from './iframe.js';
import { previewStyle } from './settings-schema.js';
import { createRawView } from './rawview.js';
import { buildPaneToolbar } from './sidebyside-toolbar.js';
import { createLatestRequestController } from './request-lifecycle.js';
import { sourceTextOf, withSourceText } from './intake.js';

async function previewCheckpoint(stage, request) {
  const hook = globalThis.__fvSideBySidePreviewTestHook;
  if (typeof hook !== 'function') return;
  await hook({
    stage,
    id: request.id,
    snapshot: request.snapshot,
    signal: request.signal,
    onCleanup: (cleanup) => request.registerCleanup(cleanup),
  });
}

// Render an intake's preview into an arbitrary host (standalone — does not touch global state).
// Returns a controller with destroy() that tears down whatever it mounted.
async function renderPreviewInto(host, intake, request) {
  const { type } = pickType(intake);
  const known = matchKnown(intake, type);
  const useKnown = known && known.loadRenderer;
  const canPrev = (type.capabilities.preview || useKnown)
    && !(intake.isBinary && !type.capabilities.preview && !useKnown);
  if (!canPrev || (!type.loadRenderer && !useKnown)) {
    if (!request.isCurrent()) return null;
    host.innerHTML = '<p class="sbs-note">No preview for this file type.</p>';
    return { destroy() { request.dispose('side-by-side preview removed'); host.innerHTML = ''; } };
  }
  try {
    await previewCheckpoint('request-started', request);
    if (!request.isCurrent()) return null;
    const mod = useKnown ? await known.loadRenderer() : await type.loadRenderer();
    if (!request.isCurrent()) return null;
    await previewCheckpoint('module-loaded', request);
    if (!request.isCurrent()) return null;
    const rendered = await mod.render(intake, {
      settings: {}, folder: null, signal: request.signal,
      onCleanup: (cleanup) => request.registerCleanup(cleanup),
    });
    if (rendered?.revoke) request.registerCleanup(rendered.revoke);
    if (rendered?.destroy && rendered.destroy !== rendered.revoke) request.registerCleanup(rendered.destroy);
    if (!request.isCurrent()) return null;
    await previewCheckpoint('before-commit', request);
    if (!request.isCurrent()) return null;
    if (rendered.parentNode) {
      host.innerHTML = '';
      host.appendChild(rendered.parentNode);
      return { destroy() { request.dispose('side-by-side preview removed'); host.innerHTML = ''; } };
    }
    const ctrl = mountPreview(host, {
      bodyHtml: rendered.bodyHtml, fullDoc: rendered.fullDoc, allowScripts: !!rendered.ranScripts,
      theme: request.snapshot.theme, style: previewStyle({}),
    });
    request.registerCleanup(() => ctrl.destroy());
    return { destroy() { request.dispose('side-by-side preview removed'); host.innerHTML = ''; } };
  } catch (e) {
    if (!request.isCurrent()) return null;
    host.innerHTML = '<p class="sbs-note">Preview failed: ' + escapeHtml(e.message) + '</p>';
    request.dispose('side-by-side render failed');
    return { destroy() { host.innerHTML = ''; } };
  }
}

function resolveLanguage(type, intake) {
  const sl = type.syntaxLanguage;
  return (typeof sl === 'function' ? sl(intake) : sl) || 'plaintext';
}

// Download `content` (string or Uint8Array) as `filename`, then revoke the blob URL.
function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime || 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'download.txt';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Build one pane into `paneEl` (.sbs-pane with .sbs-name + .sbs-host already present).
// Returns { ready, destroy(), rawview(), isEditable() }. rawview() exposes the Monaco controller
// (or null until the source view has been shown) so tests can type into it.
export function buildPane(paneEl, intake) {
  const nameEl = paneEl.querySelector('.sbs-name');
  const host = paneEl.querySelector('.sbs-host');
  const filename = intake.filename || intake.name || 'file';
  const { type } = pickType(intake);
  const editable = !!type.capabilities.rawView && !intake.isBinary;

  // Header control row: filename + (toggle for editable) + Download.
  nameEl.textContent = '';
  const title = document.createElement('span');
  title.className = 'sbs-fname';
  title.textContent = filename;
  title.title = filename;
  const controls = document.createElement('span');
  controls.className = 'sbs-ctrls';
  nameEl.append(title, controls);

  // Body hosts: a source host (Monaco) and a preview host. Only one shown at a time.
  const sourceHost = document.createElement('div');
  sourceHost.className = 'sbs-source';
  const previewHost = document.createElement('div');
  previewHost.className = 'sbs-preview';
  host.append(sourceHost, previewHost);

  let rawview = null;        // lazily created Monaco controller
  let previewCtrl = null;    // lazily created preview controller
  let previewText = null;    // text the preview was last rendered from
  let destroyed = false;
  const previewRequests = createLatestRequestController();
  let view = editable ? 'source' : 'preview';
  let toggleBtns = [];
  // Non-editable panes can't show a Monaco source; the shared Raw mode reveals this note instead.
  const sourceNote = document.createElement('p');
  sourceNote.className = 'sbs-note';
  sourceNote.textContent = 'No source view for this file type.';
  sourceNote.style.display = 'none';
  sourceHost.appendChild(sourceNote);

  async function ensureRawview() {
    if (rawview) return rawview;
    const text = sourceTextOf(intake);
    rawview = await createRawView(sourceHost, {
      originalText: text, currentText: text,
      language: resolveLanguage(type, intake),
      theme: themeIsDark() ? 'dark' : 'light',
      options: { readOnly: false },
    });
    return rawview;
  }

  async function ensurePreview() {
    // Re-render when first shown OR when the (editable) source text changed since last render.
    const text = rawview ? rawview.getValue() : sourceTextOf(intake);
    if (previewCtrl && previewText === text) return;
    const request = previewRequests.begin({ intake, text, theme: themeIsDark() ? 'dark' : 'light' });
    previewCtrl?.destroy();
    previewCtrl = null;
    previewHost.innerHTML = '';
    const src = (editable && rawview) ? withSourceText(intake, text) : intake;
    const next = await renderPreviewInto(previewHost, src, request);
    if (destroyed || !request.isCurrent() || !next) {
      next?.destroy();
      return;
    }
    previewCtrl = next;
    previewText = text;
  }

  async function show(next) {
    view = next;
    host.classList.toggle('sbs-split', next === 'split');
    const wantSource = next === 'source' || next === 'split';
    const wantPreview = next === 'preview' || next === 'split';
    sourceHost.style.display = wantSource ? '' : 'none';
    previewHost.style.display = wantPreview ? '' : 'none';
    if (wantSource && editable) {
      sourceNote.style.display = 'none';
      await ensureRawview(); rawview.layout();
    } else if (wantSource) {
      // Non-editable pane forced to Source by the shared Raw mode: show the note, no Monaco.
      sourceNote.style.display = '';
    }
    if (wantPreview) await ensurePreview();
    if (next === 'split' && rawview) rawview.layout();   // relayout after the split flex sizes it
    syncToggle();
  }

  function syncToggle() {
    toggleBtns.forEach((b) => {
      const on = b.dataset.sbsView === view;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }

  if (editable) {
    [['source', 'Source'], ['preview', 'Preview'], ['split', 'Split']].forEach(([v, label]) => {
      const btn = document.createElement('button');
      btn.className = 'sbs-toggle';
      btn.dataset.sbsView = v;
      btn.textContent = label;
      btn.addEventListener('click', () => show(v));
      controls.appendChild(btn);
      toggleBtns.push(btn);
    });
  }

  const dlBtn = document.createElement('button');
  dlBtn.className = 'sbs-dl';
  dlBtn.textContent = 'Download';
  dlBtn.title = 'Download this pane';
  dlBtn.addEventListener('click', () => {
    if (editable) {
      const text = rawview ? rawview.getValue() : sourceTextOf(intake);
      downloadBlob(text, filename, intake.mimeType || 'text/plain');
    } else if (intake.bytes) {
      downloadBlob(intake.bytes, filename, intake.mimeType || 'application/octet-stream');
    } else {
      downloadBlob(sourceTextOf(intake), filename, intake.mimeType || 'text/plain');
    }
  });
  controls.appendChild(dlBtn);

  // Editable panes get a per-pane formatting toolbar bound to THIS pane's rawview (markdown
  // helpers for markdown, text-utilities for other text/code). Inserted between the header row
  // and the body so it reads as a sub-toolbar of the pane.
  if (editable) {
    const tools = document.createElement('div');
    tools.className = 'sbs-tools';
    buildPaneToolbar(tools, type.id, ensureRawview);
    nameEl.insertAdjacentElement('afterend', tools);
  }

  // Show/hide the per-pane Source/Preview/Split toggle. The shared mode bar HIDES it when it
  // governs the view (Raw/Preview/Diff); Current mode SHOWS it so each pane drives itself.
  function setToggleVisible(on) {
    toggleBtns.forEach((b) => { b.style.display = on ? '' : 'none'; });
  }

  // Initial render: editable -> Source (Monaco, lazy preview); else -> Preview.
  const ready = show(view);

  return {
    ready,
    intake,
    isEditable: () => editable,
    rawview: () => rawview,
    // Force this pane to a specific view ('source' | 'preview'); used by the shared mode bar.
    setView: (v) => show(v),
    setToggleVisible,
    destroy() {
      destroyed = true;
      previewRequests.invalidate('side-by-side pane destroyed');
      rawview?.dispose();
      rawview = null;
      previewCtrl?.destroy();
      previewCtrl = null;
      host.innerHTML = '';
    },
  };
}
