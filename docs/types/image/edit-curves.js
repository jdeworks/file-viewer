// Tone-curve tool — a draggable curve over a small square canvas remaps the image
// tones. Control points (input→output) drive a monotone spline (curves.js) sampled to a
// 256-LUT, applied to R/G/B via the shared applyLevels. Lifecycle mirrors Levels
// (edit-filters.js): cache the source pixels on open, preview by swapping img.src to a
// processed blob (rAF-coalesced so dragging stays smooth), commit the canvas on Apply.
import { buildCurveLUT } from './curves.js';
import { applyLevels } from './levels.js';

export function mountCurves({ img, mime, core, els }) {
  const { curvesBtn, curvesPanel, curveCanvas, curveApply, curveReset, curveCancel } = els;
  if (!curvesBtn || !curveCanvas) return { teardown() {} };

  const g = curveCanvas.getContext('2d');
  const W = curveCanvas.width, H = curveCanvas.height;
  const identity = () => [{ x: 0, y: 0 }, { x: 255, y: 255 }];
  let points = identity();
  let src = null, sw = 0, sh = 0, openSrc = null, prevUrl = null, raf = 0, drag = -1;

  // ── curve-domain (0..255, y-up) ↔ canvas-pixel mapping ──
  const toCanvas = (p) => ({ cx: (p.x / 255) * W, cy: (1 - p.y / 255) * H });
  const fromEvent = (e) => {
    const r = curveCanvas.getBoundingClientRect();
    const cx = (e.clientX - r.left) * (W / r.width), cy = (e.clientY - r.top) * (H / r.height);
    return { x: Math.max(0, Math.min(255, (cx / W) * 255)), y: Math.max(0, Math.min(255, (1 - cy / H) * 255)) };
  };

  function draw() {
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#1c1c1c'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#3a3a3a'; g.lineWidth = 1;
    for (let i = 1; i < 4; i++) {                         // quarter grid
      const gx = (i / 4) * W, gy = (i / 4) * H;
      g.beginPath(); g.moveTo(gx, 0); g.lineTo(gx, H); g.moveTo(0, gy); g.lineTo(W, gy); g.stroke();
    }
    g.strokeStyle = '#555'; g.beginPath(); g.moveTo(0, H); g.lineTo(W, 0); g.stroke();   // diagonal ref
    const lut = buildCurveLUT(points);                    // the curve itself
    g.strokeStyle = '#6cf'; g.lineWidth = 2; g.beginPath();
    for (let x = 0; x < 256; x++) {
      const px = (x / 255) * W, py = (1 - lut[x] / 255) * H;
      x ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.stroke();
    g.fillStyle = '#fff';                                 // handles
    for (const p of points) { const { cx, cy } = toCanvas(p); g.beginPath(); g.arc(cx, cy, 4, 0, 7); g.fill(); }
  }

  function preview() {
    if (raf || !src) return;
    raf = requestAnimationFrame(() => {
      raf = 0; if (!src) return;
      const lut = buildCurveLUT(points);
      const out = new ImageData(new Uint8ClampedArray(src.data), sw, sh);
      applyLevels(out.data, lut);
      const c = document.createElement('canvas'); c.width = sw; c.height = sh;
      c.getContext('2d').putImageData(out, 0, 0);
      c.toBlob((blob) => {
        if (!blob || !src) return;
        const u = URL.createObjectURL(blob);
        if (prevUrl) URL.revokeObjectURL(prevUrl);
        prevUrl = u; img.src = u;
      }, mime === 'image/jpeg' ? 'image/jpeg' : 'image/png');
    });
  }

  // Nearest handle within the hit radius, or -1.
  function hit(pt) {
    let best = -1, bd = 12 * 12;
    const a = toCanvas(pt);
    points.forEach((p, i) => { const b = toCanvas(p); const d = (a.cx - b.cx) ** 2 + (a.cy - b.cy) ** 2; if (d < bd) { bd = d; best = i; } });
    return best;
  }

  curveCanvas.addEventListener('pointerdown', (e) => {
    if (!src) return;
    const pt = fromEvent(e);
    let i = hit(pt);
    if (i < 0) {                                          // empty space → insert a new handle
      points.push({ x: Math.round(pt.x), y: Math.round(pt.y) });
      points.sort((a, b) => a.x - b.x);
      i = points.findIndex((p) => p.x === Math.round(pt.x));
    }
    drag = i; curveCanvas.setPointerCapture(e.pointerId); draw(); preview();
  });
  curveCanvas.addEventListener('pointermove', (e) => {
    if (drag < 0) return;
    const pt = fromEvent(e), last = points.length - 1, p = points[drag];
    p.y = Math.round(pt.y);
    if (drag === 0) p.x = 0;                              // endpoints keep x pinned
    else if (drag === last) p.x = 255;
    else {                                                // interior x stays strictly between neighbours
      const lo = points[drag - 1].x + 1, hi = points[drag + 1].x - 1;
      p.x = Math.max(lo, Math.min(hi, Math.round(pt.x)));
    }
    draw(); preview();
  });
  const endDrag = () => { drag = -1; };
  curveCanvas.addEventListener('pointerup', endDrag);
  curveCanvas.addEventListener('pointercancel', endDrag);
  curveCanvas.addEventListener('dblclick', (e) => {       // remove an interior handle
    const i = hit(fromEvent(e));
    if (i > 0 && i < points.length - 1) { points.splice(i, 1); draw(); preview(); }
  });

  function close(applied) {
    if (curvesPanel) curvesPanel.hidden = true;
    if (prevUrl) { URL.revokeObjectURL(prevUrl); prevUrl = null; }
    if (!applied && openSrc) img.src = openSrc;           // restore the pre-curve image
    src = null; curvesBtn.classList.remove('active');
  }

  curvesBtn.addEventListener('click', async () => {
    if (!curvesPanel) return;
    if (!curvesPanel.hidden) { close(false); return; }
    const base = await core.loadBase();
    sw = base.naturalWidth; sh = base.naturalHeight;
    const c = document.createElement('canvas'); c.width = sw; c.height = sh;
    const cx = c.getContext('2d', { willReadFrequently: true });
    if (mime === 'image/jpeg') { cx.fillStyle = '#fff'; cx.fillRect(0, 0, sw, sh); }
    cx.drawImage(base, 0, 0);
    src = cx.getImageData(0, 0, sw, sh);
    openSrc = img.src; points = identity();
    curvesPanel.hidden = false; curvesBtn.classList.add('active'); draw();
  });
  curveReset?.addEventListener('click', () => { points = identity(); draw(); preview(); });
  curveCancel?.addEventListener('click', () => close(false));
  curveApply?.addEventListener('click', async () => {
    if (!src) return;
    const lut = buildCurveLUT(points);
    const out = new ImageData(new Uint8ClampedArray(src.data), sw, sh);
    applyLevels(out.data, lut);
    const c = document.createElement('canvas'); c.width = sw; c.height = sh;
    c.getContext('2d').putImageData(out, 0, 0);
    core.pushUndo();
    await core.commitCanvas(c);
    close(true);
  });

  return { teardown() { if (prevUrl) URL.revokeObjectURL(prevUrl); } };
}
