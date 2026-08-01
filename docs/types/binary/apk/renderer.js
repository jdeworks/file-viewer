import { loadGlobal, vendor } from '../../../core/script-loader.js';
import { intakeFromBytes } from '../../../core/intake.js';
import { compressionMethodName, fmtSize, listCentralDirectory } from '../../zip/ziplib.js';
import {
  ARCHIVE_ENTRY_LIMITS,
  ArchiveEntryError,
  createBoundedEntryOpener,
  getPageArchiveExtractionSession,
} from '../../zip/safe-entry.js';
import { analyzeAndroidPackage } from './layout.js';

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function entryBlockReason(record) {
  if (record.dir) return 'Directory';
  if (record.symlink) return 'Symbolic link';
  if (record.pathIssue) return `Unsafe ${record.pathIssue}`;
  if (record.duplicateCount > 1) return `Duplicate name ${record.duplicateIndex}/${record.duplicateCount}`;
  if (record.encrypted) return `${record.encryptionLabel || 'Encrypted'} entry`;
  if (!Number.isFinite(record.uncompressedSize)) return 'Unknown size';
  if (record.uncompressedSize > ARCHIVE_ENTRY_LIMITS.maxEntryBytes) return 'Too large to open';
  if (record.uncompressedSize > 0 && Number.isFinite(record.compressedSize)
      && (record.compressedSize === 0
        || record.uncompressedSize / record.compressedSize > ARCHIVE_ENTRY_LIMITS.maxExpansionRatio)) {
    return 'Expansion ratio too high';
  }
  return null;
}

function entryRows(records) {
  return records.map((record) => {
    const reason = entryBlockReason(record);
    const displayName = record.duplicateCount > 1
      ? `${record.name} [${record.duplicateIndex}/${record.duplicateCount}]`
      : record.name;
    const name = reason
      ? `<span class="apk-entry-name">${esc(displayName)}</span><span class="apk-entry-blocked">${esc(reason)}</span>`
      : `<button type="button" class="apk-entry-open" data-fv-open="${esc(record.name)}">${esc(displayName)}</button>`;
    return `<tr><td>${name}</td><td class="apk-entry-size">${record.dir ? '' : esc(fmtSize(record.uncompressedSize))}</td>`
      + `<td class="apk-entry-method">${record.dir ? '' : esc(compressionMethodName(record.method))}</td></tr>`;
  }).join('');
}

