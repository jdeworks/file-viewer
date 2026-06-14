// Comic archive reader. .cbz is a ZIP of page images → we read it with the already-vendored JSZip
// (no new dependency) and hand back the sorted page entries. .cbr is a RAR archive, which needs a
// RAR decompressor we don't vendor yet (planned opt-in) — we detect it and say so, no crash.
import { loadGlobal, vendor } from '../../../core/script-loader.js';

const IMAGE_RE = /\.(jpe?g|png|gif|webp|avif|bmp)$/i;

// Natural sort so 2.jpg < 10.jpg (comic pages are number-named).
function naturalCmp(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

// Identify the container from magic bytes: PK = zip (.cbz), Rar! = rar (.cbr), 7z = 7-zip.
export function archiveKind(bytes) {
  const b = bytes;
  if (!b || b.length < 4) return 'unknown';
  if (b[0] === 0x50 && b[1] === 0x4b) return 'zip';                                  // PK
  if (b[0] === 0x52 && b[1] === 0x61 && b[2] === 0x72 && b[3] === 0x21) return 'rar'; // Rar!
  if (b[0] === 0x37 && b[1] === 0x7a && b[2] === 0xbc && b[3] === 0xaf) return '7z';  // 7z¼¯
  return 'unknown';
}

// Open a .cbz → { kind:'zip', pages:[{ name, blobUrl }] } with image pages natural-sorted. Blob
// URLs are created for each page and must be revoked by the caller (renderer's revoke()).
export async function openComic(intake) {
  const kind = archiveKind(intake.bytes);
  if (kind !== 'zip') return { kind };          // rar / 7z / unknown → caller shows a friendly note
  const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
  const zip = await JSZip.loadAsync(intake.bytes);
  const names = Object.keys(zip.files)
    .filter((n) => !zip.files[n].dir && IMAGE_RE.test(n) && !n.split('/').pop().startsWith('.'))
    .sort(naturalCmp);
  const pages = [];
  for (const name of names) {
    const blob = await zip.files[name].async('blob');
    pages.push({ name, blobUrl: URL.createObjectURL(blob) });
  }
  return { kind: 'zip', pages };
}
