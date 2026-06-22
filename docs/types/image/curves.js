// Pure tone-curve mapping. A handful of control points (input→output, each 0..255)
// define a smooth curve; buildCurveLUT samples it into a 256-entry lookup table that
// remaps each R/G/B value — the same LUT shape Levels produces, so it is applied through
// the shared applyLevels (levels.js). Interpolation is a monotone cubic Hermite spline
// (Fritsch–Carlson): smooth through the points but never overshoots, so the curve stays
// monotone and the tone mapping can't invert between handles. No DOM.

// Clamp/round points to integer 0..255, sort by x, drop duplicate x, and guarantee the
// 0 and 255 endpoints exist (clamped from the nearest handle) so the LUT spans the range.
function normalizePoints(points) {
  const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));
  const pts = (points || [])
    .map((p) => ({ x: clamp(p.x), y: clamp(p.y) }))
    .sort((a, b) => a.x - b.x);
  const out = [];
  for (const p of pts) {
    if (out.length && out[out.length - 1].x === p.x) out[out.length - 1] = p; // last wins on tie
    else out.push(p);
  }
  if (!out.length) return [{ x: 0, y: 0 }, { x: 255, y: 255 }];
  if (out[0].x > 0) out.unshift({ x: 0, y: out[0].y });
  if (out[out.length - 1].x < 255) out.push({ x: 255, y: out[out.length - 1].y });
  return out;
}

export function buildCurveLUT(points) {
  const pts = normalizePoints(points);
  const n = pts.length;
  const lut = new Uint8ClampedArray(256);
  if (n < 2) { for (let i = 0; i < 256; i++) lut[i] = i; return lut; }

  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const dx = [], m = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = xs[i + 1] - xs[i]; m[i] = (ys[i + 1] - ys[i]) / dx[i]; }

  // Hermite tangents, then the Fritsch–Carlson clamp that enforces monotonicity.
  const t = new Array(n);
  t[0] = m[0]; t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
    if (s > 9) { const tau = 3 / Math.sqrt(s); t[i] = tau * a * m[i]; t[i + 1] = tau * b * m[i]; }
  }

  let seg = 0;
  for (let x = 0; x < 256; x++) {
    while (seg < n - 2 && x > xs[seg + 1]) seg++;
    const h = dx[seg], s = (x - xs[seg]) / h, s2 = s * s, s3 = s2 * s;
    const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
    lut[x] = Math.round(h00 * ys[seg] + h10 * h * t[seg] + h01 * ys[seg + 1] + h11 * h * t[seg + 1]);
  }
  return lut;
}

// Compose the master (RGB) curve with each per-channel curve into one LUT per channel:
//   final_channel[v] = master[ channel[v] ]   — the channel curve runs first, then the master on top
// so an identity channel leaves the master curve and an identity master leaves the channel curve.
// `pts` = { rgb, r, g, b }, each an array of control points (any may be omitted → identity).
export function buildChannelLUTs(pts) {
  const master = buildCurveLUT(pts.rgb || []);
  const compose = (chPts) => {
    const ch = buildCurveLUT(chPts || []);
    const out = new Uint8ClampedArray(256);
    for (let i = 0; i < 256; i++) out[i] = master[ch[i]];
    return out;
  };
  return { r: compose(pts.r), g: compose(pts.g), b: compose(pts.b) };
}

// Map R/G/B through their own LUT in place (alpha untouched). `luts` = { r, g, b } from buildChannelLUTs.
export function applyChannelLUTs(data, luts) {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = luts.r[data[i]]; data[i + 1] = luts.g[data[i + 1]]; data[i + 2] = luts.b[data[i + 2]];
  }
}
