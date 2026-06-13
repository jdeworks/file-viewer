// Archive listing: read the zip's central directory (no decompression) and show every
// entry with its size, packed size, and date. Filenames come from the archive, so escape.
import { readZip, fmtSize } from './ziplib.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function render(intake, _ctx) {
  let z;
  try { z = await readZip(intake); }
  catch (e) { return { bodyHtml: '<div class="json-error"><strong>Could not read archive</strong><br>' + esc(e.message) + '</div>', hadUnsafe: false }; }

  const rows = z.files.sort((a, b) => a.name.localeCompare(b.name)).map((f) => {
    const d = f._data || {};
    const date = f.date ? f.date.toISOString().slice(0, 16).replace('T', ' ') : '';
    return '<tr><td class="z-name">' + esc(f.name) + '</td>'
      + '<td class="z-num">' + fmtSize(d.uncompressedSize) + '</td>'
      + '<td class="z-num">' + fmtSize(d.compressedSize) + '</td>'
      + '<td class="z-date">' + esc(date) + '</td></tr>';
  }).join('');

  const meta = z.files.length + ' files · ' + z.folders.length + ' folders · ' + fmtSize(z.totalU) + ' uncompressed'
    + (z.totalU > 0 ? ' · ' + z.ratio + '% smaller packed' : '');
  const body = '<div class="zip-doc"><div class="zip-meta">' + esc(meta) + '</div>'
    + '<div class="table-wrap"><table class="zip-table"><thead><tr><th>Name</th><th>Size</th><th>Packed</th><th>Modified</th></tr></thead>'
    + '<tbody>' + rows + '</tbody></table></div></div>';
  return { bodyHtml: body, hadUnsafe: false };
}
