// Export a loaded folder back out as a .zip (drop-in replacement), preserving the directory
// structure. Edited files use their in-memory edited text; untouched files are zipped straight
// from their File handle (no full read in JS — JSZip streams the Blob). Vendored JSZip, no upload.
import { loadGlobal, vendor } from './script-loader.js';

// entries: [{ file, path }]. edits: Map<path, string> of edited text. Returns a Blob.
export async function exportFolderZip(entries, edits, { changedOnly = false } = {}) {
  const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
  const zip = new JSZip();
  let count = 0;
  for (const e of entries) {
    const edited = edits.get(e.path);
    if (changedOnly && edited == null) continue;
    zip.file(e.path, edited != null ? edited : e.file);   // JSZip accepts a string or a Blob/File
    count++;
  }
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  return { blob, count };
}
