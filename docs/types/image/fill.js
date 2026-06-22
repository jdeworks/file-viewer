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

// Flood-fill bucket. Tolerance (0–255) sets how close a pixel's colour must be
// to be filled; default 0 = exact match. With `edge` on, pixels are compared to
// their NEIGHBOUR (local gradient) instead of the seed, so a fill flows across
// smooth shading but stops at sharp edges. Mutates `data` in place; returns the
// number of pixels filled.
export function floodFill(data, w, h, x0, y0, fill, tol, edge) {
  if (x0 < 0 || y0 < 0 || x0 >= w || y0 >= h) return 0;
  const src = Uint8ClampedArray.from(data);
  const at = (x, y) => (y * w + x) << 2;
  const seed = at(x0, y0);
  const sr = src[seed], sg = src[seed + 1], sb = src[seed + 2];
  const close = (i, r, g, b) => Math.max(Math.abs(src[i] - r), Math.abs(src[i + 1] - g), Math.abs(src[i + 2] - b)) <= tol;
  const seen = new Uint8Array(w * h);
  const st = [x0 | 0, y0 | 0]; seen[y0 * w + x0] = 1;
  let cnt = 0;
  while (st.length) {
    const y = st.pop(), x = st.pop();
    const i = at(x, y);
    data[i] = fill[0]; data[i + 1] = fill[1]; data[i + 2] = fill[2]; data[i + 3] = fill[3];
    cnt++;
    const nb = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    for (let k = 0; k < 4; k++) {
      const nx = nb[k][0], ny = nb[k][1];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const p = ny * w + nx; if (seen[p]) continue;
      const ok = edge ? close(p << 2, src[i], src[i + 1], src[i + 2]) : close(p << 2, sr, sg, sb);
      if (ok) { seen[p] = 1; st.push(nx, ny); }
    }
  }
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
