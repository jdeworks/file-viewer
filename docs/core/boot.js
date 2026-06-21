// Eager boot shell — the render-blocking module entry (loaded by index.html).
//
// The previous entry, app.js, statically imports the heavy known-registry bundle (~751 KB),
// registry-runtime + 9 detect chunks, and ~25 core modules. The browser had to download + parse
// ALL of that before the base screen became interactive. boot.js fixes that: it is tiny, does the
// minimal first-paint work (theme is already applied by the inline <head> script + critical CSS),
// wires a MINIMAL drag/drop + Open handler, then schedules the heavy `import('./app.js')` in the
// BACKGROUND (after first paint). If the user drops/opens a file BEFORE the full app is ready, we
// show a spinner, await the in-flight import, then forward the file to the real pipeline — the
// result is identical to a normal open, just slightly delayed.
//
// Coordination: boot owns the app-import promise. app.js runs its own init() on import and then
// calls window.__fvOnReady() to signal that the full pipeline (window.__fv) is live. boot's early
// handlers capture input only until then; once ready, the real intake wiring in app.js owns
// everything and boot's handlers no-op.

import { intakeFromFile, intakeFromText, entriesFromFileList } from './intake.js';

// ── Early-open queue ────────────────────────────────────────────────────────
// A file/folder/paste captured before app.js finished loading. At most one is held (the latest);
// it is forwarded the moment the app is ready.
let early = null;              // { kind: 'file'|'text'|'folder', payload }
let appReady = false;          // true once app.js init() has run and window.__fv exists
let appBridge = null;          // { openIntake, openFolder, onError } supplied by app.js when ready

// Resolves once the full app has finished init() — exposed so callers/tests can await readiness.
let resolveReady;
const readyPromise = new Promise((r) => { resolveReady = r; });
window.__fvReady = readyPromise;

// ── Spinner overlay (shown only on a cold open, while the heavy app loads) ───
function showBootSpinner() {
  if (document.getElementById('bootSpinner')) return;
  const el = document.createElement('div');
  el.id = 'bootSpinner';
  el.className = 'boot-spinner';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.innerHTML = '<div class="boot-spinner-ring" aria-hidden="true"></div><span class="boot-spinner-msg">Opening…</span>';
  document.body.appendChild(el);
}
function hideBootSpinner() {
  document.getElementById('bootSpinner')?.remove();
}

// ── Background load of the full app ──────────────────────────────────────────
let appLoadStarted = false;
function ensureApp() {
  if (appLoadStarted) return;
  appLoadStarted = true;
  import('./app.js')                       // app.js runs init() itself and calls __fvOnReady(bridge)
    .catch((err) => {
      hideBootSpinner();
      const intake = document.getElementById('intake');
      if (intake) {
        const msg = document.createElement('p');
        msg.style.cssText = 'color:var(--danger);text-align:center';
        msg.textContent = 'Failed to load the viewer. Please reload.';
        intake.querySelector('.dropzone')?.appendChild(msg);
      }
      console.error('boot: failed to load app.js', err);
    });
}

// ── Forward a captured early request once the app is ready ───────────────────
async function forwardEarly() {
  if (!early || !appBridge) { hideBootSpinner(); return; }
  const req = early; early = null;
  try {
    if (req.kind === 'file') await appBridge.openIntake(await intakeFromFile(req.payload));
    else if (req.kind === 'text') await appBridge.openIntake(intakeFromText(req.payload, 'pasted'));
    else if (req.kind === 'folder') await appBridge.openFolder(req.payload);
  } catch (err) {
    appBridge.onError?.(err);
  } finally {
    hideBootSpinner();
  }
}

// Capture an early request, show the spinner, and ensure the heavy app is loading.
function capture(req) {
  early = req;
  showBootSpinner();
  ensureApp();
}

