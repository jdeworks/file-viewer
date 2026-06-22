import { parseTiffMetadata } from './metadata.js';

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// TIFF opens as a fully EDITABLE raster: we decode it in JS (browsers can't do TIFF
// natively) via the vendored UTIF decoder → a PNG, then hand the PNG to the main image
// editor so the whole toolbar (crop/filters/draw/Adv/ASCII/export…) works on it. The app
// keeps the ORIGINAL intake for the Download button, so the untouched .tiff stays
// downloadable; edits save as PNG (TIFF can't be re-encoded in-browser). If decoding fails
// (exotic compression/colour space), we fall back to the metadata card.
export async function render(intake, ctx = {}) {
  try {
    const { decodeTiff } = await import('./decode-tiff.js');
    const id = await decodeTiff(intake.bytes);
    const canvas = document.createElement('canvas');
    canvas.width = id.width; canvas.height = id.height;
    canvas.getContext('2d').putImageData(new ImageData(id.data, id.width, id.height), 0, 0);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
    if (!blob) throw new Error('could not encode the decoded TIFF to PNG');
    const pngBytes = new Uint8Array(await blob.arrayBuffer());
    const { render: renderImage } = await import('../renderer.generated.js');
    // Synthesize a PNG intake so the editor treats it like any other raster. Drop the
    // text/SVG hints so none of the editor's format branches (svg/gif/jxl) misfire.
    const baseName = (intake.filename || 'image.tiff').replace(/\.(tif|tiff)$/i, '');
    // mimeFor() keys off intake.mimeType (then the filename ext); override BOTH so the editor
    // treats this as an editable PNG, not the original image/tiff (which isn't in EDITABLE_MIME).
    const pngIntake = { ...intake, bytes: pngBytes, text: undefined, textSample: undefined, mimeType: 'image/png', mime: 'image/png', filename: baseName + '.png' };
    return await renderImage(pngIntake, ctx);
  } catch (err) {
    return renderMetadataFallback(intake, err);
  }
}

// Decode failed — show the structural metadata we can parse without a full decode, with a
// note explaining why no pixels are shown. (This is the pre-2026-06-22 behaviour, minus the
// Safari-only native <img> attempt, which UTIF now supersedes.)
function renderMetadataFallback(intake, err) {
  const host = document.createElement('div');
  host.className = 'tiff-doc';
  host.style.cssText = 'min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:24px;gap:16px;background:var(--preview-bg,#fff);color:var(--fg,#111);font:14px/1.5 system-ui,sans-serif';

  const card = document.createElement('section');
  card.style.cssText = 'width:min(680px,100%);border:1px solid var(--border,#ddd);border-radius:8px;padding:18px 20px;background:var(--bg,#fff);';

  const h1 = document.createElement('h1');
  h1.style.cssText = 'margin:0 0 8px;font-size:20px;';
  h1.textContent = 'TIFF image';

  const note = document.createElement('p');
  note.style.cssText = 'margin:0 0 14px;color:var(--fg-muted,#666);';
  note.textContent = 'This TIFF could not be decoded here (' + esc(err?.message || String(err)) + '). Metadata is shown below; the original file still downloads.';

  const rows = parseTiffMetadata(intake.bytes || new Uint8Array());
  const table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;';
  table.innerHTML = rows.map((r) =>
    `<tr><th style="width:42%;color:var(--fg-muted,#666);font-weight:600;padding:6px 8px;border-top:1px solid var(--border,#e5e5e5);text-align:left;vertical-align:top">${esc(r.label)}</th><td style="padding:6px 8px;border-top:1px solid var(--border,#e5e5e5);text-align:left;vertical-align:top">${esc(r.value)}</td></tr>`
  ).join('');

  card.append(h1, note, table);
  host.appendChild(card);
  return { parentNode: host };
}
