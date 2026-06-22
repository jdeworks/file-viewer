// Pure pixel-flood helpers for the image editor — no DOM, no closure state, so
// they live here (independently unit-testable) instead of inside renderer.js.
// Two distinct fills:
//   • floodFill   — the 🪣 bucket: paints a region a solid colour (in place).
//   • bgFloodFill — ✂ background removal: makes a region transparent.

// Parse "#rrggbb" → [r,g,b,255]. Defaults to red on bad input.
export function hexToRgba(hex) {
  const h = (hex || '#ff0000').replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255];
}

// Luminance (Rec.601) of an RGBA pixel at byte offset i.
function lumAt(src, i) { return 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2]; }

// Sobel gradient-magnitude map (one float per pixel) over luminance. High values
// mark edges. Border pixels sample with clamped (replicated-edge) coordinates so
// they get a real gradient too — otherwise a fill could leak around the image
// border between two regions that are separated by an edge in the interior.
function sobelMag(src, w, h) {
  const lum = new Float32Array(w * h);
  for (let p = 0; p < w * h; p++) lum[p] = lumAt(src, p << 2);
  const clamp = (v, max) => (v < 0 ? 0 : v > max ? max : v);
  const L = (x, y) => lum[clamp(y, h - 1) * w + clamp(x, w - 1)];
  const mag = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const gx = (L(x + 1, y - 1) + 2 * L(x + 1, y) + L(x + 1, y + 1)) - (L(x - 1, y - 1) + 2 * L(x - 1, y) + L(x - 1, y + 1));
    const gy = (L(x - 1, y + 1) + 2 * L(x, y + 1) + L(x + 1, y + 1)) - (L(x - 1, y - 1) + 2 * L(x, y - 1) + L(x + 1, y - 1));
    mag[y * w + x] = Math.sqrt(gx * gx + gy * gy);
  }
  return mag;
}

// Write the fill colour into `data` for every pixel in `mask`. With `feather`, the
// fill's OUTER boundary is anti-aliased: masked pixels stay fully filled (the
// interior is never hollowed), while each unmasked pixel adjacent to the mask gets
// a partial blend equal to the fraction of its 3×3 neighbourhood that is masked —
// a soft 1px halo instead of a hard staircase edge.
function applyFill(data, mask, w, h, fill, feather) {
  if (!feather) {
    for (let p = 0; p < w * h; p++) if (mask[p]) { const i = p << 2; data[i] = fill[0]; data[i + 1] = fill[1]; data[i + 2] = fill[2]; data[i + 3] = fill[3]; }
    return;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let cov;
    if (mask[y * w + x]) {
      cov = 1;
    } else {
      let c = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        n++; if (mask[yy * w + xx]) c++;
      }
      cov = n ? c / n : 0;
    }
    if (cov <= 0) continue;
    const i = (y * w + x) << 2;
    data[i] = Math.round(data[i] * (1 - cov) + fill[0] * cov);
    data[i + 1] = Math.round(data[i + 1] * (1 - cov) + fill[1] * cov);
    data[i + 2] = Math.round(data[i + 2] * (1 - cov) + fill[2] * cov);
    if (cov >= 1) data[i + 3] = fill[3];
  }
}

