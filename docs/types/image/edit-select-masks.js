// Pure mask builders for the pixel selection (rectangle / ellipse / lasso). Each
// returns { m:Uint8Array, w, h } at natural resolution, or null if the gesture was
// too small. Split out of edit-select.js to keep that file under the LOC cap.

// Rectangle mask (fast loop, clamped to the image).
export function rectMask(a, b, w, h) {
  const x0 = Math.max(0, Math.min(w, Math.min(a.x, b.x))), x1 = Math.max(0, Math.min(w, Math.max(a.x, b.x)));
  const y0 = Math.max(0, Math.min(h, Math.min(a.y, b.y))), y1 = Math.max(0, Math.min(h, Math.max(a.y, b.y)));
  if (x1 - x0 < 2 || y1 - y0 < 2) return null;
  const m = new Uint8Array(w * h);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) m[y * w + x] = 1;
  return { m, w, h };
}

// Rasterize a filled path to a mask (alpha > half = inside). Shared by ellipse + lasso.
function maskFromPath(draw, w, h) {
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

export function ellipseMask(a, b, w, h) {
  const rx = Math.abs(b.x - a.x) / 2, ry = Math.abs(b.y - a.y) / 2;
  if (rx < 1 || ry < 1) return null;
  return maskFromPath((g) => g.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, rx, ry, 0, 0, Math.PI * 2), w, h);
}

export function lassoMask(pts, w, h) {
  if (!pts || pts.length < 3) return null;
  return maskFromPath((g) => { pts.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); g.closePath(); }, w, h);
}

// Translate a mask by (dx,dy) into a fresh buffer of the same dims (out-of-bounds dropped).
export function translateMask(src, w, h, dx, dy) {
  const out = new Uint8Array(w * h);
  if (!dx && !dy) { out.set(src); return out; }
  for (let p = 0; p < src.length; p++) {
    if (!src[p]) continue;
    const x = (p % w) + dx, y = ((p / w) | 0) + dy;
    if (x >= 0 && x < w && y >= 0 && y < h) out[y * w + x] = 1;
  }
  return out;
}
