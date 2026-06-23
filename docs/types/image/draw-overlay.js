// Pencil / eraser / flood-fill overlay for the image editor. Owns a <canvas> positioned exactly
// over the displayed <img> box so brush coordinates map 1:1 to image pixels regardless of
// fit/zoom/pan letterboxing. Extracted from renderer.js; the pure pixel walk for fill lives in
// ./fill.js. Coordinates with the view (applyPan) and the magic-wand selection (clip strokes/fills
// to the active mask) through the injected ctx.
//
// ctx: { host, img, mime, core, getSelection(), applyPan(), els }
//   els: pencilBtn eraserBtn fillBtn cloneBtn healBtn fillTol fillTolV fillMode fillPercep fillFeather
//        fillOpts drawColorPicker drawSizePicker undoBtn redoBtn
import { hexToRgba, floodFill } from './fill.js';

export function createDrawTools(ctx) {
  const { host, img, mime, core, els } = ctx;
  const {
    pencilBtn, eraserBtn, fillBtn, cloneBtn, healBtn, fillTol, fillTolV, fillMode, fillPercep, fillFeather, fillOpts,
    drawColorPicker, drawSizePicker, undoBtn, redoBtn,
  } = els;
  const selection = () => ctx.getSelection?.();

  let drawMode = null, isEraserStroke = false, isCloneStroke = false, isHealStroke = false;
  let drawOverlay = null, drawOCtx = null, isPointerDown = false, lastPt = null, brushCursor = null;
  // Clone stamp / heal: alt-click sets a source anchor + snapshots the base; painting copies pixels
  // from (dest − offset) where offset is fixed on the first dab (aligned clone). Heal is the same
  // sampling but mean-shifts the patch to the destination's surrounding tone (seamless blemish fix).
  // cloneMarker shows the source. `cloneMode()` covers both clone + heal modes.
  let cloneSource = null, cloneSrcCtx = null, cloneSrcPt = null, cloneOffset = null, cloneMarker = null;
  const cloneMode = () => drawMode === 'clone' || drawMode === 'heal';

  // Position the overlay canvas to exactly cover the displayed <img> box (NOT the whole stage), so
  // brush coordinates map 1:1 to image pixels regardless of fit/zoom/scroll letterboxing.
  function syncOverlay() {
    selection()?.syncOverlay();   // the selection overlay exists independently of the draw overlay
    if (!drawOverlay) return;
    drawOverlay.style.left = img.offsetLeft + 'px';
    drawOverlay.style.top = img.offsetTop + 'px';
    drawOverlay.style.width = img.offsetWidth + 'px';
    drawOverlay.style.height = img.offsetHeight + 'px';
    positionCloneMarker();
  }

  // Place the clone-source marker over the source pixel, mapping natural → displayed coords.
  function positionCloneMarker() {
    if (!cloneMarker) return;
    if (!cloneSrcPt || !cloneMode() || !img.naturalWidth) { cloneMarker.style.display = 'none'; return; }
    const sx = img.offsetWidth / img.naturalWidth, sy = img.offsetHeight / img.naturalHeight;
    cloneMarker.style.left = (img.offsetLeft + cloneSrcPt.x * sx) + 'px';
    cloneMarker.style.top = (img.offsetTop + cloneSrcPt.y * sy) + 'px';
    cloneMarker.style.display = 'block';
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
    // Clone-source marker — a crosshair circle pinned to the sampled source pixel.
    cloneMarker = document.createElement('div');
    cloneMarker.className = 'imgv-clone-src';
    cloneMarker.style.cssText = 'position:absolute;width:12px;height:12px;border:1px solid #0ff;box-shadow:0 0 0 1px rgba(0,0,0,.7);border-radius:50%;pointer-events:none;transform:translate(-50%,-50%);z-index:3;display:none;';
    stage.appendChild(cloneMarker);
    img.addEventListener('load', () => {
      if (drawOverlay && !isEraserStroke && !isCloneStroke && !isHealStroke) { drawOverlay.width = img.naturalWidth || 1; drawOverlay.height = img.naturalHeight || 1; }
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
    if (!brushCursor || (drawMode !== 'pencil' && drawMode !== 'eraser' && !cloneMode())) { hideBrushCursor(); return; }
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
    cloneBtn?.classList.toggle('active', drawMode === 'clone');
    healBtn?.classList.toggle('active', drawMode === 'heal');
    if (!cloneMode()) { cloneSource = null; cloneSrcCtx = null; cloneSrcPt = null; cloneOffset = null; positionCloneMarker(); }
    // Fill-tuning controls are shared by the bucket AND the wand — show for either.
    fillOpts.forEach((el) => { el.hidden = !(drawMode === 'fill' || selection()?.isActive()); });
    if (!drawOverlay && drawMode) buildOverlay();
    if (drawOverlay) {
      drawOverlay.style.pointerEvents = drawMode ? 'auto' : 'none';
      drawOverlay.style.cursor = drawMode === 'eraser' ? 'cell'
        : drawMode === 'fill' ? 'crosshair'
        : (drawMode === 'pencil' || cloneMode()) ? 'none' : ''; // hover circle is the cursor
    }
    if (drawMode !== 'pencil' && drawMode !== 'eraser' && !cloneMode()) hideBrushCursor();
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

  // Snapshot the current committed image to its own canvas (the clone-stamp source).
  function snapshotImg() {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true });
    if (mime === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
    g.drawImage(img, 0, 0);
    cloneSrcCtx = g;   // cached for heal's per-dab source reads
    return c;
  }

  // Alt-click (or the first click before a source exists) anchors the clone source. Returns true when
  // the gesture set the source — the caller then skips painting for this pointer-down.
  function maybeSetCloneSource(e) {
    const pt = ptToCanvas(e);
    if (e.altKey || !cloneSource) {
      cloneSource = snapshotImg();
      cloneSrcPt = pt; cloneOffset = null;
      positionCloneMarker();
      return true;
    }
    return false;
  }

  // One clone dab: within a brush-sized circle, replace the dest pixels with the source shifted by
  // cloneOffset (= firstDab − sourceAnchor), so dest P shows source (P − offset).
  function cloneDab(p, sz) {
    drawOCtx.save();
    drawOCtx.beginPath(); drawOCtx.arc(p.x, p.y, sz / 2, 0, Math.PI * 2); drawOCtx.clip();
    drawOCtx.clearRect(0, 0, drawOverlay.width, drawOverlay.height);
    drawOCtx.drawImage(cloneSource, cloneOffset.x, cloneOffset.y);
    drawOCtx.restore();
  }

  // Heal dab: like clone, but mean-shift the sampled source patch so its average colour matches the
  // DESTINATION surround (read from the evolving overlay). Texture transfers; tone blends in — so a
  // blemish vanishes instead of being hard-copied. Source coords = dest − offset (clamped in-bounds).
  function healDab(p, sz) {
    const r = sz / 2;
    const x0 = Math.max(0, Math.floor(p.x - r)), y0 = Math.max(0, Math.floor(p.y - r));
    const x1 = Math.min(drawOverlay.width, Math.ceil(p.x + r)), y1 = Math.min(drawOverlay.height, Math.ceil(p.y + r));
    const w = x1 - x0, h = y1 - y0;
    if (w <= 0 || h <= 0 || !cloneSrcCtx) return;
    if (cloneSource.width < w || cloneSource.height < h) { cloneDab(p, sz); return; }   // image smaller than brush
    const sx = Math.max(0, Math.min(cloneSource.width - w, Math.round(x0 - cloneOffset.x)));
    const sy = Math.max(0, Math.min(cloneSource.height - h, Math.round(y0 - cloneOffset.y)));
    const src = cloneSrcCtx.getImageData(sx, sy, w, h);
    const dst = drawOCtx.getImageData(x0, y0, w, h);
    const s = src.data, d = dst.data;
    let sr = 0, sg = 0, sb = 0, dr = 0, dg = 0, db = 0, n = 0;
    for (let i = 0; i < s.length; i += 4) { sr += s[i]; sg += s[i + 1]; sb += s[i + 2]; dr += d[i]; dg += d[i + 1]; db += d[i + 2]; n++; }
    const or = (dr - sr) / n, og = (dg - sg) / n, ob = (db - sb) / n;   // per-channel mean shift
    for (let i = 0; i < s.length; i += 4) { s[i] += or; s[i + 1] += og; s[i + 2] += ob; }   // Uint8Clamped clamps
    const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h;
    tmp.getContext('2d').putImageData(src, 0, 0);
    drawOCtx.save();
    drawOCtx.beginPath(); drawOCtx.arc(p.x, p.y, r, 0, Math.PI * 2); drawOCtx.clip();
    drawOCtx.drawImage(tmp, x0, y0);
    drawOCtx.restore();
  }
  const dab = (p, sz) => (isHealStroke ? healDab : cloneDab)(p, sz);

  async function onPDown(e) {
    if (!drawMode || !drawOverlay) return;
    e.preventDefault();
    if (drawMode === 'fill') { await doFill(e); return; }
    if (cloneMode() && maybeSetCloneSource(e)) return;   // alt-click set the source; don't paint
    isPointerDown = true;
    isEraserStroke = drawMode === 'eraser';
    isCloneStroke = cloneMode();
    isHealStroke = drawMode === 'heal';
    core.pushUndo();
    if (isEraserStroke || isCloneStroke) {
      // preload overlay from the already-loaded <img> (no extra fetch): eraser punches into it with
      // destination-out; clone overwrites circular patches with sampled source pixels.
      drawOverlay.width = img.naturalWidth; drawOverlay.height = img.naturalHeight;
      if (mime === 'image/jpeg') { drawOCtx.fillStyle = '#fff'; drawOCtx.fillRect(0, 0, drawOverlay.width, drawOverlay.height); }
      drawOCtx.drawImage(img, 0, 0);
    } else if (!drawOverlay.width || !img.naturalWidth) {
      drawOverlay.width = img.naturalWidth || 1; drawOverlay.height = img.naturalHeight || 1;
    }
    if (!isEraserStroke && !isCloneStroke && img.naturalWidth && drawOverlay.width !== img.naturalWidth) {
      drawOverlay.width = img.naturalWidth;
      drawOverlay.height = img.naturalHeight;
    }
    lastPt = ptToCanvas(e);
    const sz = getCanvasBrushSize();
    if (isCloneStroke) {
      if (!cloneOffset) cloneOffset = { x: lastPt.x - cloneSrcPt.x, y: lastPt.y - cloneSrcPt.y };
      dab(lastPt, sz);
      return;
    }
    applyStrokeStyle(sz);
    drawOCtx.beginPath(); drawOCtx.arc(lastPt.x, lastPt.y, sz / 2, 0, Math.PI * 2); drawOCtx.fill();
  }

  function onPMove(e) {
    moveBrushCursor(e);
    if (!isPointerDown || !drawOCtx) return;
    e.preventDefault();
    const pt = ptToCanvas(e);
    const sz = getCanvasBrushSize();
    if (isCloneStroke) {
      // dab along the segment so fast moves stay continuous
      const dx = pt.x - lastPt.x, dy = pt.y - lastPt.y, dist = Math.hypot(dx, dy), step = Math.max(1, sz / 4);
      for (let d = step; d < dist; d += step) dab({ x: lastPt.x + (dx * d) / dist, y: lastPt.y + (dy * d) / dist }, sz);
      dab(pt, sz);
      lastPt = pt;
      return;
    }
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
    if (isEraserStroke || isCloneStroke) {
      // Eraser/clone overlays ARE the full image (holes punched / patches cloned). Clip to the
      // selection (restore base pixels outside the mask) so the edit stays inside it.
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
    cloneBtn?.addEventListener('click', () => setDrawMode('clone'));
    healBtn?.addEventListener('click', () => setDrawMode('heal'));
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
