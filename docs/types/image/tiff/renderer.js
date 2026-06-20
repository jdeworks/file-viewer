import { parseTiffMetadata } from './metadata.js';

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export async function render(intake) {
  const host = document.createElement('div');
  host.className = 'tiff-doc';
  host.style.cssText = 'min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:24px;gap:16px;background:var(--preview-bg,#fff);color:var(--fg,#111);font:14px/1.5 system-ui,sans-serif';

  // Try native browser rendering first (works in Safari/macOS, some desktop browsers)
  const blob = new Blob([intake.bytes], { type: 'image/tiff' });
  const blobUrl = URL.createObjectURL(blob);
  const img = document.createElement('img');
  img.style.cssText = 'max-width:100%;max-height:60vh;border-radius:4px;border:1px solid var(--border,#ddd);object-fit:contain;';
  img.alt = intake.filename || 'TIFF image';

  const nativeMsg = document.createElement('p');
  nativeMsg.style.cssText = 'font-size:12px;color:var(--fg-muted,#888);margin:0;';

  const card = document.createElement('section');
  card.style.cssText = 'width:min(680px,100%);border:1px solid var(--border,#ddd);border-radius:8px;padding:18px 20px;background:var(--bg,#fff);';

  const h1 = document.createElement('h1');
  h1.style.cssText = 'margin:0 0 8px;font-size:20px;';
  h1.textContent = 'TIFF image';

  const rows = parseTiffMetadata(intake.bytes || new Uint8Array());
  const table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;';
  table.innerHTML = rows.map((r) =>
    `<tr><th style="width:42%;color:var(--fg-muted,#666);font-weight:600;padding:6px 8px;border-top:1px solid var(--border,#e5e5e5);text-align:left;vertical-align:top">${esc(r.label)}</th><td style="padding:6px 8px;border-top:1px solid var(--border,#e5e5e5);text-align:left;vertical-align:top">${esc(r.value)}</td></tr>`
  ).join('');

  card.append(h1, table);

  img.addEventListener('load', () => {
    nativeMsg.textContent = 'Native browser TIFF decode succeeded.';
    host.prepend(img, nativeMsg);
  });
  img.addEventListener('error', () => {
    URL.revokeObjectURL(blobUrl);
    const note = document.createElement('p');
    note.style.cssText = 'margin:0 0 14px;color:var(--fg-muted,#666);';
    note.textContent = 'TIFF native decode is not supported in this browser. Metadata is shown below.';
    card.insertBefore(note, table);
  });
  img.src = blobUrl;

  host.appendChild(card);
  return { parentNode: host };
}
