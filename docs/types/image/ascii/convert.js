// The conversion core: a processed canvas (+ optional original for colour) → an
// ASCII result. DOM-free apart from the offscreen canvases it samples. Same
// function serves a still image and a single webcam video frame.
//
// Produces the per-cell grid + a plain-text rendering. The coloured HTML is
// built at RENDER time (render.js) from the cells, so colour/glyph-colour
// styling can change without a reconvert.

import { resolveRamp, luminanceToChar, luminance709, clamp } from './charsets.js';
import { gridFromCanvas } from './sample.js';
import { ditherLuminance } from './dither.js';
import { fillEnclosedGaps } from './gap-fill.js';

const ALPHA_CUTOFF = 16; // below this a cell renders as a transparent space

// Plain-text is only needed for copy/export — never for the live canvas render.
// Build it lazily (and memoised) from the cells so a webcam frame doesn't allocate
// a full string every frame (steady GC churn shows up as a creeping per-frame ms).
function lazyText(cells) {
  let cache;
  return () => (cache ??= cells.map((row) => row.map((c) => c.ch).join('')).join('\n') + '\n');
}

// rows from columns, image aspect and font aspect (monospace cells are taller
// than wide, so we need fewer rows than a naive aspect would suggest).
export function computeRows(columns, srcW, srcH, fontAspect) {
  return Math.max(1, Math.round(columns * ((srcH || 1) / (srcW || 1)) * fontAspect));
}

/**
 * @param {HTMLCanvasElement} processed  filtered canvas (drives glyph + default colour)
 * @param {HTMLCanvasElement} original   unfiltered canvas (colour when colorSource='original')
 * @param {object} o      resolved options
 * @param {HTMLCanvasElement} scratch    reusable downscale canvas (engine-owned)
 * @returns {{columns,rows,cells,text,gap,braille}}
 */
export function imageToAscii(processed, original, o, scratch) {
  const columns = clamp(Math.round(o.columns), 1, 1000);
  const rows = computeRows(columns, processed.width, processed.height, o.fontAspect);
  const ramp = resolveRamp(o.gradientName, o.customRamp);
  const colorSrc = (o.colorSource === 'original' && original) ? original : processed;

  // Luminance comes from the processed image; colour from the chosen source.
  const lumGridData = gridFromCanvas(processed, columns, rows, o.samplingMethod, scratch);
  const colorData = colorSrc === processed ? lumGridData
    : gridFromCanvas(colorSrc, columns, rows, o.samplingMethod, scratch);

  const lum = new Float32Array(columns * rows);
  for (let i = 0, p = 0; p < lum.length; i += 4, p++) {
    lum[p] = luminance709(lumGridData[i], lumGridData[i + 1], lumGridData[i + 2]);
  }
  if (o.dithering && o.dithering !== 'none') ditherLuminance(lum, columns, rows, o.dithering, ramp.length);

  // Space density is a display-only concern (CSS letter-spacing / canvas advance),
  // so the cell grid + text carry no inserted spaces.
  const cells = [];
  for (let y = 0; y < rows; y++) {
    const rowCells = [];
    for (let x = 0; x < columns; x++) {
      const i = (y * columns + x) * 4;
      const L = lum[y * columns + x];
      // Glyph + transparency are driven ONLY by the processed image, so switching
      // the colour source never changes the symbols/shape — only the RGB colour.
      const pa = lumGridData[i + 3];
      // Coverage-aware tone: fade the glyph toward the ramp's empty (light) end as the cell's
      // alpha coverage drops, so partial coverage anti-aliases smoothly instead of flipping
      // between a full glyph and a space (the "black spots" on sparse/transparent art). Opaque
      // cells (coverage=1) are unchanged. A near-empty cell stays a clean transparent space.
      const cov = pa / 255;
      const Leff = L * cov + 255 * (1 - cov);
      const ch = pa < ALPHA_CUTOFF ? ' ' : luminanceToChar(Leff, ramp, o.invertRamp);
      rowCells.push({ ch, r: colorData[i], g: colorData[i + 1], b: colorData[i + 2], a: pa, luminance: L });
    }
    cells.push(rowCells);
  }
  // Optional: fill INTERIOR transparent holes (enclosed by content) from their neighbours,
  // leaving the genuine border-connected transparent background untouched. Off by default.
  if (o.fillGaps) fillEnclosedGaps(cells, columns, rows, ramp, o.invertRamp, ALPHA_CUTOFF);
  const getText = lazyText(cells);
  return { columns, rows, cells, get text() { return getText(); }, gap: '', braille: false };
}
