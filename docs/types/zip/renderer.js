// Archive listing: read the zip's central directory and show every entry with its size,
// packed size, and date. Non-encrypted entries use JSZip for fast extraction. Legacy
// ZipCrypto entries can be unlocked locally through libarchive; AES-encrypted ZIP entries
// are shown as unsupported instead of advertising a password field that cannot help.
import { readZip, fmtSize, encryptedNames, listCentralDirectory, extractEntry, extractEncryptedEntry } from './ziplib.js';
import { intakeFromBytes } from '../../core/intake.js';
import { loadTemplate, fill, esc, fillEach } from '../../core/template.js';
import { showPasswordPrompt } from '../../core/password-prompt.js';

const DOC = new URL('./doc.html', import.meta.url);
const ROW = new URL('./row.html', import.meta.url);

const usize = (f) => (f._data ? f._data.uncompressedSize : f.uncompressedSize);
const csize = (f) => (f._data ? f._data.compressedSize : f.compressedSize);

function encryptionSets(files) {
  const supported = new Set();
  const unsupported = new Set();
  for (const f of files) {
    if (!f.encrypted) continue;
    if (f.encryption === 'zipcrypto') supported.add(f.name);
    else unsupported.add(f.name);
  }
  return { supported, unsupported };
}

export async function render(intake, ctx = {}) {
  const [docTpl, rowTpl] = await Promise.all([loadTemplate(DOC), loadTemplate(ROW)]);
  const cd = listCentralDirectory(intake.bytes);

  let z, encrypted, canOpen = false;
  try {
    z = await readZip(intake);
    encrypted = encryptedNames(intake.bytes);
    canOpen = true;
  } catch (e) {
    if (!cd || !cd.files.length) {
      return { bodyHtml: '<div class="json-error"><strong>Could not read archive</strong><br>' + esc(e.message) + '</div>', hadUnsafe: false };
    }
    z = cd;
    encrypted = cd.encrypted;
  }

  const files = z.files || [];
  const fileMeta = cd?.files?.length ? cd.files : files;
  const byName = new Map(fileMeta.map((f) => [f.name, f]));
  const { supported, unsupported } = encryptionSets(fileMeta);
  const hasEncrypted = encrypted.size > 0;
  const hasSupportedEncrypted = supported.size > 0;
  const hasUnsupportedEncrypted = unsupported.size > 0;
  let zipPassword = null;

  async function openEntry(name, promptHost = null) {
    if (!name) return null;
    const meta = byName.get(name);
    if (unsupported.has(name)) return null;
    if (supported.has(name)) {
      const password = await ensurePassword(promptHost);
      if (password == null) return null;
      const bytes = await extractEncryptedEntry(intake, name, password);
      return intakeFromBytes(bytes, name.split('/').pop() || name);
    }
    if (canOpen) {
      const bytes = await extractEntry(z.zip, name);
      if (!bytes) return null;
      return intakeFromBytes(bytes, name.split('/').pop() || name);
    }
    // JSZip can reject a mixed encrypted archive as a whole. libarchive can still open the
    // clear entries without a passphrase, so keep those rows usable.
    if (meta && !meta.encrypted) {
      const bytes = await extractEncryptedEntry(intake, name, null);
      return intakeFromBytes(bytes, name.split('/').pop() || name);
    }
    return null;
  }

  async function ensurePassword(promptHost) {
    if (zipPassword != null) return zipPassword;
    const host = promptHost || document.createElement('div');
    let promptError = '';
    while (true) {
      const password = await showPasswordPrompt(host, {
        filename: intake.filename || 'archive.zip',
        hint: 'Legacy ZipCrypto encryption is supported locally for this archive.',
        error: promptError,
      });
      if (password === null) {
        renderListing(host);
        return null;
      }
      try {
        const testName = supported.values().next().value;
        await extractEncryptedEntry(intake, testName, password);
        zipPassword = password;
        renderListing(host);
        return zipPassword;
      } catch {
        promptError = 'Wrong password, or this ZIP uses an unsupported encrypted variant.';
      }
    }
  }

  function bannerHtml() {
    const parts = [];
    if (hasSupportedEncrypted) {
      parts.push(supported.size + ' password-protected entr' + (supported.size === 1 ? 'y can' : 'ies can') + ' be unlocked locally.');
    }
    if (hasUnsupportedEncrypted) {
      parts.push(unsupported.size + ' AES-encrypted entr' + (unsupported.size === 1 ? 'y is' : 'ies are') + ' not supported by this viewer.');
    }
    return parts.length ? '<div class="zip-locked">' + esc(parts.join(' ')) + '</div>' : '';
  }

  function renderRows() {
    return fillEach(rowTpl, files.slice().sort((a, b) => a.name.localeCompare(b.name)), (f) => {
      const meta = byName.get(f.name) || f;
      const date = f.date ? f.date.toISOString().slice(0, 16).replace('T', ' ') : '';
      const locked = encrypted.has(f.name);
      const isUnsupported = unsupported.has(f.name);
      const lockTitle = isUnsupported
        ? 'AES-encrypted ZIP entry — not supported'
        : (supported.has(f.name) && zipPassword == null ? 'Password protected — click to unlock' : 'Password protected');
      const lock = locked ? ' <span class="z-lock" title="' + esc(lockTitle) + '">🔒</span>' : '';
      const open = !isUnsupported && (!locked || supported.has(f.name));
      const title = supported.has(f.name) && zipPassword == null ? 'Unlock and open this file' : 'Open this file';
      const nameCell = open
        ? '<td class="z-name z-open" data-fv-open="' + esc(f.name) + '" title="' + esc(title) + '">' + esc(f.name) + lock + '</td>'
        : '<td class="z-name">' + esc(f.name) + lock + '</td>';
      return { nameCell, usize: fmtSize(usize(meta)), csize: fmtSize(csize(meta)), date };
    });
  }

  function renderListing(host) {
    const hint = files.length ? '<div class="zip-hint">Click a file name to open it.</div>' : '';
    const meta = files.length + ' files · ' + (z.folders?.length || 0) + ' folders · ' + fmtSize(z.totalU) + ' uncompressed'
      + (z.totalU > 0 ? ' · ' + z.ratio + '% smaller packed' : '');
    host.innerHTML = fill(docTpl, { banner: bannerHtml(), meta, hint, rows: renderRows() });
  }

  const archiveTree = {
    rootName: intake.filename || 'Archive',
    entries: files.map((f) => {
      const meta = byName.get(f.name) || f;
      return {
        name: f.name,
        size: usize(meta),
        encrypted: unsupported.has(f.name),
        dir: !!f.dir,
      };
    }),
  };

  if (hasEncrypted) {
    const host = document.createElement('div');
    host.className = 'zip-live-host';
    host.style.cssText = 'height:100%;display:flex;flex-direction:column;';
    renderListing(host);
    host.addEventListener('click', async (event) => {
      const cell = event.target.closest?.('[data-fv-open]');
      if (!cell || !host.contains(cell)) return;
      const name = cell.getAttribute('data-fv-open');
      try {
        const inner = await openEntry(name, host);
        if (!inner) {
          ctx.toast?.('Could not open ' + name);
          return;
        }
        await ctx.openIntake?.(inner, name);
      } catch {
        ctx.toast?.('Could not open ' + name);
      }
    });
    return { parentNode: host, hadUnsafe: false, openEntry: (name) => openEntry(name, host), archiveTree };
  }

  const rows = renderRows();
  const hint = canOpen ? '<div class="zip-hint">Click a file name to open it.</div>' : '';
  const meta = files.length + ' files · ' + (z.folders?.length || 0) + ' folders · ' + fmtSize(z.totalU) + ' uncompressed'
    + (z.totalU > 0 ? ' · ' + z.ratio + '% smaller packed' : '');

  return { bodyHtml: fill(docTpl, { banner: '', meta, hint, rows }), hadUnsafe: false, openEntry, archiveTree: canOpen ? archiveTree : null };
}
