// Archive listing: read the zip's central directory (no decompression) and show every
// entry with its size, packed size, and date. Filenames come from the archive, so escape.
// Non-encrypted entries are clickable → the parent decompresses just that one (extractEntry)
// and routes it through normal type detection (openEntry, wired in app.js via the iframe bridge).
// Markup lives in sibling .html templates (doc/row) and is filled via core/template.js.
//
// Password-protected ZIPs: JSZip 3.x does NOT support ZipCrypto or AES-256 decryption —
// it throws "Encrypted zip are not supported" when it encounters an encrypted entry regardless
// of any password option. When ALL entries are encrypted we show an inline password prompt
// (better UX than a raw error), but we must inform the user that in-browser decryption of
// ZIPs is not currently supported. Partially-encrypted ZIPs (mixed) still show the listing
// with per-entry lock icons and a banner.
import { readZip, fmtSize, encryptedNames, listCentralDirectory, extractEntry } from './ziplib.js';
import { intakeFromBytes } from '../../core/intake.js';
import { loadTemplate, fill, esc, fillEach } from '../../core/template.js';
import { showPasswordPrompt } from '../../core/password-prompt.js';

const DOC = new URL('./doc.html', import.meta.url);
const ROW = new URL('./row.html', import.meta.url);

const usize = (f) => (f._data ? f._data.uncompressedSize : f.uncompressedSize);
const csize = (f) => (f._data ? f._data.compressedSize : f.compressedSize);

export async function render(intake, _ctx) {
  const [docTpl, rowTpl] = await Promise.all([loadTemplate(DOC), loadTemplate(ROW)]);

  let z, encrypted, canOpen = false, jsZipError = null;
  try {
    z = await readZip(intake);                          // normal archives
    encrypted = encryptedNames(intake.bytes);
    canOpen = true;                                     // JSZip is loaded → we can extract entries
  } catch (e) {
    jsZipError = e;
    // JSZip refuses encrypted (and some odd) zips — fall back to our own central-directory parse,
    // which still lists names/sizes and flags the protected entries (listing only, no extraction).
    const cd = listCentralDirectory(intake.bytes);
    if (!cd || !cd.files.length) return { bodyHtml: '<div class="json-error"><strong>Could not read archive</strong><br>' + esc(e.message) + '</div>', hadUnsafe: false };
    z = cd; encrypted = cd.encrypted;
  }

  // When JSZip failed AND every listed entry is encrypted, the archive is fully password-protected.
  // Show an inline password prompt in the parent DOM (parentNode pattern, not iframe) so the user
  // can attempt to provide a password. Since JSZip cannot decrypt ZipCrypto or AES-256 entries,
  // we inform the user after the attempt rather than silently failing.
  const allEncrypted = !canOpen && encrypted.size > 0 && encrypted.size === z.files.length;
  if (allEncrypted) {
    const host = document.createElement('div');
    host.className = 'pw-host';
    host.style.cssText = 'height:100%;display:flex;flex-direction:column;';

    async function tryUnlock() {
      const password = await showPasswordPrompt(host, { filename: intake.filename || 'archive.zip' });
      if (password === null) {
        // Cancelled — show a neutral "listing only" view (fall through to normal render below).
        renderListing();
        return;
      }
      // JSZip does not support ZipCrypto or AES-256 decryption (as of v3.x).
      // Attempting loadAsync with a password option still throws "Encrypted zip are not supported".
      // We show this limitation clearly rather than pretending to try.
      host._showPasswordError('In-browser ZIP decryption is not supported — only the file listing can be shown. The 🔒 icon marks encrypted entries.');
      // After showing the error, fall through to show the listing so the user sees what's there.
      setTimeout(() => renderListing(), 1800);
    }

    function renderListing() {
      const banner = '<div class="zip-locked">🔒 This archive is password-protected — ' + encrypted.size + ' entr' + (encrypted.size === 1 ? 'y is' : 'ies are') + ' encrypted (listing only, extraction not available).</div>';
      const meta = z.files.length + ' files · ' + fmtSize(z.totalU) + ' uncompressed';
      const rows = fillEach(rowTpl, z.files.slice().sort((a, b) => a.name.localeCompare(b.name)), (f) => {
        const date = f.date ? f.date.toISOString().slice(0, 16).replace('T', ' ') : '';
        const lock = ' <span class="z-lock" title="Password protected — content not shown">🔒</span>';
        return { nameCell: '<td class="z-name">' + esc(f.name) + lock + '</td>', usize: fmtSize(usize(f)), csize: fmtSize(csize(f)), date };
      });
      host.innerHTML = fill(docTpl, { banner, meta, hint: '', rows });
    }

    tryUnlock();
    return { parentNode: host };
  }

  const rows = fillEach(rowTpl, z.files.slice().sort((a, b) => a.name.localeCompare(b.name)), (f) => {
    const date = f.date ? f.date.toISOString().slice(0, 16).replace('T', ' ') : '';
    const locked = encrypted.has(f.name);
    const lock = locked ? ' <span class="z-lock" title="Password protected — content not shown">🔒</span>' : '';
    // Clickable when we can extract it and it isn't encrypted; data-fv-open carries the entry name.
    const open = canOpen && !locked;
    const nameCell = open
      ? '<td class="z-name z-open" data-fv-open="' + esc(f.name) + '" title="Open this file">' + esc(f.name) + lock + '</td>'
      : '<td class="z-name">' + esc(f.name) + lock + '</td>';
    return { nameCell, usize: fmtSize(usize(f)), csize: fmtSize(csize(f)), date };
  });

  const banner = encrypted.size
    ? '<div class="zip-locked">🔒 This archive is password-protected — ' + encrypted.size + ' entr' + (encrypted.size === 1 ? 'y is' : 'ies are') + ' encrypted, so their contents can\'t be shown (listing only).</div>'
    : '';
  const hint = canOpen ? '<div class="zip-hint">Click a file name to open it.</div>' : '';
  const meta = z.files.length + ' files · ' + z.folders.length + ' folders · ' + fmtSize(z.totalU) + ' uncompressed'
    + (z.totalU > 0 ? ' · ' + z.ratio + '% smaller packed' : '');

  // openEntry: parent calls this with a clicked entry name → returns a fresh intake for that file
  // (or null). The JSZip instance is captured in `z.zip`; encrypted entries are never offered.
  const openEntry = canOpen
    ? async (name) => {
        if (!name || encrypted.has(name)) return null;
        const bytes = await extractEntry(z.zip, name);
        if (!bytes) return null;
        return intakeFromBytes(bytes, name.split('/').pop() || name);
      }
    : null;

  const archiveTree = canOpen ? {
    rootName: intake.filename || 'Archive',
    entries: z.files.map((f) => ({
      name: f.name,
      size: usize(f),
      encrypted: encrypted.has(f.name),
      dir: !!f.dir,
    })),
  } : null;

  return { bodyHtml: fill(docTpl, { banner, meta, hint, rows }), hadUnsafe: false, openEntry, archiveTree };
}