// Flood-fill bucket. `tol` (0–255) is the slider value; `opts` selects behaviour:
//   mode:'seed'   — compare each pixel to the CLICKED pixel (default; stable, no drift).
//   mode:'shade'  — compare to the NEIGHBOUR it spread from (flows across smooth shading).
//   mode:'region' — ignore colour; spread until a Sobel EDGE stops it. `tol` becomes
//                   edge sensitivity (higher = only strong edges halt the fill). The
//                   "magic wand that respects boundaries" — good for photos.
//   perceptual:true — use luminance-weighted ("redmean") colour distance instead of
//                   plain RGB, normalised so a neutral-grey diff matches the RGB scale.
//   feather:true  — anti-alias the fill boundary (see applyFill).
// A boolean `opts` is accepted for back-compat (true → 'shade', false → 'seed').
// Mutates `data` in place; returns the number of pixels filled.
export function floodFill(data, w, h, x0, y0, fill, tol, opts = {}) {
  if (typeof opts === 'boolean') opts = { mode: opts ? 'shade' : 'seed' };
  const { mode = 'seed', perceptual = false, feather = false } = opts;
  if (x0 < 0 || y0 < 0 || x0 >= w || y0 >= h) return 0;
  const src = Uint8ClampedArray.from(data);
  const idx = (x, y) => y * w + x;
  const at = (x, y) => idx(x, y) << 2;
  const tol2 = tol * tol;

  // Colour distance² from src pixel `i` to (r,g,b). Euclidean, or redmean when
  // perceptual — divided by 3 so a neutral-grey difference equals the RGB scale,
  // keeping the tolerance slider's meaning the same on greys.
  const dist2 = perceptual
    ? (i, r, g, b) => { const rr = (src[i] + r) * 0.5, dr = src[i] - r, dg = src[i + 1] - g, db = src[i + 2] - b; return ((2 + rr / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rr) / 256) * db * db) / 3; }
    : (i, r, g, b) => { const dr = src[i] - r, dg = src[i + 1] - g, db = src[i + 2] - b; return dr * dr + dg * dg + db * db; };

  const sobel = mode === 'region' ? sobelMag(src, w, h) : null;
  const edgeTol = tol * 4;   // slider 0–255 → 0–1020 covers Sobel's full range
  const seed = at(x0, y0);
  const sr = src[seed], sg = src[seed + 1], sb = src[seed + 2];
  const accept = (nx, ny, fromI) => {
    if (mode === 'region') return sobel[idx(nx, ny)] <= edgeTol;
    const ni = at(nx, ny);
    if (mode === 'shade') return dist2(ni, src[fromI], src[fromI + 1], src[fromI + 2]) <= tol2;
    return dist2(ni, sr, sg, sb) <= tol2;
  };

  const seen = new Uint8Array(w * h);
  const st = [x0 | 0, y0 | 0]; seen[idx(x0, y0)] = 1;
  let cnt = 0;
  while (st.length) {
    const y = st.pop(), x = st.pop();
    cnt++;
    const fromI = at(x, y);
    const nb = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    for (let k = 0; k < 4; k++) {
      const nx = nb[k][0], ny = nb[k][1];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const p = idx(nx, ny); if (seen[p]) continue;
      if (accept(nx, ny, fromI)) { seen[p] = 1; st.push(nx, ny); }
    }
  }
  applyFill(data, seen, w, h, fill, feather);
  return cnt;
}

// Background-removal flood: from the seed pixel, make every connected pixel whose
// colour is within `tol` (0–80 UI scale) transparent. Returns a new RGBA byte
// array (Uint8ClampedArray) the caller wraps in an ImageData. Does not mutate
// the source.
export function bgFloodFill(srcData, w, h, sx, sy, tol) {
  const threshold = tol * 4.42;
  const dst = new Uint8ClampedArray(srcData.data);
  const si = (sy * w + sx) * 4;
  const r0 = dst[si], g0 = dst[si + 1], b0 = dst[si + 2];
  const visited = new Uint8Array(w * h);
  const stack = [sy * w + sx];
  while (stack.length) {
    const pos = stack.pop();
    if (visited[pos]) continue;
    visited[pos] = 1;
    const pi = pos * 4;
    const dr = dst[pi] - r0, dg = dst[pi + 1] - g0, db = dst[pi + 2] - b0;
    if (Math.sqrt(dr * dr + dg * dg + db * db) > threshold) continue;
    dst[pi + 3] = 0;
    const x = pos % w, y = (pos / w) | 0;
    if (x > 0) stack.push(pos - 1);
    if (x < w - 1) stack.push(pos + 1);
    if (y > 0) stack.push(pos - w);
    if (y < h - 1) stack.push(pos + w);
  }
  return dst;
}
