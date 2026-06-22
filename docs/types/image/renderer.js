// Image preview. Raster images render in the PARENT pane from a blob: URL (efficient, no base64
// inflation) with fit-to-screen + zoom controls — zoom changes the real pixel size, not a CSS
// transform, so it stays crisp. SVG is text that can carry scripts, so it is DOMPurify-sanitized
// (SVG profile) and shown inside the sandboxed iframe.
import { loadGlobal, vendor } from '../../core/script-loader.js';
import { loadTemplate, fill } from '../../core/template.js';
import { isSvg, mimeFor, dimensions } from './imglib.js';
import { recordStage3AsciiActivation } from '../../games/metagame/viewer-actions.js';
import { hexToRgba, floodFill } from './fill.js';
import { createEditCore } from './editor-core.js';
import { mountFilters } from './edit-filters.js';
import { mountTextTool } from './edit-text.js';
import { mountGeometry } from './edit-geometry.js';
import { mountBg } from './edit-bg.js';
import { registerUndoKeys } from './edit-undo-key.js';
import { mountTabs } from './edit-tabs.js';
import { mountSelection } from './edit-select.js';
import { mountAdvEdit } from './adv-edit.js';
import { mountGifPlayer } from './gif-anim.js';
import { decodeGifFrames } from './gif-decode.js';

// Toolbar markup lives in sibling .html templates (real HTML, easy to extend).
// doc.html is the shell (fit/zoom/ascii bar + stage + ascii-out) with an
// {{editTools}} slot; edit-tools.html is the full editing toolbar, inlined only
// for canvas-encodable formats.
const DOC_TPL = new URL('./doc.html', import.meta.url);
const EDIT_TOOLS_TPL = new URL('./edit-tools.html', import.meta.url);
// Every raster format the browser can decode into a <canvas> is editable — the
// editor pipeline re-encodes via canvas.toBlob (PNG/JPEG/WebP/AVIF, falling back
// to PNG for non-encodable sources like BMP/GIF), so the source format doesn't
// matter as long as it decodes. AVIF belongs here for parity with PNG/JPEG/WebP.
const EDITABLE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/bmp', 'image/gif']);

