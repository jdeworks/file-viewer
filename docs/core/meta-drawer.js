// Metadata drawer: a small table of the active file's facts (name/type/size/mime/modified) plus any
// per-type extracted metadata (EXIF, ID3, PDF info, …). Extracted from app.js; reads shared state.
import { state, $, escapeHtml, formatBytes } from './state.js';

export async function buildMetadata() {
  const body = $('metaBody');
  const i = state.intake;
  const rows = [
    ['Name', i.filename],
    ['Type', state.type.label],
    ['Size', formatBytes(i.size)],
    ['MIME', i.mimeType || '—'],
    ['Modified', i.lastModified ? new Date(i.lastModified).toLocaleString() : '—'],
  ];
  if (state.type.loadMetadata) {
    try { const m = await state.type.loadMetadata(); for (const r of await m.extract(i)) rows.push([r.label, r.value]); } catch {}
  }
  body.innerHTML = '';
  for (const [k, v] of rows) {
    const row = document.createElement('div'); row.className = 'meta-row';
    row.innerHTML = `<span class="k">${escapeHtml(k)}</span><span class="v">${escapeHtml(String(v))}</span>`;
    body.appendChild(row);
  }
  const note = document.createElement('p'); note.className = 'muted'; note.style.marginTop = '12px';
  note.style.fontSize = '12px';
  note.textContent = 'Note: browsers expose only the file’s modified time, never its OS creation time. “Created” dates come only from inside the file (e.g. PDF/EXIF).';
  body.appendChild(note);
}