export async function render(intake, ctx = {}) {
  const bytes = intake.bytes;
  if (!bytes || bytes.length < 4) {
    return { bodyHtml: '<div class="apk-preview"><p class="apk-note">Too small to parse.</p></div>' };
  }

  const central = listCentralDirectory(bytes, { maxEntries: ARCHIVE_ENTRY_LIMITS.maxEntries + 1 });
  if (!central) {
    return { bodyHtml: '<div class="apk-preview"><p class="apk-note">Could not read the ZIP central directory.</p></div>' };
  }
  if (central.declaredEntries > ARCHIVE_ENTRY_LIMITS.maxEntries || central.truncated) {
    return { bodyHtml: `<div class="apk-preview"><p class="apk-note">Package contains ${central.declaredEntries} entries; the safe inventory limit is ${ARCHIVE_ENTRY_LIMITS.maxEntries}.</p></div>` };
  }

  const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
  let zip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch (error) {
    return { bodyHtml: `<div class="apk-preview"><p class="apk-note">Could not open package: ${esc(error.message)}</p></div>` };
  }

  const ext = (intake.filename || '').match(/\.(apk|aab|xapk)$/i)?.[1]?.toLowerCase() || 'apk';
  const centralEntries = [...central.files, ...central.folders].sort((a, b) => a.index - b.index);
  const files = central.files.map((entry) => entry.name);
  const layout = analyzeAndroidPackage(files, bytes, ext);
  let jarManifestInfo = null;
  if (layout.jarManifestPath) {
    const manifestMeta = central.files.find((entry) => entry.name === layout.jarManifestPath);
    if (manifestMeta && manifestMeta.uncompressedSize <= 64 * 1024) {
      const text = await zip.file(layout.jarManifestPath)?.async('string');
      jarManifestInfo = text?.split('\n').slice(0, 3).map((line) => line.trim()).filter(Boolean).join('; ') || null;
    }
  }

  let opener;
  try {
    opener = createBoundedEntryOpener({
      intake,
      records: centralEntries,
      session: intake.archiveExtractionSession || getPageArchiveExtractionSession(),
      makeIntake: intakeFromBytes,
      extract: async (record, { signal }) => {
        const entry = zip.file(record.name);
        if (!entry) throw new ArchiveEntryError('missing-entry', `Could not locate ${record.name}.`);
        const output = await entry.async('uint8array');
        if (signal.aborted) throw signal.reason || new ArchiveEntryError('stale', 'A newer archive entry request replaced this extraction.');
        return output;
      },
    });
  } catch (error) {
    return { bodyHtml: `<div class="apk-preview"><p class="apk-note">Could not inventory package: ${esc(error.message)}</p></div>` };
  }

  const rows = [];
  if (layout.kind === 'xapk') {
    if (!layout.embeddedApks.length) rows.push('<tr><td colspan="2" style="color:var(--fg-2);font-size:.8em">⚠ No embedded APK files found</td></tr>');
    rows.push(`<tr><td class="apk-key">Embedded APKs</td><td>${layout.embeddedApks.length}${layout.embeddedApks.length ? ` (${esc(layout.embeddedApks.join(', '))})` : ''}</td></tr>`);
    rows.push(`<tr><td class="apk-key">Descriptor</td><td>${layout.descriptor ? esc(layout.descriptor) : 'manifest.json not found'}</td></tr>`);
  } else {
    if (!layout.manifestFiles.length) {
      rows.push(`<tr><td colspan="2" style="color:var(--fg-2);font-size:.8em">⚠ ${layout.kind === 'aab' ? 'Module AndroidManifest.xml' : 'AndroidManifest.xml'} not found</td></tr>`);
    }
    rows.push(`<tr><td class="apk-key">Manifest files</td><td>${layout.manifestFiles.length}${layout.manifestFiles.length ? ` (${esc(layout.manifestFiles.join(', '))})` : ''}</td></tr>`);
    rows.push(`<tr><td class="apk-key">DEX files</td><td>${layout.dexFiles.length}${layout.dexFiles.length ? ` (${esc(layout.dexFiles.join(', '))})` : ''}</td></tr>`);
    if (layout.abiDirs.length) rows.push(`<tr><td class="apk-key">Native ABIs</td><td>${esc(layout.abiDirs.join(', '))}</td></tr>`);
    rows.push(`<tr><td class="apk-key">Resources</td><td>${layout.resources.length ? esc(layout.resources.join(', ')) : 'none detected'}</td></tr>`);
    if (layout.assetCount) rows.push(`<tr><td class="apk-key">Assets</td><td>${layout.assetCount} files</td></tr>`);
  }
  rows.push(`<tr><td class="apk-key">Total files</td><td>${layout.entries.length}</td></tr>`);
  rows.push(`<tr><td class="apk-key">Signature evidence</td><td>${esc(layout.signatureEvidence)}</td></tr>`);

  const blocked = opener.records.filter(entryBlockReason).length;
  const contentsMeta = `${opener.records.length} entries${blocked ? ` · ${blocked} shown but not openable` : ''}`;
  const archiveTreeEntries = opener.records
    .filter((record) => !entryBlockReason(record))
    .map((record) => ({ name: record.name, size: record.uncompressedSize, dir: false, encrypted: false }));

  return { bodyHtml: `<div class="apk-preview">
  <div class="apk-header">
    <span class="apk-badge">${esc(layout.kind.toUpperCase())}</span>
    <span class="apk-title">${esc(intake.filename || 'Android Package')}</span>
  </div>
  <table class="apk-table">${rows.join('')}</table>
  ${jarManifestInfo ? `<p class="apk-note apk-signer">JAR manifest metadata (not signer identity): ${esc(jarManifestInfo)}</p>` : ''}
  <section class="apk-contents" aria-labelledby="apkContentsHeading">
    <h2 id="apkContentsHeading">Contents</h2>
    <p class="apk-note">${esc(contentsMeta)}. Openable files are inspected locally through the normal file viewer.</p>
    <div class="table-wrap"><table class="apk-entry-table"><thead><tr><th>Name</th><th>Size</th><th>Method</th></tr></thead>
      <tbody>${entryRows(opener.records)}</tbody></table></div>
  </section>
</div>`,
    openEntry: async (selector) => {
      try {
        return await opener.open(selector);
      } catch (error) {
        ctx.toast?.(error.message || 'Could not open package entry.');
        throw error;
      }
    },
    archiveTree: archiveTreeEntries.length ? {
      rootName: intake.filename || 'Android Package',
      entries: archiveTreeEntries,
    } : null,
    archiveCleanup: () => opener.revoke(),
    archiveExportMode: 'repack-zip',
    archiveSourceFormat: 'zip',
  };
}
