// ASCII Studio — the self-contained UI mounted by the image viewer's ASCII
// button (and reused by the standalone tool page). Drives a shared engine and
// wires exports. Heavy work lives in the engine + core; this file builds DOM
// and binds. Layout: a big ASCII result that auto-fits its width (so changing
// the column count changes detail, not size), peekable original/processed
// previews behind eye toggles, and a collapsible control panel.

import { createAsciiEngine } from './engine.js';
import { buildControls, syncColorControls } from './studio-controls.js';
import { PERFORMANCE_PRESETS, defaultOptions } from './state.js';
import { downloadText, downloadHtml, downloadPng, copyText, copyHtml, ensureAsciiFont, fontFamily } from './render.js';
import { makeFloatingPanel } from './floating-panel.js';
import { loadLast, saveLast } from './presets.js';
import { wirePresetUi } from './preset-ui.js';

let styleInjected = false;
function injectStyle() {
  if (styleInjected) return;
  styleInjected = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./studio.css', import.meta.url).href;
  document.head.appendChild(link);
}

async function decode(bytes, mime) {
  const blob = new Blob([bytes], { type: mime || 'image/png' });
  try { return await createImageBitmap(blob); } catch { /* fall through */ }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    if (img.decode) await img.decode(); else await new Promise((r, j) => { img.onload = r; img.onerror = j; });
    return img;
  } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}

const BTN = (cls, label, title) => `<button class="asx-btn ${cls}" title="${title}">${label}</button>`;
const EYE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';

/**
 * Mount the studio into `host`.
 * @param {HTMLElement} host
 * @param {object} opts { bytes, mime, filename, source?, onActivate? }
 * @returns {{ destroy(): void, engine: object, setImage(): void }}
 */
