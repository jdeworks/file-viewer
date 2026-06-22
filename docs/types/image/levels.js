// Pure tone-mapping for the Levels adjustment (black point / white point / gamma).
// A 256-entry per-channel lookup table remaps each R/G/B value:
//   t = clamp((v - black) / (white - black), 0, 1)
//   out = round( t^(1/gamma) * 255 )
// gamma > 1 lifts the midtones (brighter), gamma < 1 deepens them. No DOM — applied
// to RGBA bytes via applyLevels (used by edit-filters.js on a canvas getImageData).

export function buildLevelsLUT(black = 0, white = 255, gamma = 1) {
  black = Math.max(0, Math.min(254, black | 0));
  white = Math.max(black + 1, Math.min(255, white | 0));
  gamma = gamma > 0 ? gamma : 1;
  const lut = new Uint8ClampedArray(256);
  const range = white - black, inv = 1 / gamma;
  for (let i = 0; i < 256; i++) {
    let t = (i - black) / range;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    lut[i] = Math.round(Math.pow(t, inv) * 255);
  }
  return lut;
}

// Map R,G,B through `lut` in place (alpha untouched).
export function applyLevels(data, lut) {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = lut[data[i]]; data[i + 1] = lut[data[i + 1]]; data[i + 2] = lut[data[i + 2]];
  }
}
