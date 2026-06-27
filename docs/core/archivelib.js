// Shared archive helper — lazy-loads libarchive.js (WASM) and exposes a thin listing +
// extraction API for 7z, RAR, tar, tar.gz, tar.bz2, tar.xz, and zip archives.
// The WASM binary (~1 MB) is only fetched when enableArchiveWasm is on and an archive file
// is actually opened. Uses a Web Worker via Comlink (bundled inside libarchive.js).

import { vendor } from './script-loader.js';

// Resolved URL of the vendor directory sibling.
const workerUrl = vendor('libarchive/worker-bundle.js');
const libUrl    = new URL('../vendor/libarchive/libarchive.js', import.meta.url).href;

let _archiveModule = null;

// Load libarchive.js once; the module is an ES module with named exports so we use
// dynamic import(). The worker URL is supplied explicitly to avoid the module resolving
// it from the ORIGINAL src path via import.meta.url.
async function loadLib() {
  if (_archiveModule) return _archiveModule;
  const mod = await import(/* @vite-ignore */ libUrl);
  mod.Archive.init({ workerUrl });
  _archiveModule = mod;
  return mod;
}

// Eager-load the WASM module without opening a file — used by the Advanced-settings opt-in
// to pre-download libarchive the moment the user enables archive support.
export async function preloadArchiveLib() { await loadLib(); }

// Extensions that belong to this handler (not zip — zip stays with JSZip).
const ARCHIVE_EXTS = new Set(['7z', 'rar', 'tar', 'tgz', 'tar.gz', 'tar.bz2', 'tar.xz', 'tar.zst']);

export function likelyArchive(intake) {
  const name = (intake.filename || '').toLowerCase();
  // Support compound extensions like .tar.gz before checking single extensions.
  if (name.endsWith('.tar.gz') || name.endsWith('.tar.bz2') || name.endsWith('.tar.xz') || name.endsWith('.tar.zst')) return true;
  const ext = name.includes('.') ? name.split('.').pop() : '';
  return ARCHIVE_EXTS.has(ext);
}

export function fmtSize(n) {
  if (n == null || n < 0) return '';
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1048576).toFixed(2) + ' MB';
}

// Build a File from intake bytes so libarchive can accept it.
function intakeToFile(intake) {
  const name = intake.filename || 'archive';
  // Use the original File handle if available (avoids double-buffering large files).
  if (intake.file instanceof File) return intake.file;
  return new File([intake.bytes], name, { type: intake.mimeType || 'application/octet-stream' });
}

// List an archive's contents. Returns { files: [{name, size, isDir}], totalFiles, totalSize }.
export async function listArchive(intake, { password = null } = {}) {
  const { Archive } = await loadLib();
  const file = intakeToFile(intake);
  const arch = await Archive.open(file);
  if (password != null) await arch.usePassword(password);
  const arr = await arch.getFilesArray();
  await arch.close();

  const files = arr.map(({ file: f, path }) => ({
    name: path,
    size: f ? f.size : 0,
    isDir: !f,
    compressedSize: null, // libarchive does not expose compressed size
  }));
  const fileEntries = files.filter((e) => !e.isDir);
  const totalSize = fileEntries.reduce((s, e) => s + (e.size || 0), 0);
  return { files, totalFiles: fileEntries.length, totalSize };
}

// Extract a single file entry by path from an archive. Returns Uint8Array.
export async function extractFile(intake, entryPath, { password = null } = {}) {
  const { Archive } = await loadLib();
  const file = intakeToFile(intake);
  const arch = await Archive.open(file);
  if (password != null) await arch.usePassword(password);
  const result = await arch.extractSingleFile(entryPath);
  await arch.close();
  return new Uint8Array(await result.arrayBuffer());
}
