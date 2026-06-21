// The conversion core: a processed canvas (+ optional original for colour) → an
// ASCII result. DOM-free apart from the offscreen canvases it samples. Same
// function serves a still image and a single webcam video frame.
//
// Produces the per-cell grid + a plain-text rendering. The coloured HTML is
// built at RENDER time (render.js) from the cells, so colour/glyph-colour
// styling can change without a reconvert.

import { resolveRamp, luminanceToChar, luminance709, brailleChar, clamp } from './charsets.js';
import { gridFromCanvas } from './sample.js';
import { ditherLuminance } from './dither.js';

const ALPHA_CUTOFF = 16; // below this a cell renders as a transparent space

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
  const braille = o.gradientName === 'braille' && !o.customRamp;

  if (braille) return brailleResult(processed, colorSrc, columns, rows, o, scratch);

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
  let text = '';
  for (let y = 0; y < rows; y++) {
    const rowCells = [];
    let line = '';
    for (let x = 0; x < columns; x++) {
      const i = (y * columns + x) * 4;
      const L = lum[y * columns + x];
      // Glyph + transparency are driven ONLY by the processed image, so switching
      // the colour source never changes the symbols/shape — only the RGB colour.
      const pa = lumGridData[i + 3];
      const ch = pa < ALPHA_CUTOFF ? ' ' : luminanceToChar(L, ramp, o.invertRamp);
      rowCells.push({ ch, r: colorData[i], g: colorData[i + 1], b: colorData[i + 2], a: pa, luminance: L });
      line += ch;
    }
    text += line + '\n';
    cells.push(rowCells);
  }
  return { columns, rows, cells, text, gap: '', braille: false };
}

// Braille: 2 sub-cols × 4 sub-rows per glyph cell drive the dot pattern; colour
// is sampled once per glyph cell.
function brailleResult(processed, colorSrc, columns, rows, o, scratch) {
  const fine = gridFromCanvas(processed, columns * 2, rows * 4, o.samplingMethod, scratch);
  const fineLum = (x, y) => {
    const i = (y * columns * 2 + x) * 4;
    return luminance709(fine[i], fine[i + 1], fine[i + 2]);
  };
  const colorData = gridFromCanvas(colorSrc, columns, rows, o.samplingMethod, scratch);
  const cells = [];
  let text = '';
  for (let y = 0; y < rows; y++) {
    const rowCells = [];
    let line = '';
    for (let x = 0; x < columns; x++) {
      const cell = [];
      for (let dr = 0; dr < 4; dr++) {
        cell.push([fineLum(x * 2, y * 4 + dr), fineLum(x * 2 + 1, y * 4 + dr)]);
      }
      const ch = o.invertRamp
        ? brailleChar(cell.map((p) => p.map((v) => 255 - v)))
        : brailleChar(cell);
      const i = (y * columns + x) * 4;
      // grayscale uses overall cell luminance (avg of the 8 sub-samples)
      const L = cell.reduce((s, p) => s + p[0] + p[1], 0) / 8;
      rowCells.push({ ch, r: colorData[i], g: colorData[i + 1], b: colorData[i + 2], a: colorData[i + 3], luminance: L });
      line += ch;
    }
    text += line + '\n';
    cells.push(rowCells);
  }
  return { columns, rows, cells, text, gap: '', braille: true };
}
