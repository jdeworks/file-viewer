// Advanced archive browser for 7z, RAR, tar-family files and standalone compressed streams.
// libarchive stays opt-in. Entries are listed first and extracted one at a time through the same
// bounded intake path used by ZIP-derived containers.
import {
  extractFile,
  fmtSize,
  listArchive,
  OFFLINE_DEPENDENCY_ERROR,
  releaseArchive,
} from '../../core/archivelib.js';
import { intakeFromBytes } from '../../core/intake.js';
import { esc } from '../../core/template.js';
import {
  assertEntryMayOpen,
  createBoundedEntryOpener,
  getPageArchiveExtractionSession,
} from '../zip/safe-entry.js';

const ICON = { dir: '&#x1F4C1;', file: '&#x1F4C4;', metadata: '&#x1F4CE;' };

function disabledReason(record, intake, session) {
  try {
    assertEntryMayOpen(record, {
      depth: Number(intake?.archiveDepth) || 0,
      extractedBytes: session.extractedBytes,
    });
    return '';
  } catch (error) {
    return error?.message || 'This entry cannot be opened.';
  }
}

function renderRow(entry) {
  const icon = entry.dir ? ICON.dir : entry.regular ? ICON.file : ICON.metadata;
  const size = entry.dir || entry.size == null ? '' : fmtSize(entry.size);
  const kind = !entry.dir && !entry.regular
    ? ' <small>(' + esc(entry.kind || 'metadata') + ')</small>'
    : '';
  const name = icon + ' ' + esc(entry.name) + kind;
  const nameCell = entry.disabledReason
    ? '<td class="z-name" title="' + esc(entry.disabledReason) + '">' + name + '</td>'
    : '<td class="z-name z-open" data-fv-open="' + esc(entry.name) + '" title="Open this file">' + name + '</td>';
  return '<tr>' + nameCell + '<td class="z-num">' + esc(size) + '</td></tr>';
}

function errorResult(title, message) {
  return {
    bodyHtml: '<div class="zip-doc"><div class="archive-hint archive-hint--error">'
      + '<strong>' + esc(title) + '</strong><br>' + esc(message) + '</div></div>',
    hadUnsafe: false,
  };
}

export async function render(intake, ctx = {}) {
  const enabled = !!ctx.settings?.enableArchiveWasm;
  const archName = esc(intake.filename || 'archive');

  if (!enabled) {
    const bodyHtml =
      '<div class="zip-doc">'
      + '<div class="archive-hint">'
      + '<strong>Archive support is not enabled.</strong><br>'
      + 'Enable <strong>Archive support</strong> in Settings → Advanced to browse '
      + '<code>' + archName + '</code>.'
      + '<br><small>Downloads about 1 MB on first use. It is cached and runs entirely in your browser.</small>'
      + '</div>'
      + '</div>';
    return { bodyHtml, hadUnsafe: false };
  }

  let listing;
  try {
    listing = await listArchive(intake);
  } catch (error) {
    if (error?.code === OFFLINE_DEPENDENCY_ERROR) throw error;
    return errorResult('Could not read archive', error?.message || 'The archive is corrupt or unsupported.');
  }

  const session = intake.archiveExtractionSession || getPageArchiveExtractionSession();
  let boundedOpener;
  try {
    boundedOpener = createBoundedEntryOpener({
      intake,
      records: listing.files,
      session,
      makeIntake: intakeFromBytes,
      extract: (record, { signal, maxOutputBytes }) => extractFile(
        intake,
        record.sourcePath || record.name,
        { signal, maxOutputBytes },
      ),
    });
  } catch (error) {
    return errorResult('Archive exceeds safe browsing limits', error.message);
  }

  const records = boundedOpener.records.map((entry) => ({
    ...entry,
    disabledReason: disabledReason(entry, intake, session),
  }));
  const dirs = records.filter((entry) => entry.dir).length;
  const metadataEntries = records.filter((entry) => !entry.dir && !entry.regular).length;
  const sorted = records.slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const meta = listing.totalFiles + ' file' + (listing.totalFiles !== 1 ? 's' : '')
    + (dirs ? ' · ' + dirs + ' folder' + (dirs !== 1 ? 's' : '') : '')
    + (metadataEntries ? ' · ' + metadataEntries + ' metadata entr' + (metadataEntries === 1 ? 'y' : 'ies') : '')
    + (listing.totalSize > 0 ? ' · ' + fmtSize(listing.totalSize) + ' total' : '');
  const hint = records.some((entry) => !entry.disabledReason)
    ? '<div class="zip-hint">Click a file name to open it. Changes export as an update ZIP.</div>'
    : '';
  const bodyHtml =
    '<div class="zip-doc">'
    + '<div class="zip-meta">' + esc(meta) + '</div>'
    + hint
    + '<div class="table-wrap">'
    + '<table class="zip-table"><thead><tr><th>Name</th><th>Size</th></tr></thead>'
    + '<tbody>' + sorted.map(renderRow).join('') + '</tbody></table>'
    + '</div>'
    + '</div>';

  const archiveTree = {
    rootName: intake.filename || 'Archive',
    entries: records.map((entry) => ({
      name: entry.name,
      size: entry.size,
      dir: entry.dir,
      kind: entry.kind,
      encrypted: entry.encrypted,
      disabledReason: entry.disabledReason,
      deletable: entry.regular && !entry.pathIssue && entry.duplicateCount === 1,
    })),
  };

  return {
    bodyHtml,
    hadUnsafe: false,
    openEntry: (name) => boundedOpener.open(name),
    archiveTree,
    archiveCleanup: () => {
      boundedOpener.revoke();
      releaseArchive(intake);
    },
    archiveExportMode: 'update-zip',
    archiveSourceFormat: listing.format,
  };
}
