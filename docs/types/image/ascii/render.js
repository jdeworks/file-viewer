// Render an ASCII result to the screen and export it. Three render targets:
//   <pre>   — colour via spans; built here from cells so colour/glyph-colour
//             changes never need a reconvert.
//   <canvas>— glyphs drawn with fillText; used for PNG export and webcam (cheap,
//             no thousands of DOM nodes per frame).
// Export helpers cover TXT / standalone-HTML / PNG, plus clipboard copy.

import { escapeHtml } from './charsets.js';

// Selectable output fonts. "Uniform" (vendored DejaVu Sans Mono) is the default — it has
// uniform-width block glyphs so those ramps don't distort. The others let users
// experiment; they may distort the block ramps if the system font lacks those glyphs.
export const FONTS = {
  Uniform: '"FV ASCII Mono", ui-monospace, monospace',
  System: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  Courier: '"Courier New", Courier, monospace',
};
export const fontFamily = (o) => FONTS[o?.fontName] || FONTS.Uniform;

// The colour a cell's glyph should use, honouring colorMode + glyphColorMode.
// null → render as plain (uncoloured) text.
function glyphColor(cell, o) {
  if (cell.a < 16) return null;                 // transparent cell
  if (!o.colorMode) return null;                // colour off → plain glyphs
  if (o.glyphColorMode === 'white') return '#fff';
  if (o.glyphColorMode === 'grayscale') { const v = Math.round(cell.luminance); return `rgb(${v},${v},${v})`; }
  return `rgb(${cell.r},${cell.g},${cell.b})`;  // 'colored'
}

// Build coloured HTML (run-length encoded by colour to keep the DOM small).
export function buildHtml(result, o) {
  const gap = result.gap || '';
  let html = '';
  for (let y = 0; y < result.rows; y++) {
    const row = result.cells[y];
    let run = '', runColor = null, first = true;
    const flush = () => {
      if (!run) return;
      html += runColor ? `<span style="color:${runColor}">${escapeHtml(run)}</span>` : escapeHtml(run);
      run = '';
    };
    for (let x = 0; x < result.columns; x++) {
      const cell = row[x];
      const color = glyphColor(cell, o);
      if (!first && color !== runColor) flush();
      first = false;
      runColor = color;
      run += cell.ch + gap;
    }
    flush();
    html += '\n';
  }
  return html;
}

export function renderAsciiToPre(result, pre, o) {
  pre.innerHTML = buildHtml(result, o);
  pre.style.setProperty('--ascii-font-size', `${o.fontSize}px`);
  pre.style.fontFamily = fontFamily(o);
  pre.style.background = o.transparentBackground ? 'transparent' : (o.backgroundColor || '#000');
}

// Draw to a canvas. charWidth is measured from the monospace font so columns
// line up. Returns the canvas (sized to fit).
const wCache = new Map();   // glyph → advance width at the current font (cleared when the font changes)
let wCacheFont = '';

// Ensure the vendored ASCII mono font is loaded before a CANVAS render measures glyphs
// (the <pre> path reflows itself via font-display). Memoised; resolves even on failure.
let fontReady = null;
export function ensureAsciiFont() {
  if (fontReady) return fontReady;
  fontReady = (async () => {
    try { if (document.fonts?.load) { await document.fonts.load('16px "FV ASCII Mono"'); wCache.clear(); } } catch { /* fallback metrics */ }
  })();
  return fontReady;
}

export function renderAsciiToCanvas(result, canvas, o) {
  const fontSize = o.fontSize;
  const ctx = canvas.getContext('2d');
  const fontStr = `${fontSize}px ${fontFamily(o)}`;
  ctx.font = fontStr;
  if (fontStr !== wCacheFont) { wCache.clear(); wCacheFont = fontStr; }   // measureText depends on the font
  const charW = (ctx.measureText('M').width || fontSize * 0.6) * Math.max(1, Math.round(o.spaceDensity));
  const lineH = Math.round(fontSize * 1.0);
  const frame = o.transparentFrame || 0;
  const w = Math.max(1, Math.ceil(result.columns * charW + frame * 2));
  const h = Math.max(1, Math.ceil(result.rows * lineH + frame * 2));
  // Only resize when the dimensions actually change — reassigning canvas.width
  // every webcam frame reallocates the backing store (a steady per-frame cost).
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;

  if (o.transparentBackground) ctx.clearRect(0, 0, canvas.width, canvas.height);
  else { ctx.fillStyle = o.backgroundColor || '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height); }

  ctx.font = fontStr;
  ctx.textBaseline = 'top';
  // Safety net: if a glyph is wider than one cell (e.g. a font substitution), scale it
  // horizontally to fit so it never overflows into the next cell. Widths are cached per
  // char so this stays O(unique glyphs) even across thousands of webcam cells.
  const widthOf = (ch) => { let w = wCache.get(ch); if (w === undefined) { w = ctx.measureText(ch).width; wCache.set(ch, w); } return w; };
  for (let y = 0; y < result.rows; y++) {
    const row = result.cells[y];
    for (let x = 0; x < result.columns; x++) {
      const cell = row[x];
      if (cell.ch === ' ') continue;
      const col = o.colorMode ? glyphColor(cell, o) : '#fff';
      ctx.fillStyle = col || '#fff';
      const gw = widthOf(cell.ch);
      if (gw > charW + 0.5) {
        ctx.save();
        ctx.translate(frame + x * charW, frame + y * lineH);
        ctx.scale(charW / gw, 1);
        ctx.fillText(cell.ch, 0, 0);
        ctx.restore();
      } else {
        ctx.fillText(cell.ch, frame + x * charW + (charW - gw) / 2, frame + y * lineH);   // center narrow glyphs in the cell
      }
    }
  }
  return canvas;
}

// ── exports ──────────────────────────────────────────────────────────────
function triggerDownload(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function downloadText(filename, text) {
  triggerDownload(new Blob([text], { type: 'text/plain;charset=utf-8' }), filename);
}

export function downloadHtml(filename, result, o) {
  const bg = o.transparentBackground ? 'transparent' : (o.backgroundColor || '#000');
  const doc = `<!doctype html><meta charset="utf-8"><title>${escapeHtml(filename)}</title>`
    + `<body style="margin:0;background:${bg}">`
    + `<pre style="margin:0;font:${o.fontSize}px ${fontFamily(o)};line-height:1;white-space:pre;color:#fff;padding:16px">`
    + buildHtml(result, o) + '</pre>';
  triggerDownload(new Blob([doc], { type: 'text/html;charset=utf-8' }), filename);
}

export function downloadPng(filename, canvas) {
  canvas.toBlob((blob) => { if (blob) triggerDownload(blob, filename); }, 'image/png');
}

export async function copyText(text) { try { await navigator.clipboard?.writeText(text); return true; } catch { return false; } }
export async function copyHtml(html) {
  try {
    const blob = new Blob([html], { type: 'text/html' });
    await navigator.clipboard?.write([new ClipboardItem({ 'text/html': blob })]);
    return true;
  } catch { return false; }
}
