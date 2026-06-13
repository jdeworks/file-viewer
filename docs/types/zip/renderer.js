// Archive listing: read the zip's central directory (no decompression) and show every
// entry with its size, packed size, and date. Filenames come from the archive, so escape.
import { readZip, fmtSize, encryptedNames, listCentralDirectory } from './ziplib.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const usize = (f) => (f._data ? f._data.uncompressedSize : f.uncompressedSize);
const csize = (f) => (f._data ? f._data.compressedSize : f.compressedSize);

export async function render(intake, _ctx) {
  let z, encrypted;
  try {
    z = await readZip(intake);                          // normal archives
    encrypted = encryptedNames(intake.bytes);
  } catch (e) {
    // JSZip refuses encrypted (and some odd) zips — fall back to our own central-directory parse,
    // which still lists names/sizes and flags the protected entries.
    const cd = listCentralDirectory(intake.bytes);
    if (!cd || !cd.files.length) return { bodyHtml: '<div class="json-error"><strong>Could not read archive</strong><br>' + esc(e.message) + '</div>', hadUnsafe: false };
    z = cd; encrypted = cd.encrypted;
  }

  const rows = z.files.slice().sort((a, b) => a.name.localeCompare(b.name)).map((f) => {
    const date = f.date ? f.date.toISOString().slice(0, 16).replace('T', ' ') : '';
    const lock = encrypted.has(f.name) ? ' <span class="z-lock" title="Password protected — content not shown">🔒</span>' : '';
    return '<tr><td class="z-name">' + esc(f.name) + lock + '</td>'
      + '<td class="z-num">' + fmtSize(usize(f)) + '</td>'
      + '<td class="z-num">' + fmtSize(csize(f)) + '</td>'
      + '<td class="z-date">' + esc(date) + '</td></tr>';
  }).join('');

  const banner = encrypted.size
    ? '<div class="zip-locked">🔒 This archive is password-protected — ' + encrypted.size + ' entr' + (encrypted.size === 1 ? 'y is' : 'ies are') + ' encrypted, so their contents can\'t be shown (listing only).</div>'
    : '';
  const meta = z.files.length + ' files · ' + z.folders.length + ' folders · ' + fmtSize(z.totalU) + ' uncompressed'
    + (z.totalU > 0 ? ' · ' + z.ratio + '% smaller packed' : '');
  const body = '<div class="zip-doc">' + banner + '<div class="zip-meta">' + esc(meta) + '</div>'
    + '<div class="table-wrap"><table class="zip-table"><thead><tr><th>Name</th><th>Size</th><th>Packed</th><th>Modified</th></tr></thead>'
    + '<tbody>' + rows + '</tbody></table></div></div>';
  return { bodyHtml: body, hadUnsafe: false };
}
