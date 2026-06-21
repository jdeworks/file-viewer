// Compare overlay for the image viewer: original vs. current (edited) image.
// Lazy-loaded by renderer.js so the renderer stays thin. Three modes:
//   • split   — side by side (Original | Current)
//   • overlay — both stacked, independent opacity sliders to eyeball differences
//   • diff    — highlight changed regions (configurable colour/opacity, a min
//               per-pixel difference, a spread/dilation radius so single-pixel
//               noise becomes visible, and an optional outline)
//
// DOM-free apart from canvases + the overlay it builds inside the stage. The
// caller passes the two blob URLs and an onClose callback.

const DIFF_DEFAULTS = { color: '#ffff00', opacity: 0.25, minDiff: 24, spread: 1, outline: false };
const MAX_DIFF_DIM = 1400; // cap the diff working resolution for responsiveness

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return [255, 255, 0];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
}

// Box dilation (separable, O(n·r)) — grows the changed-pixel mask by `r` px so
// scattered single-pixel diffs become legible blobs.
function dilate(mask, w, h, r) {
  if (r <= 0) return mask;
  const tmp = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let on = 0;
      for (let k = -r; k <= r && !on; k++) { const xx = x + k; if (xx >= 0 && xx < w && mask[row + xx]) on = 1; }
      tmp[row + x] = on;
    }
  }
  const out = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let on = 0;
      for (let k = -r; k <= r && !on; k++) { const yy = y + k; if (yy >= 0 && yy < h && tmp[yy * w + x]) on = 1; }
      out[y * w + x] = on;
    }
  }
  return out;
}

/**
 * @param {HTMLElement} stage  the .imgv-stage to mount into
 * @param {{originalUrl:string,currentUrl:string,onClose:()=>void}} opts
 * @returns {{destroy():void}}
 */
