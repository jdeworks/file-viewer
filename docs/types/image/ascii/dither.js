// Error-diffusion dithering on the ASCII luminance grid (not the RGB image).
// Quantises each cell's luminance to the nearest character-ramp level and
// spreads the quantisation error to not-yet-visited neighbours, so banding in
// flat gradients turns into texture the glyph ramp can actually show.
//
// Operates on a Float32Array luminance grid (0–255) of length cols*rows, in
// place. Colour is left untouched — only glyph selection is affected.

// Each matrix: [dx, dy, weight]. dy=0 entries must have dx>0 (forward on the
// current row); all dy>0 entries are on rows not yet processed. Weights sum ≈ 1.
const MATRICES = {
  floydSteinberg: { div: 16, taps: [[1, 0, 7], [-1, 1, 3], [0, 1, 5], [1, 1, 1]] },
  jarvisJudiceNinke: {
    div: 48,
    taps: [[1, 0, 7], [2, 0, 5],
      [-2, 1, 3], [-1, 1, 5], [0, 1, 7], [1, 1, 5], [2, 1, 3],
      [-2, 2, 1], [-1, 2, 3], [0, 2, 5], [1, 2, 3], [2, 2, 1]],
  },
  stucki: {
    div: 42,
    taps: [[1, 0, 8], [2, 0, 4],
      [-2, 1, 2], [-1, 1, 4], [0, 1, 8], [1, 1, 4], [2, 1, 2],
      [-2, 2, 1], [-1, 2, 2], [0, 2, 4], [1, 2, 2], [2, 2, 1]],
  },
  atkinson: { div: 8, taps: [[1, 0, 1], [2, 0, 1], [-1, 1, 1], [0, 1, 1], [1, 1, 1], [0, 2, 1]] },
};

export const DITHER_METHODS = ['none', ...Object.keys(MATRICES)];

export function ditherLuminance(lum, cols, rows, method, levels) {
  const m = MATRICES[method];
  if (!m || levels < 2) return lum;
  const step = 255 / (levels - 1);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      const old = lum[i];
      const quant = Math.round(old / step) * step;
      lum[i] = quant;
      const err = old - quant;
      for (const [dx, dy, w] of m.taps) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
        lum[ny * cols + nx] += err * w / m.div;
      }
    }
  }
  return lum;
}