// ── Minimal early intake wiring ──────────────────────────────────────────────
// Mirrors the affordances of intake.js (drop zone, file/folder pickers, whole-page drop, paste)
// but only enough to CAPTURE input. Once the app is ready it owns all of this; until then boot
// holds the request and forwards it. Each handler no-ops once appReady (the real wiring takes over).
function wireEarlyIntake() {
  const $ = (id) => document.getElementById(id);
  const dropZone = $('dropZone');
  const fileInput = $('fileInput');
  const folderInput = $('folderInput');
  const intakeScreen = $('intake');

  const taken = () => appReady;   // once the real app is wired, defer entirely to it

  fileInput?.addEventListener('change', (e) => {
    if (taken()) return;
    const file = e.target.files?.[0];
    if (file) capture({ kind: 'file', payload: file });
  });
  folderInput?.addEventListener('change', (e) => {
    if (taken()) return;
    const entries = entriesFromFileList(e.target.files || []);
    if (entries.length) capture({ kind: 'folder', payload: entries });
  });

  // Whole-page drop affordance (matches intake.js): only on the empty screen, only for file drags.
  const isFileDrag = (e) => {
    const types = e.dataTransfer?.types;
    if (!types) return false;
    if (types.includes('text/x-fv-tree-path')) return false;
    return types.includes('Files');
  };
  const onEmptyScreen = () => intakeScreen && !intakeScreen.hidden;
  const setDragging = (on) => document.body.classList.toggle('fv-dragging', on);

  window.addEventListener('dragenter', (e) => { if (!taken() && onEmptyScreen() && isFileDrag(e)) setDragging(true); });
  window.addEventListener('dragover', (e) => {
    if (taken()) return;
    e.preventDefault();
    if (onEmptyScreen() && isFileDrag(e)) setDragging(true);
  });
  window.addEventListener('dragleave', (e) => { if (!taken() && !e.relatedTarget) setDragging(false); });
  if (dropZone) {
    ['dragenter', 'dragover'].forEach((ev) =>
      dropZone.addEventListener(ev, (e) => { if (taken()) return; e.preventDefault(); dropZone.classList.add('drag-over'); }));
    ['dragleave', 'drop'].forEach((ev) =>
      dropZone.addEventListener(ev, (e) => {
        if (taken()) return;
        e.preventDefault();
        if (ev === 'dragleave' && e.target !== dropZone) return;
        dropZone.classList.remove('drag-over');
      }));
  }

  window.addEventListener('drop', (e) => {
    if (taken()) return;
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer?.types?.includes('text/x-fv-tree-path')) return;
    // A dropped DIRECTORY needs the async Entries-API walk that intake.js owns and the items list
    // is consumed after this event, so it can't be replayed later. Pre-ready folder drops are rare;
    // we open the first file if one is present, else just surface the spinner + load the app so the
    // user can re-drop. Picker-based folder open is fully captured above.
    const file = e.dataTransfer?.files?.[0];
    if (file) capture({ kind: 'file', payload: file });
    else { showBootSpinner(); ensureApp(); }
  });

  window.addEventListener('paste', (e) => {
    if (taken()) return;
    const item = [...(e.clipboardData?.items || [])].find((i) => i.kind === 'file');
    if (item) { const f = item.getAsFile(); if (f) capture({ kind: 'file', payload: f }); return; }
    const text = e.clipboardData?.getData('text');
    if (text && text.trim()) capture({ kind: 'text', payload: text });
  });
}

// Called by app.js once init() has completed (window.__fv is live), passing its open functions.
// This runs DURING app.js module evaluation — before import('./app.js').then resolves — so app.js
// hands us the bridge directly rather than us reading the module export. Drains any captured early
// request through the real pipeline, then resolves the ready promise.
window.__fvOnReady = async (bridge) => {
  appBridge = bridge || null;
  appReady = true;
  await forwardEarly();
  resolveReady();
};

// ── Boot sequence ────────────────────────────────────────────────────────────
function boot() {
  wireEarlyIntake();
  // Kick the heavy app load NOW. This is a dynamic import() — it does NOT block first paint or the
  // empty screen's interactivity (boot already wired drag/drop + Open + paste, and the critical CSS
  // is inlined). It simply downloads + parses the registry/detection/feature graph in parallel,
  // off the render-blocking critical path that the old `<script src=app.js>` entry sat on. Starting
  // it immediately (vs. deferring to idle) means the full app is ready as soon as possible while
  // the shell stays instantly usable.
  ensureApp();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
