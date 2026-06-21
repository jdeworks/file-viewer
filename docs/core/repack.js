// Shared zip repack-with-deletions helper. JSZip is vendored; this loads a zip, applies
// text/binary edits AND removes a set of entries, then returns a fresh Blob. The original
// download path is never touched — this is additive (download-on-save).
//
// repackZipWithDeletions(intake, { textEdits, binaryEdits, deletions }) → Blob
//   textEdits   : Map<entryName, string>
//   binaryEdits : Map<entryName, { getBytes: () => Promise<Uint8Array> }>
//   deletions   : Set<entryName>   (entries removed from the output)
import { loadGlobal, vendor } from './script-loader.js';

export async function repackZipWithDeletions(intake, opts = {}) {
  const { textEdits = new Map(), binaryEdits = new Map(), deletions = new Set() } = opts;
  const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
  const zip = await JSZip.loadAsync(intake.bytes);
  for (const name of deletions) {
    if (zip.file(name)) zip.remove(name);
  }
  for (const [name, text] of textEdits) { if (!deletions.has(name)) zip.file(name, text); }
  for (const [name, edit] of binaryEdits) { if (!deletions.has(name)) zip.file(name, await edit.getBytes()); }
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

// Returns true if there is anything to repack (an edit or a deletion).
export function hasRepackWork(opts = {}) {
  const { textEdits, binaryEdits, deletions } = opts;
  return !!((textEdits && textEdits.size) || (binaryEdits && binaryEdits.size) || (deletions && deletions.size));
}
