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
};
// NOTE: 'arrows' (↑→…), 'mathSymbols' (∑∏∆Ω) and 'braille' were removed — arrows/math are
// wider than one monospace cell in any font, and braille rendering proved too font-flaky.
// Block ramps stay uniform thanks to the vendored "FV ASCII Mono" font (see render.js).

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
