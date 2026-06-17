// Comic archive reader. .cbz is a ZIP of page images → we read it with the already-vendored JSZip
// (no new dependency) and hand back the sorted page entries. .cbr/.cb7 need libarchive.wasm
// (opt-in via enableArchiveWasm setting) — openComic() accepts an options object for that.
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
  if (b[0] === 0x50 && b[1] === 0x4b) return 'zip';                                   // PK
  if (b[0] === 0x52 && b[1] === 0x61 && b[2] === 0x72 && b[3] === 0x21) return 'rar'; // Rar!
  if (b[0] === 0x37 && b[1] === 0x7a && b[2] === 0xbc && b[3] === 0xaf) return '7z';  // 7z BC AF 27
  return 'unknown';
}

export function comicPagesFromNames(names) {
  return names
    .filter((n) => IMAGE_RE.test(n) && !n.split('/').pop().startsWith('.'))
    .sort(naturalCmp);
}

export async function inspectComic(intake) {
  const kind = archiveKind(intake.bytes);
  if (kind !== 'zip') return { kind };
  const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
  const zip = await JSZip.loadAsync(intake.bytes);
  const entries = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
  const pages = comicPagesFromNames(entries);
  return { kind, files: entries.length, pages };
}

// Open a .cbz → { kind:'zip', pages:[{ name, blobUrl }] } with image pages natural-sorted. Blob
// URLs are created for each page and must be revoked by the caller (renderer's revoke()).
// For .cbr/.cb7 with enableArchiveWasm=true, calls archivelib to extract each image entry.
export async function openComic(intake, { enableArchiveWasm = false } = {}) {
  const kind = archiveKind(intake.bytes);

  if (kind === 'zip') {
    const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
    const zip = await JSZip.loadAsync(intake.bytes);
    const names = comicPagesFromNames(Object.keys(zip.files).filter((n) => !zip.files[n].dir));
    const pages = [];
    for (const name of names) {
      const blob = await zip.files[name].async('blob');
      pages.push({ name, blobUrl: URL.createObjectURL(blob) });
    }
    return { kind: 'zip', pages };
  }

  if ((kind === 'rar' || kind === '7z') && enableArchiveWasm) {
    const { listArchive, extractFile } = await import('../../../core/archivelib.js');
    const listing = await listArchive(intake);
    const imageNames = listing.files
      .filter((e) => !e.isDir && IMAGE_RE.test(e.name) && !e.name.split('/').pop().startsWith('.'))
      .map((e) => e.name)
      .sort(naturalCmp);
    const pages = [];
    for (const name of imageNames) {
      const bytes = await extractFile(intake, name);
      const ext = name.split('.').pop().toLowerCase();
      const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', bmp: 'image/bmp' };
      const mime = mimeMap[ext] || 'image/jpeg';
      const blob = new Blob([bytes], { type: mime });
      pages.push({ name, blobUrl: URL.createObjectURL(blob) });
    }
    return { kind, pages };
  }

  // RAR/7z without WASM enabled, or unknown format — caller shows a friendly note.
  return { kind };
}
