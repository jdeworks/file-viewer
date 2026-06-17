// Export a loaded folder back out as a .zip (drop-in replacement), preserving the directory
// structure. Edited files use their in-memory edited text; untouched files are zipped straight
// from their File handle (no full read in JS — JSZip streams the Blob). Vendored JSZip, no upload.
import { loadGlobal, vendor } from './script-loader.js';

// entries: [{ file, path }]. edits: Map<path, string> of edited text.
// moves: Map<originalPath, newPath> for in-memory virtual moves. Returns a Blob.
export async function exportFolderZip(entries, edits, { changedOnly = false, moves = null } = {}) {
  const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
  const zip = new JSZip();
  let count = 0;
  for (const e of entries) {
    const origin = e.originalPath || e.path;
    const edited = edits.get(e.path);
    const moved = moves && moves.has(origin);
    if (changedOnly && edited == null && !moved) continue;
    const zipPath = (moves && moves.get(origin)) || e.path;
    zip.file(zipPath, edited != null ? edited : e.file);   // JSZip accepts a string or a Blob/File
    count++;
  }
  if (moves && moves.size > 0) {
    let sh = '#!/bin/bash\n# Folder reorganization - run this to apply moves on disk\n';
    const q = (s) => "'" + String(s).replace(/'/g, "'\\''") + "'";
    for (const [src, dest] of moves) sh += `mkdir -p ${q(dest.split('/').slice(0, -1).join('/') || '.')}\nmv ${q(src)} ${q(dest)}\n`;
    zip.file('_moves.sh', sh);
  }
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  return { blob, count };
}