export function mountCompare(stage, opts) {
  const { originalUrl, currentUrl } = opts;
  const root = document.createElement('div');
  root.className = 'imgv-compare-view';
  root.innerHTML = `
    <div class="imgv-cmp-bar">
      <button class="imgv-cmp-mode active" data-mode="split">Split</button>
      <button class="imgv-cmp-mode" data-mode="overlay">Overlay</button>
      <button class="imgv-cmp-mode" data-mode="diff">Diff</button>
      <span class="imgv-cmp-controls"></span>
      <button class="imgv-cmp-close" title="Close compare">✕ Close</button>
    </div>
    <div class="imgv-cmp-stage"></div>`;
  stage.appendChild(root);

  const q = (s) => root.querySelector(s);
  const controls = q('.imgv-cmp-controls');
  const body = q('.imgv-cmp-stage');
  let mode = 'split';
  const diff = { ...DIFF_DEFAULTS };
  // Cache decoded images + the last diff highlight so re-renders are cheap.
  let imgs = null;            // { orig, cur }
  let diffCache = null;       // { key, canvas }

  async function ensureImages() {
    if (imgs) return imgs;
    const [orig, cur] = await Promise.all([loadImage(originalUrl), loadImage(currentUrl)]);
    imgs = { orig, cur };
    return imgs;
  }

  function setMode(m) {
    mode = m;
    root.querySelectorAll('.imgv-cmp-mode').forEach((b) => b.classList.toggle('active', b.dataset.mode === m));
    render();
  }

  function render() {
    if (mode === 'split') return renderSplit();
    if (mode === 'overlay') return renderOverlay();
    return renderDiff();
  }

  function renderSplit() {
    controls.innerHTML = '';
    body.innerHTML = `
      <figure><figcaption>Original</figcaption><img src="${originalUrl}"></figure>
      <figure><figcaption>Current</figcaption><img src="${currentUrl}"></figure>`;
    body.className = 'imgv-cmp-stage imgv-cmp-split';
  }

  function renderOverlay() {
    body.className = 'imgv-cmp-stage imgv-cmp-overlay';
    body.innerHTML = `
      <div class="imgv-cmp-stack">
        <img class="imgv-cmp-base" src="${originalUrl}">
        <img class="imgv-cmp-top" src="${currentUrl}">
      </div>`;
    controls.innerHTML = `
      <label>Original <input type="range" class="imgv-cmp-op-o" min="0" max="100" value="100"></label>
      <label>Current <input type="range" class="imgv-cmp-op-c" min="0" max="100" value="60"></label>`;
    const base = body.querySelector('.imgv-cmp-base');
    const top = body.querySelector('.imgv-cmp-top');
    top.style.opacity = '0.6';
    q('.imgv-cmp-op-o').addEventListener('input', (e) => { base.style.opacity = e.target.value / 100; });
    q('.imgv-cmp-op-c').addEventListener('input', (e) => { top.style.opacity = e.target.value / 100; });
  }

  async function renderDiff() {
    body.className = 'imgv-cmp-stage imgv-cmp-diff';
    controls.innerHTML = `
      <label>Diff <input type="color" class="imgv-cmp-d-color" value="${diff.color}"></label>
      <label>Opacity <input type="range" class="imgv-cmp-d-op" min="0" max="100" value="${Math.round(diff.opacity * 100)}"></label>
      <label title="Ignore differences smaller than this per-pixel">Min Δ <input type="range" class="imgv-cmp-d-min" min="0" max="128" value="${diff.minDiff}"></label>
      <label title="Grow highlighted areas so single-pixel diffs are visible">Spread <input type="range" class="imgv-cmp-d-spread" min="0" max="8" value="${diff.spread}"></label>
      <label title="Outline changed regions instead of filling"><input type="checkbox" class="imgv-cmp-d-outline" ${diff.outline ? 'checked' : ''}> Outline</label>`;
    q('.imgv-cmp-d-color').addEventListener('input', (e) => { diff.color = e.target.value; diffCache = null; paintDiff(); });
    q('.imgv-cmp-d-op').addEventListener('input', (e) => { diff.opacity = e.target.value / 100; diffCache = null; paintDiff(); });
    q('.imgv-cmp-d-min').addEventListener('input', (e) => { diff.minDiff = +e.target.value; diffCache = null; paintDiff(); });
    q('.imgv-cmp-d-spread').addEventListener('input', (e) => { diff.spread = +e.target.value; diffCache = null; paintDiff(); });
    q('.imgv-cmp-d-outline').addEventListener('change', (e) => { diff.outline = e.target.checked; diffCache = null; paintDiff(); });
    body.innerHTML = '<div class="imgv-cmp-loading">Computing diff…</div>';
    await paintDiff();
  }

  async function paintDiff() {
    const { orig, cur } = await ensureImages();
    // Compare at a common, capped resolution (original's aspect).
    const ow = orig.naturalWidth || cur.naturalWidth, oh = orig.naturalHeight || cur.naturalHeight;
    const scale = Math.min(1, MAX_DIFF_DIM / Math.max(ow, oh));
    const w = Math.max(1, Math.round(ow * scale)), h = Math.max(1, Math.round(oh * scale));
    const a = drawTo(orig, w, h), b = drawTo(cur, w, h);
    const da = a.getContext('2d').getImageData(0, 0, w, h).data;
    const db = b.getContext('2d').getImageData(0, 0, w, h).data;
    let mask = new Uint8Array(w * h);
    for (let p = 0, i = 0; p < mask.length; p++, i += 4) {
      const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]), Math.abs(da[i + 3] - db[i + 3]));
      if (d > diff.minDiff) mask[p] = 1;
    }
    mask = dilate(mask, w, h, diff.spread);
    if (diff.outline) mask = edgesOf(mask, w, h);
    const [r, g, bl] = hexToRgb(diff.color);
    const al = Math.round((diff.outline ? Math.max(0.6, diff.opacity) : diff.opacity) * 255);
    const out = b.getContext('2d').createImageData(w, h);
    for (let p = 0, i = 0; p < mask.length; p++, i += 4) {
      if (mask[p]) { out.data[i] = r; out.data[i + 1] = g; out.data[i + 2] = bl; out.data[i + 3] = al; }
    }
    const hl = document.createElement('canvas'); hl.width = w; hl.height = h;
    hl.getContext('2d').putImageData(out, 0, 0);
    const changed = mask.reduce((s, v) => s + v, 0);
    body.innerHTML = '';
    const stack = document.createElement('div'); stack.className = 'imgv-cmp-stack';
    const baseImg = document.createElement('img'); baseImg.className = 'imgv-cmp-base'; baseImg.src = currentUrl;
    hl.className = 'imgv-cmp-top';
    stack.append(baseImg, hl);
    const note = document.createElement('div'); note.className = 'imgv-cmp-note';
    note.textContent = changed ? `${((changed / mask.length) * 100).toFixed(2)}% of pixels differ` : 'No differences above the threshold';
    body.append(stack, note);
  }

  function drawTo(im, w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = true;
    g.drawImage(im, 0, 0, w, h);
    return c;
  }
  // Boundary pixels of the mask (in-mask px with an out-of-mask 4-neighbour).
  function edgesOf(mask, w, h) {
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (!mask[p]) continue;
        if (x === 0 || x === w - 1 || y === 0 || y === h - 1
          || !mask[p - 1] || !mask[p + 1] || !mask[p - w] || !mask[p + w]) out[p] = 1;
      }
    }
    return out;
  }

  root.querySelectorAll('.imgv-cmp-mode').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  q('.imgv-cmp-close').addEventListener('click', () => opts.onClose?.());
  renderSplit();

  return { destroy() { root.remove(); } };
}
