// Magic-wand selection — click a region to build a pixel MASK (reusing the same
// connected-region walk the bucket fill uses: fill.js computeRegionMask, with the
// shared tolerance / mode / perceptual options). While a selection is active the
// pixel tools (pencil / eraser / fill) only "take" inside it — the renderer clips
// their output to the mask via clipToBase. The selection is shown as a translucent
// tint + a solid boundary outline on its own overlay canvas over the image.
//
// The mask is kept at NATURAL resolution (matching the edit canvases); the overlay
// canvas is natural-res and CSS-scaled to the displayed image box, like the draw
// overlay. A dimension-changing geometry op invalidates it (renderer calls clear()).
import { computeRegionMask, clipToBase } from './fill.js';

export function mountSelection({ host, img, mime, els, getFillOpts, onActivate }) {
  const { selectBtn, deselectBtn } = els;
  if (!selectBtn) return { isActive: () => false, hasSelection: () => false, getMask: () => null, clipFillInPlace() {}, async clipCanvas() {}, toggle() {}, setActive() {}, clear() {}, syncOverlay() {}, teardown() {} };

  const stage = host.querySelector('.imgv-stage');
  let selectMode = false;
  let mask = null, mw = 0, mh = 0;   // current selection mask (natural res) + its dims
  let ov = null, octx = null;

  function ensureOverlay() {
    if (ov) return;
    stage.style.position = 'relative';
    ov = document.createElement('canvas');
    ov.className = 'imgv-sel-overlay';
    ov.style.cssText = 'position:absolute;pointer-events:none;touch-action:none;z-index:4;';
    octx = ov.getContext('2d');
    stage.appendChild(ov);
    ov.addEventListener('pointerdown', (e) => { if (selectMode) { e.preventDefault(); pickAt(e); } });
    syncOverlay();
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

  function setActive(on) {
    selectMode = on;
    // Only create the overlay when actually entering wand mode — NOT on a passive
    // deactivate (e.g. when a draw tool turns the wand off). Creating it eagerly would
    // insert the selection <canvas> into the stage before the draw overlay and shift
    // which canvas is "first" for tools that grab `.imgv-stage canvas`.
    if (on) ensureOverlay();
    selectBtn.classList.toggle('active', on);
    if (ov) { ov.style.pointerEvents = on ? 'auto' : 'none'; ov.style.cursor = on ? 'crosshair' : ''; }
    if (on) onActivate?.();
  }

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

  selectBtn.addEventListener('click', () => setActive(!selectMode));
  deselectBtn?.addEventListener('click', clear);

  return {
    isActive: () => selectMode,
    hasSelection: () => !!mask,
    getMask: () => (mask ? { data: mask, w: mw, h: mh } : null),
    setActive, toggle: () => setActive(!selectMode),
    clipFillInPlace, clipCanvas,
    clear, syncOverlay,
    teardown() { ov?.remove(); ov = null; octx = null; mask = null; },
  };
}
