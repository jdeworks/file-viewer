// Shared zip helpers (vendored JSZip — no extraction, just the central-directory listing).
import { loadGlobal, vendor } from '../../core/script-loader.js';

export function fmtSize(n) {
  if (n == null) return '';
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1048576).toFixed(2) + ' MB';
}

export async function readZip(intake) {
  const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
  const zip = await JSZip.loadAsync(intake.bytes);
  const entries = Object.keys(zip.files).map((k) => zip.files[k]);
  const files = entries.filter((e) => !e.dir);
  const folders = entries.filter((e) => e.dir);
  let totalU = 0, totalC = 0;
  for (const f of files) {
    const d = f._data || {};
    totalU += d.uncompressedSize || 0;
    totalC += d.compressedSize || 0;
  }
  return { files, folders, totalU, totalC, ratio: totalU > 0 ? Math.round((1 - totalC / totalU) * 100) : 0 };
}
