// Archive listing renderer for 7z, RAR, tar and compressed tar archives.
// Requires enableArchiveWasm setting — shows an opt-in panel when it is off.
// Shares styling with the zip renderer (zip-doc, zip-meta, zip-table) from preview.css.
import { listArchive, fmtSize, OFFLINE_DEPENDENCY_ERROR } from '../../core/archivelib.js';
import { esc } from '../../core/template.js';

const ICON = { dir: '&#x1F4C1;', file: '&#x1F4C4;' }; // folder / page emoji via HTML entity

function renderRow(entry) {
  const icon = entry.isDir ? ICON.dir : ICON.file;
  const size = entry.isDir ? '' : fmtSize(entry.size);
  return '<tr><td class="z-name">' + icon + ' ' + esc(entry.name) + '</td>'
    + '<td class="z-num">' + esc(size) + '</td></tr>';
}

export async function render(intake, ctx) {
  const enabled = !!(ctx && ctx.settings && ctx.settings.enableArchiveWasm);
  const archName = esc(intake.filename || 'archive');

  if (!enabled) {
    const bodyHtml =
      '<div class="zip-doc">'
      + '<div class="archive-hint">'
      + '<strong>Archive support is not enabled.</strong><br>'
      + 'Enable <strong>Archive support</strong> in Settings → Advanced to list the contents of '
      + '<code>' + archName + '</code>.'
      + '<br><small>Downloads ~1 MB of WASM on first use; cached for subsequent uses. Runs entirely in-browser.</small>'
      + '</div>'
      + '</div>';
    return { bodyHtml, hadUnsafe: false };
  }

  let listing;
  try {
    listing = await listArchive(intake);
  } catch (e) {
    // A missing opt-in viewer dependency after a hard offline reload is the app-level offline-miss
    // case, not a corrupt archive. Let the shell replace it with the actionable offline message.
    if (e?.code === OFFLINE_DEPENDENCY_ERROR) throw e;
    const bodyHtml = '<div class="zip-doc"><div class="archive-hint archive-hint--error">'
      + '<strong>Could not read archive</strong><br>' + esc(e.message) + '</div></div>';
    return { bodyHtml, hadUnsafe: false };
  }

  const { files, totalFiles, totalSize } = listing;
  const dirs  = files.filter((f) => f.isDir).length;
  const items = files.filter((f) => !f.isDir);
  const sorted = files.slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  const meta = totalFiles + ' file' + (totalFiles !== 1 ? 's' : '')
    + (dirs ? ' · ' + dirs + ' folder' + (dirs !== 1 ? 's' : '') : '')
    + (totalSize > 0 ? ' · ' + fmtSize(totalSize) + ' total' : '');

  const rows = sorted.map(renderRow).join('');

  const bodyHtml =
    '<div class="zip-doc">'
    + '<div class="zip-meta">' + esc(meta) + '</div>'
    + '<div class="table-wrap">'
    + '<table class="zip-table"><thead><tr><th>Name</th><th>Size</th></tr></thead>'
    + '<tbody>' + rows + '</tbody></table>'
    + '</div>'
    + '</div>';

  return { bodyHtml, hadUnsafe: false };
}
