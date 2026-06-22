// Pixel selection — build a MASK two ways: the magic WAND (click a region; reuses
// fill.js computeRegionMask with the shared tolerance/mode/perceptual options) or a
// rectangular MARQUEE (drag a box). While a selection is active the pixel tools
// (pencil / eraser / fill) only "take" inside it — the renderer clips their output to
// the mask via clipToBase. The selection shows as a translucent tint + boundary
// outline on its own overlay canvas over the image.
//
// The mask is kept at NATURAL resolution (matching the edit canvases); the overlay
// canvas is natural-res and CSS-scaled to the displayed image box, like the draw
// overlay. A dimension-changing geometry op invalidates it (renderer calls clear()).
import { computeRegionMask, clipToBase } from './fill.js';

export function mountSelection({ host, img, mime, els, getFillOpts, onActivate }) {
  const { selectBtn, marqueeBtn, ellipseBtn, lassoBtn, deselectBtn } = els;
  if (!selectBtn) return { isActive: () => false, hasSelection: () => false, getMask: () => null, clipFillInPlace() {}, async clipCanvas() {}, toggle() {}, setActive() {}, setMode() {}, clear() {}, syncOverlay() {}, teardown() {} };

  const stage = host.querySelector('.imgv-stage');
  let mode = null;                   // null | 'wand' | 'marquee' | 'ellipse' | 'lasso'
  let mask = null, mw = 0, mh = 0;   // current selection mask (natural res) + its dims
  let ov = null, octx = null;
  let dragging = false, dragStart = null, lassoPts = null;   // rubber-band / freehand drag

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
    if (!isDrag(mode)) return;
    e.preventDefault();
    ov.width = img.naturalWidth || 1; ov.height = img.naturalHeight || 1;   // natural-res drawing surface (clears)
    syncOverlay();
    dragging = true; dragStart = ptToCanvas(e);
    if (mode === 'lasso') lassoPts = [dragStart];
    try { ov.setPointerCapture(e.pointerId); } catch { /* not all pointers capture */ }
  }
  function onMove(e) {
    if (!dragging) return;
    e.preventDefault();
    const pt = ptToCanvas(e);
    if (mode === 'lasso') { lassoPts.push(pt); drawLasso(lassoPts); }
    else drawRubberBand(dragStart, pt, mode);
  }
  function onUp(e) {
    if (!dragging) return;
    dragging = false;
    const pt = ptToCanvas(e);
    if (mode === 'marquee') setMask(rectMask(dragStart, pt));
    else if (mode === 'ellipse') setMask(ellipseMask(dragStart, pt));
    else if (mode === 'lasso') { const pts = lassoPts; lassoPts = null; setMask(lassoMask(pts)); }
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
    mask = res.m; mw = res.w; mh = res.h;
    render();
    if (deselectBtn) deselectBtn.hidden = false;
  }

  // Rectangle mask (fast loop). Ellipse/lasso rasterize a canvas path instead.
  function rectMask(a, b) {
    const w = img.naturalWidth || 1, h = img.naturalHeight || 1;
    const x0 = Math.max(0, Math.min(w, Math.min(a.x, b.x))), x1 = Math.max(0, Math.min(w, Math.max(a.x, b.x)));
    const y0 = Math.max(0, Math.min(h, Math.min(a.y, b.y))), y1 = Math.max(0, Math.min(h, Math.max(a.y, b.y)));
    if (x1 - x0 < 2 || y1 - y0 < 2) return null;
    const m = new Uint8Array(w * h);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) m[y * w + x] = 1;
    return { m, w, h };
  }
  // Rasterize a filled path to a mask (alpha > half = inside). Shared by ellipse + lasso.
  function maskFromPath(draw) {
    const w = img.naturalWidth || 1, h = img.naturalHeight || 1;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#fff'; g.beginPath();
    draw(g);
    g.fill();
    const d = g.getImageData(0, 0, w, h).data;
    const m = new Uint8Array(w * h);
    let any = false;
    for (let p = 0; p < w * h; p++) if (d[(p << 2) + 3] > 127) { m[p] = 1; any = true; }
    return any ? { m, w, h } : null;
  }
  function ellipseMask(a, b) {
    const rx = Math.abs(b.x - a.x) / 2, ry = Math.abs(b.y - a.y) / 2;
    if (rx < 1 || ry < 1) return null;
    return maskFromPath((g) => g.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, rx, ry, 0, 0, Math.PI * 2));
  }
  function lassoMask(pts) {
    if (!pts || pts.length < 3) return null;
    return maskFromPath((g) => { pts.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); g.closePath(); });
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

  // Translucent tint over the selected region + a solid 1px boundary outline.
  function render() {
    ov.width = mw; ov.height = mh;            // resets + clears
    syncOverlay();
    const out = octx.createImageData(mw, mh);
    const d = out.data;
    for (let p = 0; p < mw * mh; p++) {
      if (!mask[p]) continue;
      const x = p % mw, y = (p / mw) | 0;
      const edge = x === 0 || y === 0 || x === mw - 1 || y === mh - 1
        || !mask[p - 1] || !mask[p + 1] || !mask[p - mw] || !mask[p + mw];
      const i = p << 2;
      d[i] = 0; d[i + 1] = 132; d[i + 2] = 255;
      d[i + 3] = edge ? 235 : 48;
    }
    octx.putImageData(out, 0, 0);
  }

  function setMode(m) {
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
    if (ov) { ov.style.pointerEvents = m ? 'auto' : 'none'; ov.style.cursor = m ? 'crosshair' : ''; }
    if (m) onActivate?.();
  }
  // Renderer compat: a draw tool turning selection off calls setActive(false).
  function setActive(on) { setMode(on ? 'wand' : null); }

  function clear() {
    mask = null; mw = mh = 0;
    if (octx) octx.clearRect(0, 0, ov.width, ov.height);
    if (deselectBtn) deselectBtn.hidden = true;
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
  deselectBtn?.addEventListener('click', clear);

  return {
    isActive: () => mode !== null,
    hasSelection: () => !!mask,
    getMask: () => (mask ? { data: mask, w: mw, h: mh } : null),
    setActive, setMode, toggle: () => setMode(mode ? null : 'wand'),
    clipFillInPlace, clipCanvas,
    clear, syncOverlay,
    teardown() { ov?.remove(); ov = null; octx = null; mask = null; },
  };
}
