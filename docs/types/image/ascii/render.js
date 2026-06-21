// Render an ASCII result to the screen and export it. Three render targets:
//   <pre>   — colour via spans; built here from cells so colour/glyph-colour
//             changes never need a reconvert.
//   <canvas>— glyphs drawn with fillText; used for PNG export and webcam (cheap,
//             no thousands of DOM nodes per frame).
// Export helpers cover TXT / standalone-HTML / PNG, plus clipboard copy.

import { escapeHtml } from './charsets.js';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

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
  pre.style.background = o.transparentBackground ? 'transparent' : (o.backgroundColor || '#000');
}

// Draw to a canvas. charWidth is measured from the monospace font so columns
// line up. Returns the canvas (sized to fit).
export function renderAsciiToCanvas(result, canvas, o) {
  const fontSize = o.fontSize;
  const ctx = canvas.getContext('2d');
  ctx.font = `${fontSize}px ${MONO}`;
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

  ctx.font = `${fontSize}px ${MONO}`;
  ctx.textBaseline = 'top';
  for (let y = 0; y < result.rows; y++) {
    const row = result.cells[y];
    for (let x = 0; x < result.columns; x++) {
      const cell = row[x];
      if (cell.ch === ' ') continue;
      const col = o.colorMode ? glyphColor(cell, o) : '#fff';
      ctx.fillStyle = col || '#fff';
      ctx.fillText(cell.ch, frame + x * charW, frame + y * lineH);
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
    + `<pre style="margin:0;font:${o.fontSize}px ${MONO};line-height:1;white-space:pre;color:#fff;padding:16px">`
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
