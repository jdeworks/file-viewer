// Pencil / eraser / flood-fill overlay for the image editor. Owns a <canvas> positioned exactly
// over the displayed <img> box so brush coordinates map 1:1 to image pixels regardless of
// fit/zoom/pan letterboxing. Extracted from renderer.js; the pure pixel walk for fill lives in
// ./fill.js. Coordinates with the view (applyPan) and the magic-wand selection (clip strokes/fills
// to the active mask) through the injected ctx.
//
// ctx: { host, img, mime, core, getSelection(), applyPan(), els }
//   els: pencilBtn eraserBtn fillBtn fillTol fillTolV fillMode fillPercep fillFeather fillOpts
//        drawColorPicker drawSizePicker undoBtn redoBtn
import { hexToRgba, floodFill } from './fill.js';

export function createDrawTools(ctx) {
  const { host, img, mime, core, els } = ctx;
  const {
    pencilBtn, eraserBtn, fillBtn, fillTol, fillTolV, fillMode, fillPercep, fillFeather, fillOpts,
    drawColorPicker, drawSizePicker, undoBtn, redoBtn,
  } = els;
  const selection = () => ctx.getSelection?.();

  let drawMode = null, isEraserStroke = false;
  let drawOverlay = null, drawOCtx = null, isPointerDown = false, lastPt = null, brushCursor = null;

  // Position the overlay canvas to exactly cover the displayed <img> box (NOT the whole stage), so
  // brush coordinates map 1:1 to image pixels regardless of fit/zoom/scroll letterboxing.
  function syncOverlay() {
    selection()?.syncOverlay();   // the selection overlay exists independently of the draw overlay
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
    // Brush hover preview — a circle tracking the cursor so you see brush position + size.
    brushCursor = document.createElement('div');
    brushCursor.className = 'imgv-brush-cursor';
    brushCursor.style.cssText = 'position:absolute;border:1px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.6);border-radius:50%;pointer-events:none;transform:translate(-50%,-50%);z-index:3;display:none;mix-blend-mode:difference;';
    stage.appendChild(brushCursor);
    img.addEventListener('load', () => {
      if (drawOverlay && !isEraserStroke) { drawOverlay.width = img.naturalWidth || 1; drawOverlay.height = img.naturalHeight || 1; }
      syncOverlay(); ctx.applyPan();
    });
    if (img.naturalWidth) { drawOverlay.width = img.naturalWidth; drawOverlay.height = img.naturalHeight; }
    syncOverlay(); ctx.applyPan(); // adopt the current pan so the draw area sits on the image
    drawOverlay.addEventListener('mousedown', onPDown);
    drawOverlay.addEventListener('mousemove', onPMove);
    drawOverlay.addEventListener('mouseup', onPUp);
    drawOverlay.addEventListener('mouseleave', () => { hideBrushCursor(); if (isPointerDown) { isPointerDown = false; commitDraw(); } });
    drawOverlay.addEventListener('touchstart', onPDown, { passive: false });
    drawOverlay.addEventListener('touchmove', onPMove, { passive: false });
    drawOverlay.addEventListener('touchend', onPUp);
  }

  // Move/size the brush hover circle (screen px = the brush-size value, constant on screen). Only
  // shown for pencil/eraser.
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
    if (drawMode) selection()?.setActive(false);   // a draw mode turns off the wand's input (mask persists)
    pencilBtn?.classList.toggle('active', drawMode === 'pencil');
    eraserBtn?.classList.toggle('active', drawMode === 'eraser');
    fillBtn?.classList.toggle('active', drawMode === 'fill');
    // Fill-tuning controls are shared by the bucket AND the wand — show for either.
    fillOpts.forEach((el) => { el.hidden = !(drawMode === 'fill' || selection()?.isActive()); });
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
      // preload overlay from the already-loaded <img> (no extra fetch) so destination-out punches.
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

  // Flood-fill bucket — the pure pixel walk lives in ./fill.js (floodFill); doFill wires it to the
  // canvas + edit-commit pipeline.
  async function doFill(e) {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true });
    if (mime === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
    g.drawImage(img, 0, 0);
    const id = g.getImageData(0, 0, c.width, c.height);
    const pt = ptToCanvas(e);
    // If a selection is active, snapshot first so the fill can be clipped to it.
    const sel = selection();
    const before = sel?.hasSelection() ? Uint8ClampedArray.from(id.data) : null;
    const filled = floodFill(id.data, c.width, c.height, Math.round(pt.x), Math.round(pt.y),
      hexToRgba(drawColorPicker?.value), parseInt(fillTol?.value || '0', 10),
      { mode: fillMode?.value || 'seed', perceptual: !!fillPercep?.checked, feather: !!fillFeather?.checked });
    if (!filled) return;
    if (before) sel.clipFillInPlace(id.data, before);   // constrain the fill to the selection
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
      // The eraser overlay is a copy of the image with holes punched. Clip it to the selection
      // (restore image pixels outside the mask) so erasing stays inside it.
      await selection()?.clipCanvas(drawOverlay, img);
      blob = await new Promise((r) => drawOverlay.toBlob(r, targetMime, targetMime === 'image/jpeg' ? 0.92 : undefined));
    } else {
      // Composite from the already-loaded <img> (the current committed image) — NOT a fresh fetch.
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const g = c.getContext('2d');
      if (mime === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
      g.drawImage(img, 0, 0); g.drawImage(drawOverlay, 0, 0);
      await selection()?.clipCanvas(c, img);   // constrain the brush stroke to the selection
      blob = await new Promise((r) => c.toBlob(r, targetMime, targetMime === 'image/jpeg' ? 0.92 : undefined));
    }
    drawOCtx.clearRect(0, 0, drawOverlay.width, drawOverlay.height);
    core.commitBlob(blob, { mime: targetMime });
  }

  async function onPUp() { if (isPointerDown) { isPointerDown = false; await commitDraw(); } }

  if (pencilBtn) {
    pencilBtn.addEventListener('click', () => setDrawMode('pencil'));
    eraserBtn.addEventListener('click', () => setDrawMode('eraser'));
    fillBtn?.addEventListener('click', () => setDrawMode('fill'));
    fillTol?.addEventListener('input', () => { if (fillTolV) fillTolV.textContent = fillTol.value; });
    undoBtn?.addEventListener('click', core.doUndo);
    redoBtn?.addEventListener('click', core.doRedo);
  }

  return {
    syncOverlay,
    setDrawMode,
    isDrawMode: () => !!drawMode,
    getOverlayEl: () => drawOverlay,
  };
}
