// Pixel selection — build a MASK (magic WAND, rectangle / ellipse MARQUEE, or LASSO)
// and operate on it. While a selection is active the pixel tools (pencil / eraser /
// fill) only "take" inside it (the renderer clips via clipToBase). The selection draws
// as a translucent tint + an animated "marching ants" boundary on its own overlay
// canvas over the image.
//
// MOVE is a FLOATING selection (Paint-style): the first move lifts the masked pixels
// off the base (leaving a transparent hole) into a floating piece that stays selected
// and can be repositioned any number of times (drag, or arrow keys via nudge()). It
// only commits ("stamps") when you deselect or switch away from the Move tool — one
// PNG commit, not one per nudge. The mask follows the piece so you can keep working
// (e.g. recolour) at the new location after the stamp.
//
// The mask is kept at NATURAL resolution (matching the edit canvases); the overlay
// canvas is natural-res and CSS-scaled to the displayed image box. A dimension-changing
// geometry op invalidates it (renderer calls clear()).
import { computeRegionMask, clipToBase } from './fill.js';
import { rectMask, ellipseMask, lassoMask, translateMask } from './edit-select-masks.js';

export function mountSelection({ host, img, mime, els, getFillOpts, onActivate, onCommit }) {
  const { selectBtn, marqueeBtn, ellipseBtn, lassoBtn, moveBtn, deselectBtn } = els;
  if (!selectBtn) return { isActive: () => false, hasSelection: () => false, getMask: () => null, copySelection: () => null, clipFillInPlace() {}, async clipCanvas() {}, invert() {}, nudge() {}, toggle() {}, setActive() {}, setMode() {}, clear() {}, syncOverlay() {}, teardown() {} };

  const stage = host.querySelector('.imgv-stage');
  let mode = null;                   // null | 'wand' | 'marquee' | 'ellipse' | 'lasso' | 'move'
  let mask = null, mw = 0, mh = 0;   // current selection mask (natural res) + its dims
  let ov = null, octx = null;
  let dragging = false, dragStart = null, lassoPts = null;   // rubber-band / freehand drag
  let moving = false, moveStart = null, moveBaseDx = 0, moveBaseDy = 0;   // move-drag bookkeeping
  // Floating selection: the lifted pixels (pieceCanvas) over the holed base (holedCanvas),
  // offset by (floatDx,floatDy) from baseMask's original position.
  let floating = false, holedCanvas = null, pieceCanvas = null, baseMask = null, floatDx = 0, floatDy = 0;
  let selCanvas = null, selCtx = null, selBuf = null, edgeIdx = null;   // offscreen tint+ants buffer
  let antsRAF = 0, antsPhase = 0, antsLast = 0;                          // marching-ants animation state

  function ensureOverlay() {
    if (ov) return;
    stage.style.position = 'relative';
    ov = document.createElement('canvas');
    ov.className = 'imgv-sel-overlay';
    ov.style.cssText = 'position:absolute;pointer-events:none;touch-action:none;z-index:4;';
    octx = ov.getContext('2d');
    stage.appendChild(ov);
    ov.addEventListener('pointerdown', onDown);
    ov.addEventListener('pointermove', onMove);
    ov.addEventListener('pointerup', onUp);
    syncOverlay();
  }

  const isDrag = (m) => m === 'marquee' || m === 'ellipse' || m === 'lasso';

  function onDown(e) {
    if (mode === 'wand') { e.preventDefault(); pickAt(e); return; }
    if (mode === 'move') { startMove(e); return; }
    if (!isDrag(mode)) return;
    e.preventDefault();
    ov.width = img.naturalWidth || 1; ov.height = img.naturalHeight || 1;   // natural-res drawing surface (clears)
    syncOverlay();
    dragging = true; dragStart = ptToCanvas(e);
    if (mode === 'lasso') lassoPts = [dragStart];
    try { ov.setPointerCapture(e.pointerId); } catch { /* not all pointers capture */ }
  }
  function onMove(e) {
    if (moving) { e.preventDefault(); dragFloat(ptToCanvas(e)); return; }
    if (!dragging) return;
    e.preventDefault();
    const pt = ptToCanvas(e);
    if (mode === 'lasso') { lassoPts.push(pt); drawLasso(lassoPts); }
    else drawRubberBand(dragStart, pt, mode);
  }
  function onUp(e) {
    if (moving) { moving = false; return; }   // drop: stay FLOATING + selected (no commit)
    if (!dragging) return;
    dragging = false;
    const pt = ptToCanvas(e);
    const w = img.naturalWidth || 1, h = img.naturalHeight || 1;
    if (mode === 'marquee') setMask(rectMask(dragStart, pt, w, h));
    else if (mode === 'ellipse') setMask(ellipseMask(dragStart, pt, w, h));
    else if (mode === 'lasso') { const pts = lassoPts; lassoPts = null; setMask(lassoMask(pts, w, h)); }
  }

  // ── Floating move ──────────────────────────────────────────────────────────
  // Lift the masked pixels off the base into pieceCanvas, punching a transparent
  // hole into a copy of the base (holedCanvas). Records baseMask = the hole position.
  function liftFloat() {
    const bc = document.createElement('canvas'); bc.width = mw; bc.height = mh;
    const bg = bc.getContext('2d', { willReadFrequently: true });
    bg.drawImage(img, 0, 0, mw, mh);
    const baseId = bg.getImageData(0, 0, mw, mh);
    pieceCanvas = document.createElement('canvas'); pieceCanvas.width = mw; pieceCanvas.height = mh;
    const pg = pieceCanvas.getContext('2d');
    const pieceId = pg.createImageData(mw, mh);
    for (let p = 0; p < mask.length; p++) {
      if (!mask[p]) continue;
      const i = p << 2;
      pieceId.data[i] = baseId.data[i]; pieceId.data[i + 1] = baseId.data[i + 1];
      pieceId.data[i + 2] = baseId.data[i + 2]; pieceId.data[i + 3] = baseId.data[i + 3];
      baseId.data[i + 3] = 0;   // punch the hole in the base copy
    }
    pg.putImageData(pieceId, 0, 0);
    bg.putImageData(baseId, 0, 0);
    holedCanvas = bc; baseMask = mask.slice();
    floating = true; floatDx = 0; floatDy = 0;
  }
  function startMove(e) {
    if (!mask) return;
    e.preventDefault();
    if (!floating) liftFloat();
    moving = true; moveStart = ptToCanvas(e);
    moveBaseDx = floatDx; moveBaseDy = floatDy;
    try { ov.setPointerCapture(e.pointerId); } catch { /* not all pointers capture */ }
    buildSelBuf(); paintAnts();   // show the lifted state immediately
  }
  function dragFloat(pt) { setFloatOffset(moveBaseDx + (pt.x - moveStart.x), moveBaseDy + (pt.y - moveStart.y)); }
  // Reposition the float; translate the mask so the ants + future tools track the piece.
  function setFloatOffset(dx, dy) {
    floatDx = dx; floatDy = dy;
    mask = translateMask(baseMask, mw, mh, floatDx, floatDy);
    buildSelBuf(); paintAnts();
  }
  // Bake the float into the image (one PNG commit). Leaves the mask at the new spot.
  function stampFloat() {
    if (!floating) return;
    const out = document.createElement('canvas'); out.width = mw; out.height = mh;
    const og = out.getContext('2d');
    og.drawImage(holedCanvas, 0, 0);
    og.drawImage(pieceCanvas, floatDx, floatDy);
    floating = false; holedCanvas = pieceCanvas = null; baseMask = null; floatDx = floatDy = 0;
    compose();
    onCommit?.(out);   // renderer: pushUndo + commit a PNG (keeps the transparent hole)
  }

  // Public nudge (arrow keys): move the floating PIXELS, or — outlineOnly — just the
  // selection outline over the image (pixels untouched), so you can reframe then colour.
  function nudge(dx, dy, outlineOnly) {
    if (!mask) return;
    if (outlineOnly) {
      if (floating) stampFloat();   // settle any float before sliding the outline
      baseMask = baseMask || mask;
      mask = translateMask(mask, mw, mh, dx, dy);
      buildSelBuf(); paintAnts();
      return;
    }
    if (!floating) liftFloat();
    setFloatOffset(floatDx + dx, floatDy + dy);
  }

  // Live rubber-band (rect or ellipse) drawn on the natural-res overlay.
  function drawRubberBand(a, b, kind) {
    octx.clearRect(0, 0, ov.width, ov.height);
    octx.strokeStyle = 'rgba(0,132,255,0.95)';
    octx.lineWidth = Math.max(1, ov.width / 320);
    octx.setLineDash([ov.width / 60, ov.width / 60]);
    octx.beginPath();
    if (kind === 'ellipse') {
      octx.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2);
    } else {
      octx.rect(Math.min(a.x, b.x) + 0.5, Math.min(a.y, b.y) + 0.5, Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    }
    octx.stroke();
    octx.setLineDash([]);
  }
  function drawLasso(pts) {
    octx.clearRect(0, 0, ov.width, ov.height);
    octx.strokeStyle = 'rgba(0,132,255,0.95)';
    octx.lineWidth = Math.max(1, ov.width / 320);
    octx.beginPath();
    pts.forEach((q, i) => (i ? octx.lineTo(q.x, q.y) : octx.moveTo(q.x, q.y)));
    octx.stroke();
  }

  // Install a computed mask (or clear the rubber-band if the gesture was too small).
  function setMask(res) {
    if (!res) { octx.clearRect(0, 0, ov.width, ov.height); return; }
    if (floating) stampFloat();   // a new selection bakes any pending float first
    mask = res.m; mw = res.w; mh = res.h;
    render();
    if (deselectBtn) deselectBtn.hidden = false;
  }

  // Cover exactly the displayed <img> box so click coords map 1:1 to image pixels.
  function syncOverlay() {
    if (!ov) return;
    ov.style.left = img.offsetLeft + 'px';
    ov.style.top = img.offsetTop + 'px';
    ov.style.width = img.offsetWidth + 'px';
    ov.style.height = img.offsetHeight + 'px';
  }

  function ptToCanvas(e) {
    const r = ov.getBoundingClientRect();
    const sx = ov.width / r.width, sy = ov.height / r.height;
    return { x: Math.round((e.clientX - r.left) * sx), y: Math.round((e.clientY - r.top) * sy) };
  }

  // Read the current image into a natural-res canvas and compute the region mask at
  // the clicked pixel using the shared fill tolerance/mode/perceptual options.
  function pickAt(e) {
    if (floating) stampFloat();   // a new wand pick bakes any pending float first
    const w = img.naturalWidth || 1, h = img.naturalHeight || 1;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    if (mime === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); }
    g.drawImage(img, 0, 0);
    const id = g.getImageData(0, 0, w, h);
    const pt = ptToCanvas(e);
    const o = getFillOpts?.() || {};
    const m = computeRegionMask(id.data, w, h, pt.x, pt.y, o.tol ?? 12, { mode: o.mode || 'seed', perceptual: !!o.perceptual });
    if (!m) return;
    mask = m; mw = w; mh = h;
    render();
    if (deselectBtn) deselectBtn.hidden = false;
  }

  // ── Overlay rendering ── tint + marching ants are drawn into an offscreen selCanvas
  // so compose() can layer them OVER the floating piece (drawImage blends; putImageData
  // would not). The interior tint is built once per mask shape; the boundary pixels
  // (edgeIdx) are recoloured each tick so the dotted outline crawls.
  function render() {
    ov.width = mw; ov.height = mh;            // resets + clears
    syncOverlay();
    selCanvas = document.createElement('canvas'); selCanvas.width = mw; selCanvas.height = mh;
    selCtx = selCanvas.getContext('2d');
    selBuf = selCtx.createImageData(mw, mh);
    buildSelBuf();
    paintAnts();        // synchronous first paint (tests + no-flash); then animate
    startAnts();
  }
  // Fill selBuf with the translucent interior tint and collect the boundary pixels.
  function buildSelBuf() {
    if (!selBuf) return;
    const d = selBuf.data; d.fill(0);
    const edges = [];
    for (let p = 0; p < mw * mh; p++) {
      if (!mask[p]) continue;
      const x = p % mw, y = (p / mw) | 0;
      const edge = x === 0 || y === 0 || x === mw - 1 || y === mh - 1
        || !mask[p - 1] || !mask[p + 1] || !mask[p - mw] || !mask[p + mw];
      if (edge) { edges.push(p); continue; }   // boundary painted by the ants pass
      const i = p << 2;
      d[i] = 0; d[i + 1] = 132; d[i + 2] = 255; d[i + 3] = 48;
    }
    edgeIdx = Int32Array.from(edges);
  }
  // Recolour the boundary with a phase-shifted black/white dash pattern, then compose.
  function paintAnts() {
    if (!selBuf || !edgeIdx || !selCtx) return;
    const d = selBuf.data, ph = antsPhase | 0;
    for (let k = 0; k < edgeIdx.length; k++) {
      const p = edgeIdx[k];
      const v = (((p % mw) + ((p / mw) | 0) + ph) & 7) < 4 ? 0 : 255;   // 4 on / 4 off, diagonal
      const i = p << 2;
      d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255;
    }
    selCtx.putImageData(selBuf, 0, 0);
    compose();
  }
  // Paint the overlay: the holed base + floating piece (when moving), then the selection.
  function compose() {
    if (!octx) return;
    octx.clearRect(0, 0, ov.width, ov.height);
    if (floating && holedCanvas) { octx.drawImage(holedCanvas, 0, 0); octx.drawImage(pieceCanvas, floatDx, floatDy); }
    if (selCanvas) octx.drawImage(selCanvas, 0, 0);
  }
  function startAnts() {
    stopAnts();
    const step = (t) => {
      if (!mask) { antsRAF = 0; return; }
      if (!dragging && !moving && t - antsLast > 80) { antsPhase = (antsPhase + 1) & 7; antsLast = t; paintAnts(); }
      antsRAF = requestAnimationFrame(step);
    };
    antsRAF = requestAnimationFrame(step);
  }
  function stopAnts() { if (antsRAF) cancelAnimationFrame(antsRAF); antsRAF = 0; }

  function setMode(m) {
    if (floating && m !== 'move') stampFloat();   // settle the float when leaving Move
    mode = m;
    // Only create the overlay when actually entering a select mode — NOT on a passive
    // deactivate (e.g. when a draw tool turns selection off). Creating it eagerly would
    // insert the selection <canvas> into the stage before the draw overlay and shift
    // which canvas is "first" for tools that grab `.imgv-stage canvas`.
    if (m) ensureOverlay();
    selectBtn.classList.toggle('active', m === 'wand');
    marqueeBtn?.classList.toggle('active', m === 'marquee');
    ellipseBtn?.classList.toggle('active', m === 'ellipse');
    lassoBtn?.classList.toggle('active', m === 'lasso');
    moveBtn?.classList.toggle('active', m === 'move');
    if (ov) { ov.style.pointerEvents = m ? 'auto' : 'none'; ov.style.cursor = m === 'move' ? 'move' : m ? 'crosshair' : ''; }
    if (m) onActivate?.();
  }
  // Renderer compat: a draw tool turning selection off calls setActive(false).
  function setActive(on) { setMode(on ? 'wand' : null); }

  // Clear the selection WITHOUT committing (geometry invalidation / internal). Any
  // in-flight float is discarded (it was never baked into the image).
  function clear() {
    stopAnts();
    mask = null; mw = mh = 0; selBuf = null; edgeIdx = null; selCanvas = null; selCtx = null;
    floating = false; holedCanvas = pieceCanvas = null; baseMask = null; floatDx = floatDy = 0;
    if (octx) octx.clearRect(0, 0, ov.width, ov.height);
    if (deselectBtn) deselectBtn.hidden = true;
  }
  // Deselect button: bake a pending float first, then drop the selection.
  function deselect() { if (floating) stampFloat(); clear(); }

  // Copy the selected pixels to a tight, masked canvas (transparent outside the mask),
  // cropped to the selection's bounding box. Reads the live floating piece if mid-move,
  // else the committed image. Returns null when there's no selection. Non-destructive.
  function copySelection() {
    if (!mask) return null;
    let x0 = mw, y0 = mh, x1 = -1, y1 = -1;
    for (let p = 0; p < mask.length; p++) {
      if (!mask[p]) continue;
      const x = p % mw, y = (p / mw) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    if (x1 < x0) return null;
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    const sc = document.createElement('canvas'); sc.width = mw; sc.height = mh;
    const sg = sc.getContext('2d', { willReadFrequently: true });
    if (floating && holedCanvas) { sg.drawImage(holedCanvas, 0, 0); sg.drawImage(pieceCanvas, floatDx, floatDy); }
    else sg.drawImage(img, 0, 0, mw, mh);
    const sid = sg.getImageData(0, 0, mw, mh).data;
    const out = document.createElement('canvas'); out.width = bw; out.height = bh;
    const og = out.getContext('2d');
    const oid = og.createImageData(bw, bh);
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      const sp = (y + y0) * mw + (x + x0);
      if (!mask[sp]) continue;
      const si = sp << 2, oi = (y * bw + x) << 2;
      oid.data[oi] = sid[si]; oid.data[oi + 1] = sid[si + 1]; oid.data[oi + 2] = sid[si + 2]; oid.data[oi + 3] = sid[si + 3];
    }
    og.putImageData(oid, 0, 0);
    return out;
  }

  // Invert the current selection (select the complement). No-op without a mask.
  function invert() {
    if (!mask) return;
    if (floating) stampFloat();
    for (let p = 0; p < mask.length; p++) mask[p] = mask[p] ? 0 : 1;
    baseMask = null;
    buildSelBuf(); paintAnts();
  }

  // Clip a fill result (ImageData byte arrays) to the selection: `editedData` keeps
  // its new values only inside the mask, restoring `beforeData` outside. No-op when
  // there's no selection or the dimensions don't match.
  function clipFillInPlace(editedData, beforeData) {
    if (!mask || editedData.length !== mask.length << 2) return;
    clipToBase(editedData, beforeData, mask);
  }

  // Clip a finished edit canvas to the selection, restoring pixels outside the mask
  // from the pre-edit base image. Used by pencil/eraser strokes. No-op when no selection.
  async function clipCanvas(canvas, baseImg) {
    if (!mask || canvas.width !== mw || canvas.height !== mh) return;
    const g = canvas.getContext('2d');
    const ed = g.getImageData(0, 0, mw, mh);
    const bc = document.createElement('canvas'); bc.width = mw; bc.height = mh;
    const bg = bc.getContext('2d', { willReadFrequently: true });
    bg.drawImage(baseImg, 0, 0, mw, mh);
    const base = bg.getImageData(0, 0, mw, mh).data;
    clipToBase(ed.data, base, mask);
    g.putImageData(ed, 0, 0);
  }

  selectBtn.addEventListener('click', () => setMode(mode === 'wand' ? null : 'wand'));
  marqueeBtn?.addEventListener('click', () => setMode(mode === 'marquee' ? null : 'marquee'));
  ellipseBtn?.addEventListener('click', () => setMode(mode === 'ellipse' ? null : 'ellipse'));
  lassoBtn?.addEventListener('click', () => setMode(mode === 'lasso' ? null : 'lasso'));
  moveBtn?.addEventListener('click', () => setMode(mode === 'move' ? null : 'move'));
  deselectBtn?.addEventListener('click', deselect);

  return {
    isActive: () => mode !== null,
    hasSelection: () => !!mask,
    getMask: () => (mask ? { data: mask, w: mw, h: mh } : null),
    setActive, setMode, toggle: () => setMode(mode ? null : 'wand'),
    clipFillInPlace, clipCanvas, invert, nudge, copySelection,
    clear, syncOverlay,
    teardown() { stopAnts(); ov?.remove(); ov = null; octx = null; mask = null; selBuf = null; edgeIdx = null; selCanvas = null; selCtx = null; holedCanvas = pieceCanvas = baseMask = null; },
  };
}
