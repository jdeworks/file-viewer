// Image preview. Raster images render in the PARENT pane from a blob: URL (efficient, no base64
// inflation) with fit-to-screen + zoom controls — zoom changes the real pixel size, not a CSS
// transform, so it stays crisp. SVG is text that can carry scripts, so it is DOMPurify-sanitized
// (SVG profile) and shown inside the sandboxed iframe.
import { loadGlobal, vendor } from '../../core/script-loader.js';
import { loadTemplate, fill } from '../../core/template.js';
import { isSvg, mimeFor, dimensions } from './imglib.js';
import { recordStage3AsciiActivation } from '../../games/metagame/viewer-actions.js';
import { hexToRgba, floodFill, bgFloodFill } from './fill.js';

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
  const fillEdge = canEdit ? host.querySelector('.imgv-fill-edge') : null;
  const fillOpts = canEdit ? host.querySelectorAll('.imgv-fill-opt') : [];
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
  let editedUrl = null, editedBlob = null;
  let jxlPngBytes = null;   // decoded PNG bytes for JXL (display + ASCII source)
  let drawMode = null, isEraserStroke = false;
  let textPlaceMode = false, textPlaceX = 0.5, textPlaceY = 0.5;
  let bgPickMode = false, bgSrcData = null, bgSrcW = 0, bgSrcH = 0, bgPickX = -1, bgPickY = -1, bgPreviewUrl = null;
  const undoStack = [];
  const redoStack = [];
  let drawOverlay = null, drawOCtx = null, isPointerDown = false, lastPt = null, brushCursor = null;
  // Crop state
  let cropMode = false, cropOverlay = null, cropSelBox = null;
  let cropStartX = 0, cropStartY = 0, cropEndX = 0, cropEndY = 0, cropDragging = false, cropHasRegion = false;

  // BMP and GIF: browsers don't support canvas.toBlob for these formats;
  // fall back to PNG when the source mime is not a canvas-encodable type.
  const CANVAS_ENCODABLE = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/avif']);
  function getExportMime() { const m = (exportFmt?.value) || mime; return CANVAS_ENCODABLE.has(m) ? m : 'image/png'; }

  function pushUndo() {
    undoStack.push({ blob: editedBlob || null, url: editedUrl || null });
    // A fresh edit forks history — discard any redo branch (and its blob URLs).
    redoStack.forEach((s) => { if (s.url) URL.revokeObjectURL(s.url); });
    redoStack.length = 0;
    if (undoBtn) undoBtn.hidden = false;
    if (redoBtn) redoBtn.hidden = true;
    host.querySelector('.imgv-dirty-indicator')?.removeAttribute('hidden');
  }

  // Apply a saved {blob,url} edit state to the canvas + binary-edit hook.
  function applyEditState(state) {
    editedBlob = state.blob; editedUrl = state.url;
    if (editedUrl) {
      img.src = editedUrl;
      ctx.onBinaryEdit?.({ dirty: true, mimeType: getExportMime(), getBytes: async () => new Uint8Array(await editedBlob.arrayBuffer()) });
    } else {
      img.src = url;
      if (editReset) editReset.hidden = true;
      ctx.onBinaryEdit?.(null);
    }
    if (undoBtn) undoBtn.hidden = undoStack.length === 0;
    if (redoBtn) redoBtn.hidden = redoStack.length === 0;
  }
  function doUndo() {
    const prev = undoStack.pop();
    if (!prev) return;
    redoStack.push({ blob: editedBlob || null, url: editedUrl || null });
    applyEditState(prev);
  }
  function doRedo() {
    const next = redoStack.pop();
    if (!next) return;
    undoStack.push({ blob: editedBlob || null, url: editedUrl || null });
    applyEditState(next);
  }

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
  host.querySelector('.imgv-fit').addEventListener('click', () => { fit = true; resetView(); apply(); });
  host.querySelector('.imgv-100').addEventListener('click', () => { fit = false; zoom = 1; resetView(); apply(); });
  host.querySelector('.imgv-up').addEventListener('click', () => { fit = false; zoom = Math.min(16, zoom * 1.25); apply(); });
  host.querySelector('.imgv-dn').addEventListener('click', () => { fit = false; zoom = Math.max(0.1, zoom / 1.25); apply(); });

  // ── Pan & wheel-zoom ── click-drag moves the whole canvas; wheel zooms toward
  // the cursor. Left-drag pans only when no edit mode owns the pointer; middle
  // drag pans even mid-draw (reposition while doing detail work).
  const stageEl = host.querySelector('.imgv-stage');
  stageEl.style.overflow = 'hidden';
  const editModeActive = () => drawMode || cropMode || bgPickMode || textPlaceMode;
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
      // filters…) — not the untouched original. editedBlob holds the latest edit.
      // JXL can't be decoded by createImageBitmap, so feed the decoded PNG bytes.
      const curBytes = editedBlob ? new Uint8Array(await editedBlob.arrayBuffer()) : (jxlPngBytes || intake.bytes);
      const curMime = editedBlob ? (editedBlob.type || mime) : (jxlPngBytes ? 'image/png' : mime);
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
    }
  }

  asciiBtn.addEventListener('click', toggleAscii);

  // Editing toolbar is a lot of buttons; on phones collapse it behind a 🛠 toggle
  // (like the top bar's overflow) so it doesn't clutter. Expanded by default on
  // wide screens. The button classes are unchanged, so all wiring still resolves.
  const toolsBtn = canEdit ? host.querySelector('.imgv-tools-btn') : null;
  if (toolsBtn) {
    const bar = host.querySelector('.imgv-bar');
    const collapsed = window.matchMedia('(max-width: 720px)').matches;
    bar.classList.toggle('imgv-tools-collapsed', collapsed);
    toolsBtn.classList.toggle('active', !collapsed);
    toolsBtn.addEventListener('click', () => {
      const open = !bar.classList.toggle('imgv-tools-collapsed');
      toolsBtn.classList.toggle('active', open);
    });
  }

  async function commitText(nx, ny) {
    const text = (editInput?.value || '').trim();
    if (!text) return;
    const base = new Image();
    base.decoding = 'async';
    base.src = editedUrl || url;
    await base.decode();
    const canvas = document.createElement('canvas');
    canvas.width = base.naturalWidth;
    canvas.height = base.naturalHeight;
    const g = canvas.getContext('2d');
    if (mime === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, canvas.width, canvas.height); }
    g.drawImage(base, 0, 0);
    const size = Math.max(8, Math.min(240, parseInt(editSize?.value, 10) || 32));
    const fontFamily = editFont?.value || 'system-ui,sans-serif';
    g.font = `700 ${size}px ${fontFamily}`;
    g.textBaseline = 'alphabetic';
    g.lineJoin = 'round';
    g.strokeStyle = 'rgba(0,0,0,.72)';
    g.lineWidth = Math.max(3, Math.round(size / 8));
    g.fillStyle = editColor?.value || '#ffffff';
    const px = Math.round((nx ?? 0.5) * canvas.width);
    const py = Math.round((ny ?? 0.5) * canvas.height);
    const maxW = Math.round(canvas.width * 0.8);
    g.strokeText(text, px, py, maxW);
    g.fillText(text, px, py, maxW);
    const targetMime = getExportMime();
    pushUndo();
    editedBlob = await new Promise((resolve) => canvas.toBlob(resolve, targetMime, targetMime === 'image/jpeg' ? 0.92 : undefined));
    if (!editedBlob) return;
    // Do NOT revoke editedUrl here — pushUndo() retained it as the undo target.
    editedUrl = URL.createObjectURL(editedBlob);
    img.src = editedUrl;
    editReset.hidden = false;
    ctx.onBinaryEdit?.({
      dirty: true,
      mimeType: targetMime,
      getBytes: async () => new Uint8Array(await editedBlob.arrayBuffer()),
    });
  }

  let textDragDiv = null, textCommitBtn = null, textCancelBtn = null;

  function exitTextPlaceMode() {
    textPlaceMode = false;
    if (textDragDiv) { textDragDiv.remove(); textDragDiv = null; }
    if (textCommitBtn) { textCommitBtn.remove(); textCommitBtn = null; }
    if (textCancelBtn) { textCancelBtn.remove(); textCancelBtn = null; }
    if (editApply) { editApply.textContent = 'Add text'; editApply.classList.remove('active'); }
  }

  function enterTextPlaceMode() {
    const text = (editInput?.value || '').trim();
    if (!text) { editInput?.focus(); return; }
    if (textPlaceMode) { exitTextPlaceMode(); return; }
    textPlaceMode = true;
    if (editApply) { editApply.textContent = 'Cancel'; editApply.classList.add('active'); }

    // Create draggable text overlay div
    const stage = host.querySelector('.imgv-stage');
    stage.style.position = 'relative';
    const fontSize = Math.max(8, Math.min(240, parseInt(editSize?.value, 10) || 32));
    const fontFamily = editFont?.value || 'system-ui,sans-serif';
    const color = editColor?.value || '#ffffff';

    textDragDiv = document.createElement('div');
    textDragDiv.textContent = text;
    textDragDiv.style.cssText = [
      'position:absolute',
      'z-index:10',
      'cursor:move',
      'user-select:none',
      `font-size:${fontSize}px`,
      `font-family:${fontFamily}`,
      `color:${color}`,
      'font-weight:700',
      'background:rgba(255,255,255,0.15)',
      'padding:2px 4px',
      'border-radius:3px',
      'white-space:nowrap',
      'touch-action:none',
    ].join(';');
    stage.appendChild(textDragDiv);
    // Position centered on the image (not the stage) so the text is immediately visible.
    requestAnimationFrame(() => {
      const stageR = stage.getBoundingClientRect();
      const imgR = img.getBoundingClientRect();
      const textR = textDragDiv.getBoundingClientRect();
      const cx = imgR.left - stageR.left + (imgR.width - textR.width) / 2;
      const cy = imgR.top - stageR.top + imgR.height / 3;
      textDragDiv.style.left = Math.max(0, cx) + 'px';
      textDragDiv.style.top = Math.max(0, cy) + 'px';
    });

    // Drag logic
    let dragOffX = 0, dragOffY = 0, dragging = false;
    textDragDiv.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      textDragDiv.setPointerCapture(e.pointerId);
      const r = textDragDiv.getBoundingClientRect();
      dragOffX = e.clientX - r.left;
      dragOffY = e.clientY - r.top;
      dragging = true;
    });
    textDragDiv.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      e.preventDefault();
      const stageR = stage.getBoundingClientRect();
      const x = e.clientX - stageR.left - dragOffX;
      const y = e.clientY - stageR.top - dragOffY;
      textDragDiv.style.left = x + 'px';
      textDragDiv.style.top = y + 'px';
    });
    textDragDiv.addEventListener('pointerup', () => { dragging = false; });

    // Commit and Cancel buttons injected into the bar
    const bar = host.querySelector('.imgv-bar');
    textCommitBtn = document.createElement('button');
    textCommitBtn.textContent = 'Commit text';
    textCommitBtn.className = 'imgv-text-commit';
    textCommitBtn.title = 'Place the text at its current position';
    bar.appendChild(textCommitBtn);

    textCancelBtn = document.createElement('button');
    textCancelBtn.textContent = 'Cancel';
    textCancelBtn.className = 'imgv-text-cancel-place';
    textCancelBtn.title = 'Cancel text placement';
    bar.appendChild(textCancelBtn);

    textCommitBtn.addEventListener('click', () => {
      // Compute position as fraction of img display rect
      const imgR = img.getBoundingClientRect();
      const divR = textDragDiv.getBoundingClientRect();
      const nx = (divR.left - imgR.left) / imgR.width;
      const ny = (divR.bottom - imgR.top) / imgR.height; // bottom = baseline
      exitTextPlaceMode();
      commitText(nx, ny).catch((err) => { if (editApply) editApply.title = err.message || String(err); });
    });

    textCancelBtn.addEventListener('click', () => {
      exitTextPlaceMode();
    });
  }

  editApply?.addEventListener('click', () => {
    enterTextPlaceMode();
  });
  editReset?.addEventListener('click', () => {
    exitTextPlaceMode();
    [...undoStack, ...redoStack].forEach((s) => { if (s.url) URL.revokeObjectURL(s.url); });
    undoStack.length = 0; redoStack.length = 0;
    if (undoBtn) undoBtn.hidden = true;
    if (redoBtn) redoBtn.hidden = true;
    if (editedUrl) URL.revokeObjectURL(editedUrl);
    editedUrl = null;
    editedBlob = null;
    img.src = url;
    img.style.filter = '';
    editReset.hidden = true;
    const dirtyIndicator = host.querySelector('.imgv-dirty-indicator');
    if (dirtyIndicator) dirtyIndicator.hidden = true;
    ctx.onBinaryEdit?.(null);
  });

  // Helper: draw the current image onto a canvas with a transform, then commit it as the new edit.
  async function applyTransform(transformFn, newW, newH) {
    const base = new Image();
    base.decoding = 'async';
    base.src = editedUrl || url;
    await base.decode();
    const srcW = base.naturalWidth, srcH = base.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = newW(srcW, srcH);
    canvas.height = newH(srcW, srcH);
    const g = canvas.getContext('2d');
    if (mime === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, canvas.width, canvas.height); }
    transformFn(g, srcW, srcH, canvas.width, canvas.height);
    g.drawImage(base, 0, 0);
    const targetMime = getExportMime();
    pushUndo();
    editedBlob = await new Promise((resolve) => canvas.toBlob(resolve, targetMime, targetMime === 'image/jpeg' ? 0.92 : undefined));
    if (!editedBlob) return;
    // Do NOT revoke editedUrl here — pushUndo() retained it as the undo target.
    editedUrl = URL.createObjectURL(editedBlob);
    img.src = editedUrl;
    // The edited image has new dimensions (rotate swaps W/H) — keep zoom correct.
    natural = canvas.width;
    apply();
    editReset.hidden = false;
    ctx.onBinaryEdit?.({ dirty: true, mimeType: targetMime, getBytes: async () => new Uint8Array(await editedBlob.arrayBuffer()) });
  }

  // Rotate left (CCW 90°): new canvas is h×w, pivot at center, rotate -90°, then
  // draw centered (offset by HALF THE SOURCE dims, not the rotated dims).
  rotLBtn?.addEventListener('click', () => applyTransform(
    (g, sw, sh, cw, ch) => { g.translate(cw / 2, ch / 2); g.rotate(-Math.PI / 2); g.translate(-sw / 2, -sh / 2); },
    (sw, sh) => sh, (sw, sh) => sw,
  ));

  // Rotate right (CW 90°): new canvas is h×w, pivot at center, rotate +90°
  rotRBtn?.addEventListener('click', () => applyTransform(
    (g, sw, sh, cw, ch) => { g.translate(cw / 2, ch / 2); g.rotate(Math.PI / 2); g.translate(-sw / 2, -sh / 2); },
    (sw, sh) => sh, (sw, sh) => sw,
  ));

  // Flip horizontal: scale(-1,1) around center
  flipHBtn?.addEventListener('click', () => applyTransform(
    (g, sw, sh, cw, ch) => { g.translate(cw, 0); g.scale(-1, 1); },
    (sw) => sw, (sw, sh) => sh,
  ));

  // Flip vertical: scale(1,-1) around center
  flipVBtn?.addEventListener('click', () => applyTransform(
    (g, sw, sh, cw, ch) => { g.translate(0, ch); g.scale(1, -1); },
    (sw) => sw, (sw, sh) => sh,
  ));

  // Filters panel toggle
  filtersBtn?.addEventListener('click', () => {
    if (filtersPanel) filtersPanel.hidden = !filtersPanel.hidden;
  });

  // Live filter preview — apply as CSS filter on img while sliding
  function filterString() {
    return `brightness(${fBrightness.value}%) contrast(${fContrast.value}%) saturate(${fSaturation.value}%) hue-rotate(${fHue?.value || 0}deg)`;
  }
  function updateFilterPreview() { img.style.filter = filterString(); }
  fBrightness?.addEventListener('input', updateFilterPreview);
  fContrast?.addEventListener('input', updateFilterPreview);
  fSaturation?.addEventListener('input', updateFilterPreview);
  fHue?.addEventListener('input', updateFilterPreview);

  // Apply filters — bake current CSS filter into the canvas, then clear the live preview
  fApplyBtn?.addEventListener('click', async () => {
    const filter = filterString();
    img.style.filter = ''; // clear live preview before baking
    const base = new Image();
    base.decoding = 'async';
    base.src = editedUrl || url;
    await base.decode();
    const canvas = document.createElement('canvas');
    canvas.width = base.naturalWidth;
    canvas.height = base.naturalHeight;
    const g = canvas.getContext('2d');
    if (mime === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, canvas.width, canvas.height); }
    g.filter = filter;
    g.drawImage(base, 0, 0);
    g.filter = 'none';
    const targetMime = getExportMime();
    pushUndo();
    editedBlob = await new Promise((resolve) => canvas.toBlob(resolve, targetMime, targetMime === 'image/jpeg' ? 0.92 : undefined));
    if (!editedBlob) return;
    // Do NOT revoke editedUrl here — pushUndo() retained it as the undo target.
    editedUrl = URL.createObjectURL(editedBlob);
    img.src = editedUrl;
    editReset.hidden = false;
    ctx.onBinaryEdit?.({ dirty: true, mimeType: targetMime, getBytes: async () => new Uint8Array(await editedBlob.arrayBuffer()) });
  });

  // Reset filter sliders to default and clear any live preview
  fResetBtn?.addEventListener('click', () => {
    if (fBrightness) fBrightness.value = '100';
    if (fContrast) fContrast.value = '100';
    if (fSaturation) fSaturation.value = '100';
    if (fHue) fHue.value = '0';
    img.style.filter = '';
  });

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
    compareView = mountCompare(stage, { originalUrl: url, currentUrl: editedUrl || url, onClose: exitCompare });
  });

  // Pencil / eraser drawing tools
  // Position the overlay canvas to exactly cover the displayed <img> box (NOT
  // the whole stage), so brush coordinates map 1:1 to image pixels regardless of
  // fit/zoom/scroll letterboxing.
  function syncOverlay() {
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
    pencilBtn?.classList.toggle('active', drawMode === 'pencil');
    eraserBtn?.classList.toggle('active', drawMode === 'eraser');
    fillBtn?.classList.toggle('active', drawMode === 'fill');
    fillOpts.forEach((el) => { el.hidden = drawMode !== 'fill'; });
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
    pushUndo();
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
    const filled = floodFill(id.data, c.width, c.height, Math.round(pt.x), Math.round(pt.y),
      hexToRgba(drawColorPicker?.value), parseInt(fillTol?.value || '0', 10), !!fillEdge?.checked);
    if (!filled) return;
    g.putImageData(id, 0, 0);
    const targetMime = getExportMime();
    pushUndo();
    const blob = await new Promise((r) => c.toBlob(r, targetMime, targetMime === 'image/jpeg' ? 0.92 : undefined));
    if (!blob) return;
    editedBlob = blob; editedUrl = URL.createObjectURL(blob);
    img.src = editedUrl;
    if (editReset) editReset.hidden = false;
    ctx.onBinaryEdit?.({ dirty: true, mimeType: targetMime, getBytes: async () => new Uint8Array(await blob.arrayBuffer()) });
  }

  async function commitDraw() {
    if (!drawOverlay || !drawOverlay.width) return;
    const targetMime = getExportMime();
    let blob;
    if (isEraserStroke) {
      blob = await new Promise((r) => drawOverlay.toBlob(r, targetMime, targetMime === 'image/jpeg' ? 0.92 : undefined));
    } else {
      // Composite from the already-loaded <img> (the current committed image) —
      // NOT a fresh fetch of editedUrl. Avoids a second blob-URL request per stroke.
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const g = c.getContext('2d');
      if (mime === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
      g.drawImage(img, 0, 0); g.drawImage(drawOverlay, 0, 0);
      blob = await new Promise((r) => c.toBlob(r, targetMime, targetMime === 'image/jpeg' ? 0.92 : undefined));
    }
    drawOCtx.clearRect(0, 0, drawOverlay.width, drawOverlay.height);
    if (!blob) return;
    // Do NOT revoke editedUrl here — pushUndo() retained it as the undo target.
    editedBlob = blob; editedUrl = URL.createObjectURL(blob);
    img.src = editedUrl;
    if (editReset) editReset.hidden = false;
    ctx.onBinaryEdit?.({ dirty: true, mimeType: targetMime, getBytes: async () => new Uint8Array(await blob.arrayBuffer()) });
  }

  async function onPUp(e) { if (isPointerDown) { isPointerDown = false; await commitDraw(); } }

  if (pencilBtn) {
    pencilBtn.addEventListener('click', () => setDrawMode('pencil'));
    eraserBtn.addEventListener('click', () => setDrawMode('eraser'));
    fillBtn?.addEventListener('click', () => setDrawMode('fill'));
    fillTol?.addEventListener('input', () => { if (fillTolV) fillTolV.textContent = fillTol.value; });
    undoBtn?.addEventListener('click', doUndo);
    redoBtn?.addEventListener('click', doRedo);
  }

  // Ctrl/Cmd+Z = undo, Ctrl+Y or Ctrl/Cmd+Shift+Z = redo — only while this image
  // view is connected, not in ASCII mode, and not typing in a field.
  function onEditKey(e) {
    if (!canEdit || asciiMode || !host.isConnected) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); doUndo(); }
    else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); doRedo(); }
  }
  document.addEventListener('keydown', onEditKey);

  // Crop tool — drag a rectangle on the image to select a region, then apply to commit
  function cropExitMode() {
    cropMode = false;
    cropHasRegion = false;
    cropDragging = false;
    if (cropOverlay) { cropOverlay.remove(); cropOverlay = null; cropSelBox = null; }
    if (cropBtn) { cropBtn.classList.remove('active'); }
    if (cropApplyBtn) cropApplyBtn.hidden = true;
    if (cropCancelBtn) cropCancelBtn.hidden = true;
  }

  function cropEnterMode() {
    cropMode = true;
    cropHasRegion = false;
    const stage = host.querySelector('.imgv-stage');
    stage.style.position = 'relative';
    cropOverlay = document.createElement('div');
    cropOverlay.style.cssText = 'position:absolute;inset:0;cursor:crosshair;z-index:5;';
    cropSelBox = document.createElement('div');
    cropSelBox.style.cssText = 'position:absolute;border:2px dashed #0af;box-sizing:border-box;background:rgba(0,170,255,0.08);pointer-events:none;display:none;';
    cropOverlay.appendChild(cropSelBox);
    stage.appendChild(cropOverlay);
    if (cropBtn) cropBtn.classList.add('active');
    if (cropCancelBtn) cropCancelBtn.hidden = false;

    cropOverlay.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      cropOverlay.setPointerCapture(e.pointerId);
      const r = img.getBoundingClientRect();
      cropStartX = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      cropStartY = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
      cropEndX = cropStartX; cropEndY = cropStartY;
      cropDragging = true; cropHasRegion = false;
      cropSelBox.style.display = 'none';
      if (cropApplyBtn) cropApplyBtn.hidden = true;
    });

    cropOverlay.addEventListener('pointermove', (e) => {
      if (!cropDragging) return;
      e.preventDefault();
      const r = img.getBoundingClientRect();
      cropEndX = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      cropEndY = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
      // Update the selection box overlay using img bounding rect relative to stage
      const stageR = host.querySelector('.imgv-stage').getBoundingClientRect();
      const imgR = img.getBoundingClientRect();
      const ox = imgR.left - stageR.left;
      const oy = imgR.top - stageR.top;
      const x1 = Math.min(cropStartX, cropEndX) * imgR.width + ox;
      const y1 = Math.min(cropStartY, cropEndY) * imgR.height + oy;
      const x2 = Math.max(cropStartX, cropEndX) * imgR.width + ox;
      const y2 = Math.max(cropStartY, cropEndY) * imgR.height + oy;
      cropSelBox.style.left = x1 + 'px'; cropSelBox.style.top = y1 + 'px';
      cropSelBox.style.width = (x2 - x1) + 'px'; cropSelBox.style.height = (y2 - y1) + 'px';
      cropSelBox.style.display = 'block';
    });

    cropOverlay.addEventListener('pointerup', (e) => {
      if (!cropDragging) return;
      cropDragging = false;
      const r = img.getBoundingClientRect();
      cropEndX = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      cropEndY = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
      // Check minimum size (10×10 natural px)
      const nw = img.naturalWidth || 1, nh = img.naturalHeight || 1;
      const selW = Math.abs(cropEndX - cropStartX) * nw;
      const selH = Math.abs(cropEndY - cropStartY) * nh;
      if (selW >= 10 && selH >= 10) {
        cropHasRegion = true;
        if (cropApplyBtn) cropApplyBtn.hidden = false;
      }
    });
  }

  async function applyCrop() {
    if (!cropHasRegion) return;
    const nw = img.naturalWidth, nh = img.naturalHeight;
    const x1 = Math.round(Math.min(cropStartX, cropEndX) * nw);
    const y1 = Math.round(Math.min(cropStartY, cropEndY) * nh);
    const x2 = Math.round(Math.max(cropStartX, cropEndX) * nw);
    const y2 = Math.round(Math.max(cropStartY, cropEndY) * nh);
    const cw = Math.max(1, x2 - x1), ch = Math.max(1, y2 - y1);
    const base = new Image(); base.decoding = 'async';
    base.src = editedUrl || url;
    await base.decode();
    const canvas = document.createElement('canvas');
    canvas.width = cw; canvas.height = ch;
    const g = canvas.getContext('2d');
    if (mime === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, cw, ch); }
    g.drawImage(base, -x1, -y1);
    const targetMime = getExportMime();
    pushUndo();
    editedBlob = await new Promise((resolve) => canvas.toBlob(resolve, targetMime, targetMime === 'image/jpeg' ? 0.92 : undefined));
    if (!editedBlob) return;
    // Do NOT revoke editedUrl here — pushUndo() retained it as the undo target.
    editedUrl = URL.createObjectURL(editedBlob);
    img.src = editedUrl;
    if (editReset) editReset.hidden = false;
    ctx.onBinaryEdit?.({ dirty: true, mimeType: targetMime, getBytes: async () => new Uint8Array(await editedBlob.arrayBuffer()) });
    cropExitMode();
  }

  if (cropBtn) {
    cropBtn.addEventListener('click', () => {
      if (cropMode) { cropExitMode(); } else { cropEnterMode(); }
    });
    cropApplyBtn?.addEventListener('click', () => {
      applyCrop().catch((e) => { if (cropApplyBtn) cropApplyBtn.title = e.message || String(e); });
    });
    cropCancelBtn?.addEventListener('click', cropExitMode);
  }

  // Resize tool — show a panel with width/height inputs, apply draws to a new canvas at that size
  const resizeUnit = canEdit ? host.querySelector('.imgv-resize-unit') : null;
  const resizeResample = canEdit ? host.querySelector('.imgv-resize-resample') : null;
  const pctMode = () => resizeUnit?.value === 'pct';
  function resizePopulate() {
    if (!resizeW || !resizeH) return;
    if (pctMode()) { resizeW.value = '100'; resizeH.value = '100'; }
    else { resizeW.value = String(img.naturalWidth || ''); resizeH.value = String(img.naturalHeight || ''); }
  }
  // Resolve the W/H inputs to absolute target pixels (percent is of the natural size).
  function resizeTargetPx() {
    const w = parseFloat(resizeW?.value), h = parseFloat(resizeH?.value);
    if (pctMode()) return { tw: Math.round((img.naturalWidth || 0) * w / 100), th: Math.round((img.naturalHeight || 0) * h / 100) };
    return { tw: Math.round(w), th: Math.round(h) };
  }

  if (resizeBtn) {
    resizeBtn.addEventListener('click', () => {
      if (!resizePanel) return;
      const open = resizePanel.hidden === false;
      resizePanel.hidden = open;
      if (!open) resizePopulate();
    });
    resizeUnit?.addEventListener('change', resizePopulate);

    resizeW?.addEventListener('input', () => {
      if (!resizeLock?.checked) return;
      // In % mode aspect is preserved by matching percentages; in px mode by ratio.
      if (pctMode()) { if (resizeH) resizeH.value = resizeW.value; return; }
      const nw = img.naturalWidth || 1, nh = img.naturalHeight || 1;
      const w = parseInt(resizeW.value, 10);
      if (w > 0 && resizeH) resizeH.value = String(Math.round(w * nh / nw));
    });

    resizeH?.addEventListener('input', () => {
      if (!resizeLock?.checked) return;
      if (pctMode()) { if (resizeW) resizeW.value = resizeH.value; return; }
      const nw = img.naturalWidth || 1, nh = img.naturalHeight || 1;
      const h = parseInt(resizeH.value, 10);
      if (h > 0 && resizeW) resizeW.value = String(Math.round(h * nw / nh));
    });

    resizeApplyBtn?.addEventListener('click', async () => {
      const { tw, th } = resizeTargetPx();
      if (!tw || !th || tw < 1 || th < 1) return;
      const base = new Image(); base.decoding = 'async';
      base.src = editedUrl || url;
      await base.decode();
      const canvas = document.createElement('canvas');
      canvas.width = tw; canvas.height = th;
      const g = canvas.getContext('2d');
      // Resampling: pixelated = nearest-neighbour (crisp pixel art / hard downscale);
      // smooth = bilinear-ish at the chosen quality.
      const rs = resizeResample?.value || 'high';
      g.imageSmoothingEnabled = rs !== 'pixelated';
      if (g.imageSmoothingEnabled) g.imageSmoothingQuality = rs === 'medium' ? 'medium' : 'high';
      if (mime === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, tw, th); }
      g.drawImage(base, 0, 0, tw, th);
      const targetMime = getExportMime();
      pushUndo();
      editedBlob = await new Promise((resolve) => canvas.toBlob(resolve, targetMime, targetMime === 'image/jpeg' ? 0.92 : undefined));
      if (!editedBlob) return;
      // Do NOT revoke editedUrl here — pushUndo() retained it as the undo target.
      editedUrl = URL.createObjectURL(editedBlob);
      img.src = editedUrl;
      if (editReset) editReset.hidden = false;
      ctx.onBinaryEdit?.({ dirty: true, mimeType: targetMime, getBytes: async () => new Uint8Array(await editedBlob.arrayBuffer()) });
      if (resizePanel) resizePanel.hidden = true;
    });

    resizeCancelBtn?.addEventListener('click', () => {
      if (resizePanel) resizePanel.hidden = true;
    });
  }

  // BG removal — bgFloodFill (./fill.js) returns the transparency-punched RGBA
  // bytes; wrap them in an ImageData for putImageData.
  function bgFilledImageData() {
    const dst = bgFloodFill(bgSrcData, bgSrcW, bgSrcH, bgPickX, bgPickY, parseInt(bgTol.value, 10));
    return new ImageData(dst, bgSrcW, bgSrcH);
  }

  function bgExitMode() {
    bgPickMode = false;
    bgPickX = bgPickY = -1;
    bgSrcData = null;
    if (bgPreviewUrl) { URL.revokeObjectURL(bgPreviewUrl); bgPreviewUrl = null; }
    bgBtn?.classList.remove('active');
    img.style.cursor = '';
    if (bgTol) bgTol.hidden = true;
    if (bgOk) bgOk.hidden = true;
    if (bgX) bgX.hidden = true;
  }

  function bgRunPreview() {
    if (!bgSrcData || bgPickX < 0) return;
    const filled = bgFilledImageData();
    const c = document.createElement('canvas'); c.width = bgSrcW; c.height = bgSrcH;
    c.getContext('2d').putImageData(filled, 0, 0);
    c.toBlob((blob) => {
      if (!blob) return;
      if (bgPreviewUrl) URL.revokeObjectURL(bgPreviewUrl);
      bgPreviewUrl = URL.createObjectURL(blob);
      img.src = bgPreviewUrl;
    }, 'image/png');
  }

  if (bgBtn) {
    bgBtn.addEventListener('click', () => {
      if (bgPickMode) { bgExitMode(); if (editedUrl) img.src = editedUrl; else img.src = url; return; }
      bgPickMode = true;
      bgPickX = bgPickY = -1;
      bgSrcData = null;
      bgBtn.classList.add('active');
      img.style.cursor = 'crosshair';
      bgBtn.title = 'Click the background color on the image';
    });

    img.addEventListener('click', async (e) => {
      if (!bgPickMode) return;
      if (bgPickX >= 0) return; // already picked, re-pick not allowed until cancel
      const base = new Image(); base.decoding = 'async';
      base.src = editedUrl || url;
      await base.decode();
      const c = document.createElement('canvas');
      c.width = base.naturalWidth; c.height = base.naturalHeight;
      const g = c.getContext('2d'); g.drawImage(base, 0, 0);
      bgSrcData = g.getImageData(0, 0, c.width, c.height);
      bgSrcW = c.width; bgSrcH = c.height;
      const r = img.getBoundingClientRect();
      bgPickX = Math.max(0, Math.min(bgSrcW - 1, Math.round((e.clientX - r.left) * bgSrcW / r.width)));
      bgPickY = Math.max(0, Math.min(bgSrcH - 1, Math.round((e.clientY - r.top) * bgSrcH / r.height)));
      if (bgTol) bgTol.hidden = false;
      if (bgOk) bgOk.hidden = false;
      if (bgX) bgX.hidden = false;
      bgRunPreview();
    });

    bgTol?.addEventListener('input', bgRunPreview);

    bgOk?.addEventListener('click', () => {
      if (!bgSrcData || bgPickX < 0) return;
      const filled = bgFilledImageData();
      const c = document.createElement('canvas'); c.width = bgSrcW; c.height = bgSrcH;
      c.getContext('2d').putImageData(filled, 0, 0);
      c.toBlob((blob) => {
        if (!blob) return;
        pushUndo();
        // Do NOT revoke editedUrl here — pushUndo() retained it as the undo target.
        editedBlob = blob; editedUrl = URL.createObjectURL(blob);
        img.src = editedUrl;
        if (editReset) editReset.hidden = false;
        if (exportFmt) exportFmt.value = 'image/png';
        ctx.onBinaryEdit?.({ dirty: true, mimeType: 'image/png', getBytes: async () => new Uint8Array(await blob.arrayBuffer()) });
        bgExitMode();
      }, 'image/png');
    });

    bgX?.addEventListener('click', () => {
      bgExitMode();
      if (editedUrl) img.src = editedUrl; else img.src = url;
    });
  }

  return { parentNode: host, revoke: () => { document.removeEventListener('keydown', onEditKey); document.removeEventListener('keydown', onZoomKey); compareView?.destroy?.(); asciiStudio?.destroy?.(); URL.revokeObjectURL(url); if (editedUrl) URL.revokeObjectURL(editedUrl); if (bgPreviewUrl) URL.revokeObjectURL(bgPreviewUrl); [...undoStack, ...redoStack].forEach((s) => { if (s.url) URL.revokeObjectURL(s.url); }); host._ss?.stop(); } };
}
