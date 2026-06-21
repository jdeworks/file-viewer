// ASCII gradient ramps + luminance→glyph mapping. Pure data + functions, no DOM.
// Shared by every consumer of the converter (file viewer, studio page, webcam),
// so glyph choice is identical everywhere.
//
// Every ramp is ordered DARK → LIGHT: ramp[0] is the densest glyph (maps to the
// darkest pixel), the last entry is the lightest (usually a space).

export const GRADIENTS = {
  normal: '@%#*+=-:. ',
  normal2: "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ",
  minimalist: '@#=:. ',
  numerical: '9876543210 ',
  alphabetic: "MWNQBPODAXZKHUwunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ",
  alphanumeric: 'MNHQ$OC?7>!:-;. ',
  grayscale: '█▓▒░ ',
  blackWhite: '█ ',
  blocks: '█▉▊▋▌▍▎▏ ',
  codePage437: '█▓▒░■□▪▫',
  mathSymbols: '∑∏∆Ωλ+=-:. ',
  arrows: '↟↥↗↑→↘↓↙←↖· ',
};

// 'braille' is not a 1:1 ramp — it is a 2×4 sub-cell dot encoding handled in
// convert.js. We expose the name so UIs can list it alongside the gradients.
export const BRAILLE = 'braille';

// Resolve the active ramp into an array of glyphs. A non-empty custom ramp wins.
export function resolveRamp(gradientName, customRamp) {
  const str = (customRamp && customRamp.length) ? customRamp : (GRADIENTS[gradientName] || GRADIENTS.normal);
  return Array.from(str); // Array.from → correct for multi-byte glyphs
}

// luminance 0–255 → glyph. Dark pixel → ramp[0] (densest). invertRamp flips the
// mapping only (independent of any image-level colour invert).
export function luminanceToChar(luminance, ramp, invertRamp) {
  const n = clamp(luminance, 0, 255) / 255;
  let idx = Math.round(n * (ramp.length - 1));
  if (invertRamp) idx = ramp.length - 1 - idx;
  return ramp[clamp(idx, 0, ramp.length - 1)];
}

// Braille 2×4 cell → U+2800 dot bitmask. Dots are set for DARK sub-pixels.
// Unicode dot bit layout: col0 → bits 0,1,2,6 ; col1 → bits 3,4,5,7.
const BRAILLE_BITS = [[0, 3], [1, 4], [2, 5], [6, 7]]; // row → [col0_bit, col1_bit]
export function brailleChar(lum2x4, threshold = 128) {
  let code = 0x2800;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 2; c++) {
      if (lum2x4[r][c] < threshold) code |= (1 << BRAILLE_BITS[r][c]);
    }
  }
  return String.fromCodePoint(code);
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }

// Rec.709 relative luminance — matches the spec's character-selection formula.
export function luminance709(r, g, b) { return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