export function mountAsciiStudio(host, opts = {}) {
  injectStyle();
  const baseName = (opts.filename || 'image').replace(/\.[^.]+$/, '') + '-ascii';
  host.classList.add('asx-root');
  host.innerHTML = `
    <div class="asx-bar">
      ${opts.onBack ? BTN('asx-back', '🖼 Image', 'Back to the image') : ''}
      ${BTN('asx-settings-btn', '⚙ Settings', 'Show / hide the settings panel')}
      ${BTN('asx-cam', '📷 Camera', 'Live webcam → ASCII (experimental)')}
      ${BTN('asx-convert', '🎞 Convert file', 'Convert a GIF or video file to ASCII')}
      <select class="asx-perf" title="Performance preset"><option value="">Quality preset…</option>
        <option value="fast">Fast</option><option value="balanced">Balanced</option><option value="quality">Quality</option></select>
      <select class="asx-preset" title="Load a saved settings preset"><option value="">Preset…</option></select>
      ${BTN('asx-preset-save', '💾', 'Save current settings as a preset')}
      ${BTN('asx-preset-del', '🗑', 'Delete the selected preset')}
      ${BTN('asx-copy', 'Copy text', 'Copy plain ASCII')}
      ${BTN('asx-copy-html', 'Copy HTML', 'Copy coloured HTML')}
      ${BTN('asx-dl-txt', '↓ TXT', 'Download .txt')}
      ${BTN('asx-dl-html', '↓ HTML', 'Download standalone .html')}
      ${BTN('asx-dl-png', '↓ PNG', 'Download .png')}
      ${BTN('asx-rot-l', '↺', 'Rotate 90° left')}
      ${BTN('asx-rot-r', '↻', 'Rotate 90° right')}
      ${BTN('asx-flip-h', '↔', 'Flip horizontal')}
      ${BTN('asx-flip-v', '↕', 'Flip vertical')}
      ${BTN('asx-reset-filters', 'Reset filters', 'Reset image filters')}
      ${BTN('asx-reset-all', 'Reset all', 'Reset every setting')}
    </div>
    <div class="asx-body">
      <div class="asx-stage">
        <div class="asx-eyes">
          <button class="asx-eye asx-eye-orig" title="Show original">${EYE}</button>
          <button class="asx-eye asx-eye-proc" title="Show processed">${EYE}</button>
        </div>
        <pre class="asx-out"></pre>
        <div class="asx-busy" hidden aria-live="polite">⏳ Converting…</div>
        <figure class="asx-peek" hidden><figcaption></figcaption><canvas></canvas></figure>
      </div>
      <div class="asx-panel"></div>
    </div>
    <div class="asx-cam-host" hidden></div>`;

  const q = (s) => host.querySelector(s);
  const pre = q('.asx-out');
  const stage = q('.asx-stage');
  const panel = q('.asx-panel');
  const peek = q('.asx-peek');
  const peekCanvas = peek.querySelector('canvas');
  const peekCaption = peek.querySelector('figcaption');

  const engine = createAsciiEngine(loadLast() || undefined);   // seed from last-used settings (persists + carries to webcam)
  // Busy badge for slow (phone) conversions: the convert is synchronous, so we can't keep
  // the UI live during it, but we surface that work is happening (and yield a frame so the
  // badge paints first). Gated on the last convert's duration so fast machines never flash it.
  const busyEl = q('.asx-busy');
  const setBusy = (on) => { if (busyEl) busyEl.hidden = !on; };
  // Show the badge, let it paint, then run the (blocking) convert.
  const reconvert = () => {
    if (engine.lastConvertMs > 80) { setBusy(true); requestAnimationFrame(() => engine.scheduleUpdate()); }
    else engine.scheduleUpdate();
  };
  const regrabBusy = () => {
    if (engine.lastConvertMs > 80) { setBusy(true); requestAnimationFrame(() => engine.regrab()); }
    else engine.regrab();
  };
  engine.onResult(() => { engine.renderToPre(pre); applyDisplay(); if (activeEye) paintPeek(); setBusy(false); });

  // ── fit-to-screen + display zoom ── the art is sized to fit the WHOLE stage
  // (both axes) at zoom 1, so changing columns/font/aspect/space-density/padding never
  // leaves a scrollbar — it just re-fits. Zoom is the ONLY control that scales past the
  // fit (magnifying for detail, where scrollbars are expected and fine).
  function applyDisplay() {
    const sd = engine.options.spaceDensity || 1;
    const r = engine.result;
    if (!r) return;
    // Frame padding shows as a coloured border around the art (matches the PNG/HTML
    // export's transparentFrame); also keep it out of the fit calculation.
    const pad = 8 + (engine.options.transparentFrame || 0);
    pre.style.padding = pad + 'px';
    const fam = fontFamily(engine.options);
    // Fit against the SCROLL CONTAINER (stage), not the <pre> — the pre's own width is
    // content-driven (white-space:pre) so it can't be the fit reference. -1: never round
    // UP into a scrollbar. Measure the REAL monospace advance (DejaVu ≈ 0.602, not 0.6).
    const adv = advanceRatio(fam);
    const availW = Math.max(40, stage.clientWidth - pad * 2 - 1);
    const availH = Math.max(40, stage.clientHeight - pad * 2 - 1);
    const fsW = availW / (r.columns * adv * sd);
    const fsH = availH / r.rows;          // line-height: 1 → each row is exactly one font-size tall
    const fit = Math.min(fsW, fsH);       // the zoom-1 "fit to screen" size — no H or V scrollbar
    const fs = fit * (engine.options.zoom || 1);
    pre.style.setProperty('--ascii-font-size', Math.max(2, fs).toFixed(2) + 'px');
    pre.style.fontFamily = fam;
    pre.style.letterSpacing = sd !== 1 ? ((sd - 1) * adv).toFixed(3) + 'em' : '';
  }
  // Advance width (em) of a monospace glyph in the given family — measured, not assumed.
  // Re-measured each call so it picks up the real font once it finishes loading.
  let advCtx = null;
  function advanceRatio(family) {
    if (!advCtx) advCtx = document.createElement('canvas').getContext('2d');
    advCtx.font = `100px ${family}`;
    return (advCtx.measureText('M').width || 60) / 100;
  }
  // Collapse decisions are based on the STUDIO's own width, not the viewport —
  // the file-viewer preview pane can be narrow while the window is wide, so a
  // viewport media query would miss it. ResizeObserver on the host is the
  // container-query stand-in.
  const NARROW_PX = 620;
  let isNarrow = null;
  function checkWidth() {
    const narrow = host.clientWidth > 0 && host.clientWidth < NARROW_PX;
    if (narrow === isNarrow) return;
    isNarrow = narrow;
    host.classList.toggle('asx-narrow', narrow);
    setSettingsOpen(!narrow);   // collapse when narrow, expand when there's room
  }
  const ro = new ResizeObserver(() => { applyDisplay(); checkWidth(); });
  ro.observe(host);

  // ── peekable original / processed previews (eye toggles) ──
  let activeEye = null; // 'orig' | 'proc' | null
  function paintPeek() {
    const src = activeEye === 'proc' ? engine.processedCanvas : engine.sourceCanvas;
    if (!src.width) return;
    const maxW = 260, scale = Math.min(1, maxW / src.width);
    peekCanvas.width = Math.round(src.width * scale);
    peekCanvas.height = Math.round(src.height * scale);
    peekCanvas.getContext('2d').drawImage(src, 0, 0, peekCanvas.width, peekCanvas.height);
    peekCaption.textContent = activeEye === 'proc' ? 'Processed' : 'Original';
  }
  function toggleEye(which) {
    activeEye = activeEye === which ? null : which;
    q('.asx-eye-orig').classList.toggle('active', activeEye === 'orig');
    q('.asx-eye-proc').classList.toggle('active', activeEye === 'proc');
    peek.hidden = !activeEye;
    if (activeEye) paintPeek();
  }
  q('.asx-eye-orig').addEventListener('click', () => toggleEye('orig'));
  q('.asx-eye-proc').addEventListener('click', () => toggleEye('proc'));

  // Settings panel is a toggleable drawer — open when there's room, collapsed when
  // narrow (where it overlays the stage instead of pushing it; see studio.css).
  if (opts.onBack) q('.asx-back')?.addEventListener('click', opts.onBack);
  const settingsBtn = q('.asx-settings-btn');
  function setSettingsOpen(open) {
    host.classList.toggle('asx-settings-open', open);
    settingsBtn.classList.toggle('active', open);
    applyDisplay();
  }
  settingsBtn.addEventListener('click', () => setSettingsOpen(!host.classList.contains('asx-settings-open')));
  checkWidth();   // set initial open/narrow state from the actual studio width

  const floatingPanel = makeFloatingPanel(panel, { title: 'ASCII settings', onClose: () => setSettingsOpen(false) });
  // Debounced persist of the current settings as "last used" (shared with webcam + across sessions).
  let saveTimer = 0;
  const rememberSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => saveLast({ ...engine.options }), 400); };
  const controls = buildControls(floatingPanel.body, engine.options, (key, value, dirty, displayOnly) => {
    engine.options[key] = value;
    // Background colour has no effect when the BG is transparent — disable it.
    if (key === 'transparentBackground' && controls?.inputs.backgroundColor) {
      controls.inputs.backgroundColor.disabled = !!value;
    }
    if (key === 'colorMode') syncColorControls(controls, value);   // colour off → hide source + glyph-colour
    rememberSoon();
    if (displayOnly) { applyDisplay(); return; }
    engine.markDirty(...dirty);
    reconvert();
  });
  controls.inputs.backgroundColor.disabled = !!engine.options.transparentBackground;
  syncColorControls(controls, engine.options.colorMode);   // initial state

  // ── toolbar wiring ──
  q('.asx-perf').addEventListener('change', (e) => {
    const preset = PERFORMANCE_PRESETS[e.target.value];
    if (!preset) return;
    Object.entries(preset).forEach(([k, v]) => controls.setValue(k, v));
  });
  // Named user presets (shared wiring with the webcam): select + Save + Delete.
  wirePresetUi({ sel: q('.asx-preset'), saveBtn: q('.asx-preset-save'), delBtn: q('.asx-preset-del'), controls, getOptions: () => ({ ...engine.options }) });
  // Convert a GIF/video file to ASCII (lazy module). Carries the studio's current
  // settings; "Add to studio" re-opens the result through the app's intake.
  q('.asx-convert').addEventListener('click', async () => {
    const { openConverter } = await import('./convert-file.js');
    openConverter({
      host, baseName, options: { ...engine.options },
      onAddToStudio: window.__fv?.openBlobFile ? (blob, name, mime) => window.__fv.openBlobFile(blob, name, { mime }) : null,
    });
  });
  q('.asx-copy').addEventListener('click', () => engine.result && copyText(engine.result.text));
  q('.asx-copy-html').addEventListener('click', () => engine.result && copyHtml(pre.innerHTML));
  q('.asx-dl-txt').addEventListener('click', () => engine.result && downloadText(baseName + '.txt', engine.result.text));
  q('.asx-dl-html').addEventListener('click', () => engine.result && downloadHtml(baseName + '.html', engine.result, engine.options));
  q('.asx-dl-png').addEventListener('click', async () => {
    if (!engine.result) return;
    await ensureAsciiFont();   // main-thread canvas needs the mono font for the block ramps
    const c = document.createElement('canvas');
    engine.renderToCanvas(c);
    downloadPng(baseName + '.png', c);
  });
  // Warm the font, then re-fit: the first <pre> lays out with a fallback (advance ≈0.6);
  // once DejaVu (≈0.602) swaps in it's slightly wider, so re-run the fit to avoid a scrollbar.
  ensureAsciiFont().then(() => applyDisplay());
  // Geometric transforms — re-draw the source then reconvert (works on image + video).
  q('.asx-rot-l').addEventListener('click', () => { engine.options.rotate = ((engine.options.rotate || 0) + 270) % 360; regrabBusy(); });
  q('.asx-rot-r').addEventListener('click', () => { engine.options.rotate = ((engine.options.rotate || 0) + 90) % 360; regrabBusy(); });
  q('.asx-flip-h').addEventListener('click', () => { engine.options.flipH = !engine.options.flipH; regrabBusy(); });
  q('.asx-flip-v').addEventListener('click', () => { engine.options.flipV = !engine.options.flipV; regrabBusy(); });
  q('.asx-reset-filters').addEventListener('click', () => resetKeys(FILTER_KEYS));
  q('.asx-reset-all').addEventListener('click', () => resetKeys(Object.keys(engine.options)));
  function resetKeys(keys) {
    const defs = defaultOptions();
    let transformReset = false;
    keys.forEach((k) => {
      if (!(k in defs)) return;
      // rotate/flip live on the toolbar, not in the control panel, so setValue
      // can't reach them — reset directly + regrab (Reset all must undo a rotate).
      if (k === 'rotate' || k === 'flipH' || k === 'flipV') { engine.options[k] = defs[k]; transformReset = true; }
      else controls.setValue(k, defs[k]);
    });
    if (transformReset) engine.regrab();
  }

  // ── webcam easter egg ── the 📷 button swaps in the live-camera consumer.
  const camHost = q('.asx-cam-host');
  const body = q('.asx-body');
  const bar = q('.asx-bar');
  let webcam = null;
  function closeCamera() {
    if (!webcam) return;
    webcam.destroy(); webcam = null;   // stops the MediaStream tracks
    camHost.hidden = true; body.hidden = false;
    bar.classList.remove('asx-cam-on');
    q('.asx-cam').textContent = '📷 Camera';
  }
  q('.asx-cam').addEventListener('click', async () => {
    if (webcam) { closeCamera(); return; }
    body.hidden = true; camHost.hidden = false;
    // Camera has its OWN toolbar (incl. its own transforms/exports that act on the
    // live frame) — hide the image-studio toolbar buttons so they don't clutter or
    // drive the wrong (image) engine. The 📷/back toggle stays visible.
    bar.classList.add('asx-cam-on');
    q('.asx-cam').textContent = '🖼 Back to image';
    const { mountAsciiWebcam } = await import('./webcam.js');
    // Inherit the current image-mode settings as the camera's starting point.
    // A finished recording stays in webcam mode so the user can download first,
    // then open that same .webm in the media/video studio. Standalone mode falls
    // back to auto-download because it has no blob-intake bridge.
    webcam = mountAsciiWebcam(camHost, {
      initialOptions: { ...engine.options },
      onRecorded: window.__fv?.openBlobFile
        ? (blob) => window.__fv.openBlobFile(blob, 'webcam-recording.webm', { mime: blob.type })
        : undefined,
    });
  });

  // Set (or replace) the source image and convert.
  async function setImage({ bytes, mime, source } = {}) {
    let src = source;
    if (!src && bytes) src = await decode(bytes, mime);
    if (!src) { pre.textContent = 'No image to convert.'; return; }
    engine.setSource(src);
    engine.update();
    if (activeEye) paintPeek();
    opts.onActivate?.();
  }
  if (opts.source || opts.bytes) setImage(opts);

  return {
    engine,
    setImage,
    isCameraActive: () => !!webcam,
    stopCamera: closeCamera,
    destroy() { ro.disconnect(); floatingPanel.destroy(); webcam?.destroy(); host.classList.remove('asx-root'); host.innerHTML = ''; },
  };
}

// FILTER_KEYS — what "Reset filters" restores (the image-processing knobs only).
const FILTER_KEYS = ['brightness', 'contrast', 'saturation', 'hue', 'grayscale', 'sepia',
  'invertColors', 'thresholdEnabled', 'threshold', 'sharpness', 'edgeDetection'];