export async function render(intake, ctx = {}) {
  if (isSvg(intake)) {
    const DOMPurify = await loadGlobal(vendor('dompurify/purify.min.js'), 'DOMPurify');
    DOMPurify.removed = [];
    const clean = DOMPurify.sanitize(intake.text || '', { USE_PROFILES: { svg: true, svgFilters: true } });
    return { bodyHtml: '<div class="img-doc">' + clean + '</div>', hadUnsafe: DOMPurify.removed.length > 0 };
  }

  // Animated GIF: the static raster path only shows the first frame. Decode up
  // front; if it's truly multi-frame, hand the pane to the GIF player (play/pause +
  // scrubber + opt-in Split-into-frames). Single-frame GIFs fall through to the
  // normal editable raster path. The decoder + vendored gifuct bundle load only
  // here, only for a .gif — other images pay nothing on first paint.
  if (mimeFor(intake) === 'image/gif') {
    try {
      const decoded = await decodeGifFrames(intake.bytes);
      if (decoded.frames.length > 1) {
        const gifHost = document.createElement('div');
        gifHost.className = 'imgv-doc';
        const player = mountGifPlayer({ host: gifHost, bytes: intake.bytes, openBlob: window.__fv?.openBlobFile?.bind(window.__fv) });
        return { parentNode: gifHost, revoke: () => player.destroy() };
      }
    } catch { /* fall through to the static raster path */ }
  }

  // Raster: parent pane + blob URL + fit/zoom controls + ASCII toggle.
  const mime = mimeFor(intake);
  const url = URL.createObjectURL(new Blob([intake.bytes], { type: mime }));
  const canEdit = EDITABLE_MIME.has(mime);
  const host = document.createElement('div');
  host.className = 'imgv-doc';
  const [docTpl, editToolsTpl] = await Promise.all([
    loadTemplate(DOC_TPL),
    canEdit ? loadTemplate(EDIT_TOOLS_TPL) : Promise.resolve(''),
  ]);
  host.innerHTML = fill(docTpl, { filename: intake.filename, editTools: editToolsTpl });

  const img = host.querySelector('.imgv-img');
  const note = host.querySelector('.imgv-note');
  const zoomLabel = host.querySelector('.imgv-zoom');
  const asciiBtn = host.querySelector('.imgv-ascii-btn');
  const asciiOut = host.querySelector('.imgv-ascii-out');
  const editInput = host.querySelector('.imgv-text-input');
  const editSize = host.querySelector('.imgv-text-size');
  const editColor = host.querySelector('.imgv-text-color');
  const editApply = host.querySelector('.imgv-text-apply');
  const editReset = host.querySelector('.imgv-text-reset');
  const pencilBtn = canEdit ? host.querySelector('.imgv-pencil') : null;
  const eraserBtn = canEdit ? host.querySelector('.imgv-eraser') : null;
  const fillBtn = canEdit ? host.querySelector('.imgv-fill') : null;
  const fillTol = canEdit ? host.querySelector('.imgv-fill-tol') : null;
  const fillTolV = canEdit ? host.querySelector('.imgv-fill-tolv') : null;
  const fillMode = canEdit ? host.querySelector('.imgv-fill-mode') : null;
  const fillPercep = canEdit ? host.querySelector('.imgv-fill-percep') : null;
  const fillFeather = canEdit ? host.querySelector('.imgv-fill-feather') : null;
  const fillOpts = canEdit ? host.querySelectorAll('.imgv-fill-opt') : [];
  const selectBtn = canEdit ? host.querySelector('.imgv-select') : null;
  const deselectBtn = canEdit ? host.querySelector('.imgv-deselect') : null;
  const drawColorPicker = canEdit ? host.querySelector('.imgv-draw-color') : null;
  const drawSizePicker = canEdit ? host.querySelector('.imgv-draw-size') : null;
  const undoBtn = canEdit ? host.querySelector('.imgv-undo') : null;
  const redoBtn = canEdit ? host.querySelector('.imgv-redo') : null;
  const exportFmt = canEdit ? host.querySelector('.imgv-export-fmt') : null;
  const editFont = canEdit ? host.querySelector('.imgv-text-font') : null;
  const bgBtn = canEdit ? host.querySelector('.imgv-bg-btn') : null;
  const bgTol = canEdit ? host.querySelector('.imgv-bg-tol') : null;
  const bgOk = canEdit ? host.querySelector('.imgv-bg-ok') : null;
  const bgX = canEdit ? host.querySelector('.imgv-bg-x') : null;
  const cropBtn = canEdit ? host.querySelector('.imgv-crop-btn') : null;
  const cropApplyBtn = canEdit ? host.querySelector('.imgv-crop-apply') : null;
  const cropCancelBtn = canEdit ? host.querySelector('.imgv-crop-cancel') : null;
  const resizeBtn = canEdit ? host.querySelector('.imgv-resize-btn') : null;
  const resizePanel = canEdit ? host.querySelector('.imgv-resize-panel') : null;
  const resizeW = canEdit ? host.querySelector('.imgv-resize-w') : null;
  const resizeH = canEdit ? host.querySelector('.imgv-resize-h') : null;
  const resizeLock = canEdit ? host.querySelector('.imgv-resize-lock') : null;
  const resizeApplyBtn = canEdit ? host.querySelector('.imgv-resize-apply') : null;
  const resizeCancelBtn = canEdit ? host.querySelector('.imgv-resize-cancel') : null;
  const expandBtn = canEdit ? host.querySelector('.imgv-expand-btn') : null;
  const expandPanel = canEdit ? host.querySelector('.imgv-expand-panel') : null;
  const expandPad = canEdit ? host.querySelector('.imgv-expand-pad') : null;
  const expandTransparent = canEdit ? host.querySelector('.imgv-expand-transparent') : null;
  const expandColor = canEdit ? host.querySelector('.imgv-expand-color') : null;
  const expandApplyBtn = canEdit ? host.querySelector('.imgv-expand-apply') : null;
  const expandCancelBtn = canEdit ? host.querySelector('.imgv-expand-cancel') : null;
  const rotLBtn = canEdit ? host.querySelector('.imgv-rot-l') : null;
  const rotRBtn = canEdit ? host.querySelector('.imgv-rot-r') : null;
  const flipHBtn = canEdit ? host.querySelector('.imgv-flip-h') : null;
  const flipVBtn = canEdit ? host.querySelector('.imgv-flip-v') : null;
  const filtersBtn = canEdit ? host.querySelector('.imgv-filters-btn') : null;
  const filtersPanel = canEdit ? host.querySelector('.imgv-filters-panel') : null;
  const fBrightness = canEdit ? host.querySelector('.imgv-f-brightness') : null;
  const fContrast = canEdit ? host.querySelector('.imgv-f-contrast') : null;
  const fSaturation = canEdit ? host.querySelector('.imgv-f-saturation') : null;
  const fHue = canEdit ? host.querySelector('.imgv-f-hue') : null;
  const fApplyBtn = canEdit ? host.querySelector('.imgv-f-apply') : null;
  const fResetBtn = canEdit ? host.querySelector('.imgv-f-reset') : null;
  let natural = 0, fit = true, zoom = 1, asciiMode = false;
  let jxlPngBytes = null;   // decoded PNG bytes for JXL (display + ASCII source)
  // Pencil/eraser/fill state stays here (the draw overlay is coupled to the
  // pan/zoom view); text/crop/BG state lives in their respective tool modules.
  let drawMode = null, isEraserStroke = false;
  let drawOverlay = null, drawOCtx = null, isPointerDown = false, lastPt = null, brushCursor = null;

  // Adv Edit (vector overlay) state. Declared up here so the onBinaryEdit wrapper
  // and applyPan() (both defined below but run after these are initialised) can see
  // it without tripping the temporal-dead-zone.
  let advController = null, advActive = false;
  const overlayActive = () => !!(advController && !advController.isEmpty());
  // Magic-wand selection controller (mounted below; declared here so apply()/syncOverlay,
  // which run during initial load, can reference it without a temporal-dead-zone error).
  let selection = null;

  // Shared edit state + commit pipeline — undo/redo, blob commits, the
  // onBinaryEdit hook, and full reset all live in editor-core so every tool
  // shares one consistent edit history. The view (fit/zoom/pan, ASCII, JXL)
  // stays here in the renderer shell.
  //
  // The vector overlay is PERSISTENT + non-destructive: the raster base and the
  // overlay stay separately editable, and the doc is flattened (base+overlay) only
  // for OUTPUT. So we wrap the host's onBinaryEdit — when the overlay is non-empty
  // every getBytes returns the flattened composite; otherwise the raster payload
  // passes through untouched.
  const hostOnBinaryEdit = ctx.onBinaryEdit;
  let lastRasterEdit = null;
  function emitBinaryEdit() {
    if (!hostOnBinaryEdit) return;
    if (overlayActive()) {
      hostOnBinaryEdit({
        dirty: true,
        mimeType: core.getExportMime(),
        getBytes: async () => {
          const canvas = advController.flattenToCanvas();
          const mt = core.getExportMime();
          const blob = await new Promise((r) => canvas.toBlob(r, mt, mt === 'image/jpeg' ? 0.92 : undefined));
          return new Uint8Array(await blob.arrayBuffer());
        },
      });
    } else {
      hostOnBinaryEdit(lastRasterEdit);
    }
  }
  const core = createEditCore({
    img, url, mime,
    ctx: { ...ctx, onBinaryEdit: (payload) => { lastRasterEdit = payload; emitBinaryEdit(); } },
    els: { editReset, exportFmt, undoBtn, redoBtn, dirtyIndicator: host.querySelector('.imgv-dirty-indicator') },
  });

  // The editing tools (text, filters, geometry, background-removal) are mounted
  // from sibling modules; they share this `els` bag of toolbar controls plus the
  // edit core. (All null when !canEdit — the modules are null-safe.)
  const els = {
    editInput, editSize, editColor, editFont, editApply, editReset,
    filtersBtn, filtersPanel, fBrightness, fContrast, fSaturation, fHue, fApplyBtn, fResetBtn,
    bgBtn, bgTol, bgOk, bgX, exportFmt,
    rotLBtn, rotRBtn, flipHBtn, flipVBtn,
    cropBtn, cropApplyBtn, cropCancelBtn,
    resizeBtn, resizePanel, resizeW, resizeH, resizeLock, resizeApplyBtn, resizeCancelBtn,
    expandBtn, expandPanel, expandPad, expandTransparent, expandColor, expandApplyBtn, expandCancelBtn,
  };
  // Group the editing controls into tabs (Common / Draw / Text / Adjust / Size /
  // Background) so the toolbar isn't a wall of buttons; non-active tabs hint once.
  if (canEdit) mountTabs(host);

  // Interactive tools (text placement, crop, BG pick) register here so the pan
  // logic stands down while a tool owns the pointer; each exposes isActive().
  const editTools = [];

  // Pan offset (px), applied as a transform so the WHOLE canvas can be dragged
  // freely — even when the image is smaller than the stage. The draw overlay gets
  // the same transform so brush coordinates stay aligned.
  let panX = 0, panY = 0;
  function applyPan() {
    // Always keep a 3D transform so the <img> stays on a stable compositing layer.
    // Some mobile WebViews don't repaint a transformed <img> when only its src
    // changes (e.g. after a fill) unless the layer is stable + nudged — see
    // nudgeRepaint() below. translate3d also GPU-accelerates the pan.
    const t = `translate3d(${panX}px, ${panY}px, 0)`;
    img.style.transform = t;
    if (drawOverlay) drawOverlay.style.transform = t;
    advController?.relayout();   // keep the persistent vector overlay registered to the image
  }
  // Force a recomposite after an edit swaps img.src (mobile stale-paint guard).
  function nudgeRepaint() {
    requestAnimationFrame(() => { void img.offsetWidth; img.style.transform = `translate3d(${panX}px, ${panY}px, 0.001px)`; requestAnimationFrame(applyPan); });
  }
  img.addEventListener('load', nudgeRepaint);
  function apply() {
    host.querySelector('.imgv-fit').classList.toggle('active', fit);
    if (fit || !natural) { img.style.width = ''; img.style.maxWidth = ''; img.style.maxHeight = ''; zoomLabel.textContent = 'fit'; }
    else { img.style.maxWidth = 'none'; img.style.maxHeight = 'none'; img.style.width = Math.round(natural * zoom) + 'px'; zoomLabel.textContent = Math.round(zoom * 100) + '%'; }
    if (typeof syncOverlay === 'function') syncOverlay();
    applyPan();
  }
  function resetView() { panX = 0; panY = 0; }
  // View hook handed to geometry tools so a dimension-changing edit (rotate/resize)
  // can update the stored natural width + relayout.
  const view = { setNatural: (n) => { natural = n; apply(); selection?.clear(); } };   // a resize/crop/rotate invalidates the pixel selection
  host.querySelector('.imgv-fit').addEventListener('click', () => { fit = true; resetView(); apply(); });
  host.querySelector('.imgv-100').addEventListener('click', () => { fit = false; zoom = 1; resetView(); apply(); });
  host.querySelector('.imgv-up').addEventListener('click', () => { fit = false; zoom = Math.min(16, zoom * 1.25); apply(); });
  host.querySelector('.imgv-dn').addEventListener('click', () => { fit = false; zoom = Math.max(0.1, zoom / 1.25); apply(); });

  // ── Pan & wheel-zoom ── click-drag moves the whole canvas; wheel zooms toward
  // the cursor. Left-drag pans only when no edit mode owns the pointer; middle
  // drag pans even mid-draw (reposition while doing detail work).
  const stageEl = host.querySelector('.imgv-stage');
  stageEl.style.overflow = 'hidden';
  const editModeActive = () => drawMode || editTools.some((t) => t.isActive && t.isActive());
  let dragLastX = 0, dragLastY = 0;
  const onPanMove = (e) => {
    panX += e.clientX - dragLastX; panY += e.clientY - dragLastY;
    dragLastX = e.clientX; dragLastY = e.clientY;
    applyPan();
  };
  const onPanUp = () => {
    stageEl.style.cursor = '';
    window.removeEventListener('mousemove', onPanMove);
    window.removeEventListener('mouseup', onPanUp);
  };
  stageEl.addEventListener('mousedown', (e) => {
    if (e.button === 0 && (e.ctrlKey || e.metaKey)) { e.preventDefault(); startCtrlZoom(e); return; }
    const leftPan = e.button === 0 && !editModeActive();
    const midPan = e.button === 1;
    if (!leftPan && !midPan) return;
    dragLastX = e.clientX; dragLastY = e.clientY;
    stageEl.style.cursor = 'grabbing';
    e.preventDefault();
    window.addEventListener('mousemove', onPanMove);
    window.addEventListener('mouseup', onPanUp);
  });
  // Zoom by `factor`, keeping the image point under (clientX,clientY) fixed. The
  // anchor defaults to the stage centre (used by the +/- keys). Shared by wheel,
  // Ctrl+drag and the keyboard shortcuts.
  function zoomAt(factor, clientX, clientY) {
    const r = stageEl.getBoundingClientRect();
    const prev = fit ? (img.offsetWidth / (natural || img.offsetWidth)) : zoom;
    fit = false;
    zoom = Math.max(0.1, Math.min(16, prev * factor));
    const k = zoom / prev;
    const cx = clientX == null ? r.left + r.width / 2 : clientX;
    const cy = clientY == null ? r.top + r.height / 2 : clientY;
    const relX = (cx - r.left) - (r.width / 2 + panX);
    const relY = (cy - r.top) - (r.height / 2 + panY);
    panX += relX * (1 - k); panY += relY * (1 - k);
    apply();
  }
  // Wheel zoom works even mid-edit (never conflicts with the brush).
  stageEl.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY);
  }, { passive: false });
  // Ctrl/Cmd + drag = scrubby zoom: drag up to zoom in, down to zoom out, anchored
  // at the press point.
  function startCtrlZoom(e) {
    const ax = e.clientX, ay = e.clientY; let lastY = e.clientY;
    stageEl.style.cursor = 'ns-resize';
    const move = (ev) => { const dy = lastY - ev.clientY; lastY = ev.clientY; if (dy) zoomAt(Math.exp(dy * 0.006), ax, ay); };
    const up = () => { stageEl.style.cursor = ''; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  }
  // Ctrl/Cmd with +/- (or =) zooms toward the stage centre.
  function onZoomKey(e) {
    if (asciiMode || !host.isConnected || !(e.ctrlKey || e.metaKey)) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomAt(1.25); }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomAt(1 / 1.25); }
  }
  document.addEventListener('keydown', onZoomKey);

  const isJxl = ((intake.filename || '').split('.').pop()?.toLowerCase() === 'jxl') || mime === 'image/jxl';
  img.addEventListener('error', () => {
    if (isJxl) return; // jxl is decoded in JS below, never via img.src
  });
  if (isJxl) {
    // Browsers can't decode JPEG XL — decode it in JS (lazy, heavy wasm) into a
    // canvas → PNG blob and show that. The original .jxl `url` stays the download.
    img.hidden = true;
    note.hidden = false; note.textContent = 'Decoding JPEG XL…';
    (async () => {
      try {
        const { decodeJxl } = await import('./jxl-decode.js');
        const id = await decodeJxl(intake.bytes);
        const c = document.createElement('canvas'); c.width = id.width; c.height = id.height;
        c.getContext('2d').putImageData(id, 0, 0);
        const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
        jxlPngBytes = new Uint8Array(await blob.arrayBuffer());
        note.hidden = true; img.hidden = false;
        natural = c.width; img.src = URL.createObjectURL(blob); apply();
      } catch (e) {
        note.hidden = false; img.hidden = true;
        note.textContent = 'JPEG XL could not be decoded here: ' + (e.message || e) + '. Download still works.';
      }
    })();
  } else {
    img.src = url;
    apply();
    dimensions(url).then((d) => { if (d) { natural = d.w; apply(); } });
  }

  // ASCII art — the button toggles the self-contained ASCII Studio, lazy-mounted
  // into the ASCII pane. All conversion UI + logic lives under ./ascii/ so this
  // renderer stays thin.
  let asciiStudio = null;
  async function toggleAscii() {
    // Entering ASCII: stop Adv interaction but KEEP the overlay (non-destructive). The
    // ASCII source is a flattened COPY (base+overlay) computed below — the overlay
    // survives and is still editable when you return to the image.
    if (!asciiMode && advActive) leaveAdv();
    asciiMode = !asciiMode;
    asciiBtn.textContent = asciiMode ? 'Image' : 'ASCII';
    asciiBtn.classList.toggle('active', asciiMode);
    // In ASCII mode the studio owns everything; hide the image-editor toolbar
    // (only the ASCII toggle stays, as "back to image").
    host.querySelector('.imgv-bar').classList.toggle('imgv-ascii-on', asciiMode);
    host.querySelector('.imgv-stage').hidden = asciiMode;
    asciiOut.hidden = !asciiMode;
    if (asciiMode) {
      // Feed the CURRENT image — including any edits (crop, rotate, BG removal,
      // filters…) — not the untouched original. With a live vector overlay, flatten a
      // COPY (base+overlay) so ASCII sees the composite; otherwise editedBlob holds the
      // latest raster edit. JXL can't be decoded by createImageBitmap, so feed the PNG.
      let curBytes, curMime;
      if (overlayActive()) {
        const mt = core.getExportMime();
        const canvas = advController.flattenToCanvas();
        const blob = await new Promise((r) => canvas.toBlob(r, mt, mt === 'image/jpeg' ? 0.92 : undefined));
        curBytes = new Uint8Array(await blob.arrayBuffer()); curMime = mt;
      } else {
        const eb = core.editedBlob;
        curBytes = eb ? new Uint8Array(await eb.arrayBuffer()) : (jxlPngBytes || intake.bytes);
        curMime = eb ? (eb.type || mime) : (jxlPngBytes ? 'image/png' : mime);
      }
      try {
        if (!asciiStudio) {
          asciiBtn.disabled = true;
          asciiOut.style.padding = '0';
          const { mountAsciiStudio } = await import('./ascii/studio.js');
          asciiStudio = mountAsciiStudio(asciiOut, {
            bytes: curBytes, mime: curMime, filename: intake.filename,
            onActivate: () => recordStage3AsciiActivation({ file: intake.filename }),
            onBack: toggleAscii,   // 🖼 Image button in the studio toolbar returns here
          });
          asciiBtn.disabled = false;
        } else {
          asciiStudio.setImage({ bytes: curBytes, mime: curMime });
          recordStage3AsciiActivation({ file: intake.filename });
        }
      } catch (e) {
        asciiOut.textContent = 'ASCII studio failed to load: ' + (e.message || e);
        asciiBtn.disabled = false;
      }
      // 30s-idle boot-screen easter egg (unchanged).
      import('./ascii-screensaver.js').then(({ installScreensaver }) => {
        // Don't let the idle screensaver overlay the live camera (the feed has no
        // pointer/key activity to reset the idle timer, so it would always fire).
        if (!host._ss) host._ss = installScreensaver(host, () => asciiMode && !asciiStudio?.isCameraActive?.());
        host._ss.start();
      });
    } else {
      host._ss?.stop();
      asciiStudio?.stopCamera?.();   // leaving ASCII view → release the webcam
      advController?.relayout();      // the stage was hidden with .imgv-stage — re-register it to the image
    }
  }

  asciiBtn.addEventListener('click', toggleAscii);

  // Editing toolbar is a lot of buttons; on phones collapse it behind a 🛠 toggle
  // (like the top bar's overflow) so it doesn't clutter. Expanded by default on
  // wide screens. The button classes are unchanged, so all wiring still resolves.
  const toolsBtn = canEdit ? host.querySelector('.imgv-tools-btn') : null;
  if (toolsBtn) {
    const bar = host.querySelector('.imgv-bar');
    toolsBtn.hidden = false;                      // editable image → reveal the Edit toggle
    bar.classList.add('imgv-tools-collapsed');    // open in plain VIEW mode; Edit reveals the toolbar
    toolsBtn.classList.remove('active');
    toolsBtn.addEventListener('click', () => {
      const open = !bar.classList.toggle('imgv-tools-collapsed');
      toolsBtn.classList.toggle('active', open);
      // Edit (pixel) and Adv (vector) are mutually exclusive INTERACTIVE modes; the
      // overlay stays mounted + visible, just non-interactive, while you edit pixels.
      if (open && advActive) leaveAdv();
    });
  }

  // ── Adv Edit (vector) mode ── lazy-loads Konva (adv-edit.js) and overlays the
  // image with re-editable text/vector objects. The overlay is PERSISTENT and
  // non-destructive: leaving Adv just makes it non-interactive (it stays mounted +
  // visible across View/Edit); it's flattened onto the base only for OUTPUT
  // (emitBinaryEdit/ASCII) or before a base-resizing geometry op
  // (bakeOverlayForGeometry). See ADV_EDIT.md.
  const advBtn = canEdit ? host.querySelector('.imgv-adv-btn') : null;
  if (advBtn) {
    advBtn.hidden = false;
    advBtn.addEventListener('click', async () => {
      if (advActive) { leaveAdv(); return; }   // leave = non-interactive, overlay STAYS
      // Enter Adv: leave the pixel Edit toolbar (mutually exclusive modes).
      host.querySelector('.imgv-bar').classList.add('imgv-tools-collapsed');
      toolsBtn?.classList.remove('active');
      advBtn.disabled = true;
      try {
        if (!advController) {
          advController = await mountAdvEdit({ host, img, pushUndo: core.pushUndo, onDirty: () => { host.querySelector('.imgv-dirty-indicator')?.removeAttribute('hidden'); emitBinaryEdit(); } });
          // Fold the overlay into editor-core's history → one unified Ctrl+Z spanning
          // pixel + vector. Each entry now also carries the overlay JSON snapshot.
          core.setOverlayHooks({ snapshot: () => advController.serialize(), restore: (j) => advController.restore(j) });
        }
        advActive = true;
        advController.setInteractive(true);
        // Re-align the (empty) stage to the current base — picks up any geometry done
        // while the overlay was away. Only safe with no objects (it resets the frame).
        if (advController.isEmpty()) advController.rebaseline();
        advBtn.classList.add('active');
        if (advController.objectCount() === 0) advController.addText();   // start with one editable label
      } catch (e) { advBtn.title = 'Advanced editing failed: ' + (e.message || e); }
      advBtn.disabled = false;
    });
  }
  function leaveAdv() { advActive = false; advController?.setInteractive(false); advBtn?.classList.remove('active'); }
  // Flatten the overlay into the pixel base, then clear it — used before a base-resizing
  // geometry op (crop/resize/rotate/flip/expand) so the op acts on a single aligned
  // raster and the overlay never drifts out of registration with content it can't follow.
  async function bakeOverlayForGeometry() {
    if (!overlayActive()) return;
    const canvas = advController.flattenToCanvas();
    core.pushUndo();
    await core.commitCanvas(canvas);
    advController.clear();
  }

  // Text overlay — drag a label onto the image, then bake it in (edit-text.js).
  const textTool = mountTextTool({ host, img, mime, core, els });
  editTools.push(textTool);
  editReset?.addEventListener('click', () => {
    textTool.exitPlaceMode();
    if (advActive) leaveAdv();
    advController?.clear();   // Reset clears the vector overlay too (ADV_EDIT.md)
    core.reset();             // …and core.reset() has the final say on dirty/onBinaryEdit
  });

  // Geometry — rotate / flip / crop / resize (edit-geometry.js). Crop registers
  // in editTools so panning stands down during a crop drag.
  const geometryTool = mountGeometry({ host, img, url, mime, core, view, els, onBeforeGeometry: bakeOverlayForGeometry });
  editTools.push(geometryTool);

  // Magic-wand selection — click a region to build a pixel mask; while it's active
  // the pixel tools (fill/pencil/eraser) only "take" inside the selection. Reuses the
  // shared fill tolerance/mode/perceptual options (edit-select.js → fill.js).
  selection = mountSelection({
    host, img, mime,
    els: { selectBtn, deselectBtn },
    getFillOpts: () => ({ tol: parseInt(fillTol?.value || '12', 10), mode: fillMode?.value || 'seed', perceptual: !!fillPercep?.checked }),
    onActivate: () => setDrawMode(null),   // the wand is mutually exclusive with pencil/eraser/fill input
  });
  editTools.push({ isActive: () => selection.isActive() });

  // Filters — live CSS preview + bake on Apply (edit-filters.js).
  mountFilters({ img, mime, core, els });

  // Compare — original vs current (edited): split / overlay / diff. The view is a
  // self-contained lazy module so this renderer stays thin. Original always uses
  // the pristine `url`; current uses the latest edit.
  const compareBtn = canEdit ? host.querySelector('.imgv-compare') : null;
  let compareView = null;
  function exitCompare() {
    if (!compareView) return;
    compareView.destroy(); compareView = null;
    img.style.display = '';
    if (drawOverlay) drawOverlay.style.display = '';
    host.querySelector('.imgv-bar').classList.remove('imgv-compare-on');
    compareBtn?.classList.remove('active');
    apply();   // restore layout/pan so the image is interactive again
  }
  compareBtn?.addEventListener('click', async () => {
    if (compareView) { exitCompare(); return; }
    const stage = host.querySelector('.imgv-stage');
    img.style.display = 'none';
    if (drawOverlay) drawOverlay.style.display = 'none';
    // Hide the edit toolbar while comparing — those tools don't apply here; the
    // compare overlay has its own Close button.
    host.querySelector('.imgv-bar').classList.add('imgv-compare-on');
    compareBtn.classList.add('active');
    const { mountCompare } = await import('./compare-view.js');
    compareView = mountCompare(stage, { originalUrl: url, currentUrl: core.editedUrl || url, onClose: exitCompare });
  });

  // Pencil / eraser drawing tools
  // Position the overlay canvas to exactly cover the displayed <img> box (NOT
  // the whole stage), so brush coordinates map 1:1 to image pixels regardless of
  // fit/zoom/scroll letterboxing.
  function syncOverlay() {
    selection?.syncOverlay();   // the selection overlay exists independently of the draw overlay
    if (!drawOverlay) return;
    drawOverlay.style.left = img.offsetLeft + 'px';
    drawOverlay.style.top = img.offsetTop + 'px';
    drawOverlay.style.width = img.offsetWidth + 'px';
    drawOverlay.style.height = img.offsetHeight + 'px';
  }

  function buildOverlay() {
    const stage = host.querySelector('.imgv-stage');
    stage.style.position = 'relative';
    drawOverlay = document.createElement('canvas');
    drawOverlay.style.cssText = 'position:absolute;pointer-events:none;touch-action:none;z-index:2;';
    stage.appendChild(drawOverlay);
    drawOCtx = drawOverlay.getContext('2d');
    // Brush hover preview — a circle that tracks the cursor so you see the brush
    // position + size before painting.
    brushCursor = document.createElement('div');
    brushCursor.className = 'imgv-brush-cursor';
    brushCursor.style.cssText = 'position:absolute;border:1px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.6);border-radius:50%;pointer-events:none;transform:translate(-50%,-50%);z-index:3;display:none;mix-blend-mode:difference;';
    stage.appendChild(brushCursor);
    img.addEventListener('load', () => {
      if (drawOverlay && !isEraserStroke) { drawOverlay.width = img.naturalWidth || 1; drawOverlay.height = img.naturalHeight || 1; }
      syncOverlay(); applyPan();
    });
    if (img.naturalWidth) { drawOverlay.width = img.naturalWidth; drawOverlay.height = img.naturalHeight; }
    syncOverlay(); applyPan(); // adopt the current pan so the draw area sits on the image
    drawOverlay.addEventListener('mousedown', onPDown);
    drawOverlay.addEventListener('mousemove', onPMove);
    drawOverlay.addEventListener('mouseup', onPUp);
    drawOverlay.addEventListener('mouseleave', () => { hideBrushCursor(); if (isPointerDown) { isPointerDown = false; commitDraw(); } });
    drawOverlay.addEventListener('touchstart', onPDown, { passive: false });
    drawOverlay.addEventListener('touchmove', onPMove, { passive: false });
    drawOverlay.addEventListener('touchend', onPUp);
  }

  // Move/size the brush hover circle (screen px = the brush-size value, which is
  // constant on screen regardless of zoom). Only shown for pencil/eraser.
  function moveBrushCursor(e) {
    if (!brushCursor || (drawMode !== 'pencil' && drawMode !== 'eraser')) { hideBrushCursor(); return; }
    const stageR = host.querySelector('.imgv-stage').getBoundingClientRect();
    const d = parseInt(drawSizePicker?.value || '8', 10);
    brushCursor.style.width = d + 'px';
    brushCursor.style.height = d + 'px';
    brushCursor.style.left = (e.clientX - stageR.left) + 'px';
    brushCursor.style.top = (e.clientY - stageR.top) + 'px';
    brushCursor.style.display = 'block';
  }
  function hideBrushCursor() { if (brushCursor) brushCursor.style.display = 'none'; }

  function setDrawMode(mode) {
    drawMode = drawMode === mode ? null : mode;
    if (drawMode) selection?.setActive(false);   // a draw mode turns off the wand's input (the mask itself persists)
    pencilBtn?.classList.toggle('active', drawMode === 'pencil');
    eraserBtn?.classList.toggle('active', drawMode === 'eraser');
    fillBtn?.classList.toggle('active', drawMode === 'fill');
    // Fill-tuning controls are shared by the bucket AND the wand — show for either.
    fillOpts.forEach((el) => { el.hidden = !(drawMode === 'fill' || selection?.isActive()); });
    if (!drawOverlay && drawMode) buildOverlay();
    if (drawOverlay) {
      drawOverlay.style.pointerEvents = drawMode ? 'auto' : 'none';
      drawOverlay.style.cursor = drawMode === 'eraser' ? 'cell'
        : drawMode === 'fill' ? 'crosshair'
        : drawMode === 'pencil' ? 'none' : ''; // pencil hidden — the hover circle is the cursor
    }
    if (drawMode !== 'pencil' && drawMode !== 'eraser') hideBrushCursor();
    img.style.pointerEvents = drawMode ? 'none' : '';
  }

  function ptToCanvas(e) {
    const r = drawOverlay.getBoundingClientRect();
    const sx = drawOverlay.width / r.width, sy = drawOverlay.height / r.height;
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - r.left) * sx, y: (src.clientY - r.top) * sy };
  }

  function getCanvasBrushSize() {
    const displayPx = parseInt(drawSizePicker?.value || '8', 10);
    if (!drawOverlay) return displayPx;
    const r = drawOverlay.getBoundingClientRect();
    const scale = r.width > 0 ? drawOverlay.width / r.width : 1;
    return Math.max(1, Math.round(displayPx * scale));
  }

  function applyStrokeStyle(sz) {
    drawOCtx.globalCompositeOperation = isEraserStroke ? 'destination-out' : 'source-over';
    drawOCtx.strokeStyle = drawColorPicker?.value || '#ff0000';
    drawOCtx.fillStyle = drawColorPicker?.value || '#ff0000';
    drawOCtx.lineWidth = sz; drawOCtx.lineCap = 'round'; drawOCtx.lineJoin = 'round';
  }

  async function onPDown(e) {
    if (!drawMode || !drawOverlay) return;
    e.preventDefault();
    if (drawMode === 'fill') { await doFill(e); return; }
    isPointerDown = true;
    isEraserStroke = drawMode === 'eraser';
    core.pushUndo();
    if (isEraserStroke) {
      // preload overlay from the already-loaded <img> (no extra fetch) so
      // destination-out punches real pixels.
      drawOverlay.width = img.naturalWidth; drawOverlay.height = img.naturalHeight;
      if (mime === 'image/jpeg') { drawOCtx.fillStyle = '#fff'; drawOCtx.fillRect(0, 0, drawOverlay.width, drawOverlay.height); }
      drawOCtx.drawImage(img, 0, 0);
    } else if (!drawOverlay.width || !img.naturalWidth) {
      drawOverlay.width = img.naturalWidth || 1; drawOverlay.height = img.naturalHeight || 1;
    }
    if (!isEraserStroke && img.naturalWidth && drawOverlay.width !== img.naturalWidth) {
      drawOverlay.width = img.naturalWidth;
      drawOverlay.height = img.naturalHeight;
    }
    lastPt = ptToCanvas(e);
    const sz = getCanvasBrushSize();
    applyStrokeStyle(sz);
    drawOCtx.beginPath(); drawOCtx.arc(lastPt.x, lastPt.y, sz / 2, 0, Math.PI * 2); drawOCtx.fill();
  }

  function onPMove(e) {
    moveBrushCursor(e);
    if (!isPointerDown || !drawOCtx) return;
    e.preventDefault();
    const pt = ptToCanvas(e);
    const sz = getCanvasBrushSize();
    applyStrokeStyle(sz);
    drawOCtx.beginPath(); drawOCtx.moveTo(lastPt.x, lastPt.y); drawOCtx.lineTo(pt.x, pt.y); drawOCtx.stroke();
    lastPt = pt;
  }

  // Flood-fill bucket — the pure pixel walk lives in ./fill.js (floodFill);
  // doFill wires it to the canvas + edit-commit pipeline.
  async function doFill(e) {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true });
    if (mime === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
    g.drawImage(img, 0, 0);
    const id = g.getImageData(0, 0, c.width, c.height);
    const pt = ptToCanvas(e);
    // If a selection is active, snapshot first so the fill can be clipped to it.
    const before = selection?.hasSelection() ? Uint8ClampedArray.from(id.data) : null;
    const filled = floodFill(id.data, c.width, c.height, Math.round(pt.x), Math.round(pt.y),
      hexToRgba(drawColorPicker?.value), parseInt(fillTol?.value || '0', 10),
      { mode: fillMode?.value || 'seed', perceptual: !!fillPercep?.checked, feather: !!fillFeather?.checked });
    if (!filled) return;
    if (before) selection.clipFillInPlace(id.data, before);   // constrain the fill to the selection
    g.putImageData(id, 0, 0);
    const targetMime = core.getExportMime();
    core.pushUndo();
    const blob = await new Promise((r) => c.toBlob(r, targetMime, targetMime === 'image/jpeg' ? 0.92 : undefined));
    core.commitBlob(blob, { mime: targetMime });
  }

  async function commitDraw() {
    if (!drawOverlay || !drawOverlay.width) return;
    const targetMime = core.getExportMime();
    let blob;
    if (isEraserStroke) {
      // The eraser overlay is a copy of the image with holes punched. Clip it to the
      // selection (restore image pixels outside the mask) so erasing stays inside it.
      await selection?.clipCanvas(drawOverlay, img);
      blob = await new Promise((r) => drawOverlay.toBlob(r, targetMime, targetMime === 'image/jpeg' ? 0.92 : undefined));
    } else {
      // Composite from the already-loaded <img> (the current committed image) —
      // NOT a fresh fetch of editedUrl. Avoids a second blob-URL request per stroke.
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const g = c.getContext('2d');
      if (mime === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
      g.drawImage(img, 0, 0); g.drawImage(drawOverlay, 0, 0);
      await selection?.clipCanvas(c, img);   // constrain the brush stroke to the selection
      blob = await new Promise((r) => c.toBlob(r, targetMime, targetMime === 'image/jpeg' ? 0.92 : undefined));
    }
    drawOCtx.clearRect(0, 0, drawOverlay.width, drawOverlay.height);
    core.commitBlob(blob, { mime: targetMime });
  }

  async function onPUp(e) { if (isPointerDown) { isPointerDown = false; await commitDraw(); } }

  if (pencilBtn) {
    pencilBtn.addEventListener('click', () => setDrawMode('pencil'));
    eraserBtn.addEventListener('click', () => setDrawMode('eraser'));
    fillBtn?.addEventListener('click', () => setDrawMode('fill'));
    fillTol?.addEventListener('input', () => { if (fillTolV) fillTolV.textContent = fillTol.value; });
    undoBtn?.addEventListener('click', core.doUndo);
    redoBtn?.addEventListener('click', core.doRedo);
  }

  // Ctrl/Cmd+Z = undo, Ctrl+Y or Ctrl/Cmd+Shift+Z = redo. A shared global router
  // (edit-undo-key.js) routes the shortcut to this editor while it's the active
  // one and not in ASCII mode — including when focus is on a slider/colour/number
  // control inside the toolbar. Text fields keep their native undo.
  const unregisterUndoKeys = canEdit
    ? registerUndoKeys({ host, isEnabled: () => !asciiMode, doUndo: core.doUndo, doRedo: core.doRedo })
    : null;

  // Background removal — sample a colour, flood to transparent, commit as PNG
  // (edit-bg.js). Registers in editTools so panning stands down while picking.
  const bgTool = mountBg({ img, url, core, els });
  editTools.push(bgTool);

  // Transparency display: show transparent pixels as a checkerboard (the editor
  // convention) instead of the plain page background. Purely a view toggle.
  const bgChecker = canEdit ? host.querySelector('.imgv-bg-checker') : null;
  bgChecker?.addEventListener('change', () => img.classList.toggle('imgv-checker', bgChecker.checked));

  return { parentNode: host, revoke: () => { advController?.destroy(); selection?.teardown(); unregisterUndoKeys?.(); document.removeEventListener('keydown', onZoomKey); compareView?.destroy?.(); asciiStudio?.destroy?.(); URL.revokeObjectURL(url); core.revoke(); bgTool.teardown(); host._ss?.stop(); } };
}
