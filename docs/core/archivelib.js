// Shared archive helper — lazy-loads libarchive.js (WASM) and exposes a thin listing +
// extraction API for 7z, RAR, tar, tar.gz, tar.bz2, tar.xz, and zip archives.
// The WASM binary (~1 MB) is only fetched when enableArchiveWasm is on and an archive file
// is actually opened. Uses a Web Worker via Comlink (bundled inside libarchive.js).

import { vendor } from './script-loader.js';
import { ARCHIVE_ENTRY_LIMITS } from '../types/zip/safe-entry.js';

export const OFFLINE_DEPENDENCY_ERROR = 'FV_OFFLINE_DEPENDENCY_MISS';

// Resolved URL of the vendor directory sibling.
const workerUrl = vendor('libarchive/worker-bundle.js');
const libUrl    = new URL('../vendor/libarchive/libarchive.js', import.meta.url).href;
const wasmUrl   = vendor('libarchive/libarchive.wasm');
const codecWorkerUrl = new URL('./archive-codec-worker.js', import.meta.url);
const codecUrls = [
  vendor('libarchive/seek-bzip.js'),
  vendor('libarchive/xz-decompress.js'),
  vendor('libarchive/zstddec-stream.js'),
];

export const ARCHIVE_SOURCE_LIMITS = Object.freeze({
  warnBytes: 64 * 1024 * 1024,
  maxBytes: 256 * 1024 * 1024,
});

const approvedLargeSources = new WeakSet();
const standaloneResults = new WeakMap();

let _archiveModule = null;

// Load libarchive.js once; the module is an ES module with named exports so we use
// dynamic import(). The worker URL is supplied explicitly to avoid the module resolving
// it from the ORIGINAL src path via import.meta.url.
async function loadLib() {
  if (_archiveModule) return _archiveModule;
  let mod;
  try {
    mod = await import(/* @vite-ignore */ libUrl);
  } catch (error) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const miss = new Error(error?.message || 'Archive viewer dependency is not cached.');
      miss.code = OFFLINE_DEPENDENCY_ERROR;
      miss.cause = error;
      throw miss;
    }
    throw error;
  }
  _archiveModule = mod;
  return mod;
}

// Eager-load the WASM module without opening a file — used by the Advanced-settings opt-in
// to pre-download libarchive the moment the user enables archive support.
export async function preloadArchiveLib() {
  await loadLib();
  const responses = await Promise.all([workerUrl, wasmUrl, ...codecUrls].map((url) => fetch(url)));
  if (responses.some((response) => !response.ok)) throw new Error('Archive viewer download failed.');
  await Promise.all(responses.map((response) => response.arrayBuffer()));
}

// Extensions that belong to this handler (not zip — zip stays with JSZip).
const ARCHIVE_EXTS = new Set(['7z', 'rar', 'tar', 'tgz', 'tbz2', 'txz', 'gz', 'bz2', 'xz', 'zst']);

const hasMagic = (bytes, values) => bytes && bytes.length >= values.length
  && values.every((value, index) => bytes[index] === value);

export function likelyArchive(intake) {
  const name = (intake.filename || '').toLowerCase();
  // Support compound extensions like .tar.gz before checking single extensions.
  if (name.endsWith('.tar.gz') || name.endsWith('.tar.bz2') || name.endsWith('.tar.xz') || name.endsWith('.tar.zst')) return true;
  const ext = name.includes('.') ? name.split('.').pop() : '';
  if (ARCHIVE_EXTS.has(ext)) return true;
  const bytes = intake.bytes;
  return hasMagic(bytes, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])
    || hasMagic(bytes, [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07])
    || hasMagic(bytes, [0x1f, 0x8b])
    || hasMagic(bytes, [0x42, 0x5a, 0x68])
    || hasMagic(bytes, [0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00])
    || hasMagic(bytes, [0x28, 0xb5, 0x2f, 0xfd])
    || (bytes?.length >= 262 && String.fromCharCode(...bytes.subarray(257, 262)) === 'ustar');
}

export function standaloneArchiveStream(filename = '') {
  const name = String(filename).toLowerCase();
  if (/\.tar\.(gz|bz2|xz|zst)$/.test(name) || /\.(tgz|tbz2|txz)$/.test(name)) return false;
  return /\.(gz|bz2|xz|zst)$/.test(name);
}

export function standaloneStreamEntryName(filename = '') {
  const value = String(filename || '').replace(/\.(gz|bz2|xz|zst)$/i, '');
  return value && value !== filename ? value : 'contents';
}

export function archiveFormatFromFilename(filename = '') {
  const name = String(filename).toLowerCase();
  if (name.endsWith('.tar.gz') || name.endsWith('.tgz')) return 'tar.gz';
  if (name.endsWith('.tar.bz2') || name.endsWith('.tbz2')) return 'tar.bz2';
  if (name.endsWith('.tar.xz') || name.endsWith('.txz')) return 'tar.xz';
  if (name.endsWith('.tar.zst')) return 'tar.zst';
  return name.includes('.') ? name.split('.').pop() : 'archive';
}

export function archiveSourceStatus(intake, limits = ARCHIVE_SOURCE_LIMITS) {
  const size = Number(intake?.size ?? intake?.file?.size ?? intake?.bytes?.length ?? 0);
  if (!Number.isFinite(size) || size < 0) return { status: 'invalid', size: 0 };
  if (size > limits.maxBytes) return { status: 'too-large', size };
  if (intake?.truncated && !intake?.file) return { status: 'incomplete', size };
  if (size > limits.warnBytes && !approvedLargeSources.has(intake)) return { status: 'confirm', size };
  return { status: 'ok', size };
}

export function approveArchiveSource(intake) {
  if (intake && typeof intake === 'object') approvedLargeSources.add(intake);
}

function assertArchiveSource(intake) {
  const source = archiveSourceStatus(intake);
  if (source.status === 'too-large') {
    throw new Error('Archive is larger than the 256 MiB in-browser source limit.');
  }
  if (source.status === 'incomplete') {
    throw new Error('Only part of this archive is available and no original file handle can supply the remaining bytes.');
  }
  return source;
}

export function fmtSize(n) {
  if (n == null || n < 0) return '';
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1048576).toFixed(2) + ' MB';
}

// libarchive.js flattens its file object as `{ file, path }`, where `path` is the containing
// directory (with a trailing slash) and `file.name` is the basename. Some upstream versions may
// instead return a full path, so avoid duplicating an already-present basename.
export function archiveEntryName(file, path = '') {
  const parent = String(path || '').replace(/\\/g, '/');
  const basename = typeof file?.name === 'string' ? file.name.replace(/\\/g, '/') : '';
  if (!basename) return parent.replace(/\/$/, '');
  if (parent === basename || parent.endsWith('/' + basename)) return parent;
  return parent && !parent.endsWith('/') ? parent + '/' + basename : parent + basename;
}

// Build a File from intake bytes so libarchive can accept it.
function intakeToFile(intake) {
  const name = intake.filename || 'archive';
  // Use the original File handle if available (avoids double-buffering large files).
  if (typeof File !== 'undefined' && intake.file instanceof File) return intake.file;
  return new File([intake.bytes], name, { type: intake.mimeType || 'application/octet-stream' });
}

function standaloneCompressionFormat(filename = '') {
  const match = String(filename).toLowerCase().match(/\.(gz|bz2|xz|zst)$/);
  return match?.[1] || '';
}

function abortError(signal) {
  return signal?.reason || new DOMException('Aborted', 'AbortError');
}

async function decompressStandalone(intake, { signal = null, maxOutputBytes = ARCHIVE_ENTRY_LIMITS.maxEntryBytes } = {}) {
  const cached = standaloneResults.get(intake);
  if (cached) {
    if (cached.bytes.length > maxOutputBytes) {
      throw new Error('Decompressed stream exceeds the remaining archive session limit.');
    }
    return cached;
  }
  if (signal?.aborted) throw abortError(signal);

  const format = standaloneCompressionFormat(intake.filename);
  const source = intakeToFile(intake);
  const bytes = format === 'gz'
    ? await decompressGzip(source, { signal, maxOutputBytes })
    : await decompressWithCodecWorker(source, format, { signal, maxOutputBytes });
  const result = {
    bytes,
    name: standaloneStreamEntryName(intake.filename),
    format,
    compressedSize: source.size,
  };
  standaloneResults.set(intake, result);
  return result;
}

async function decompressGzip(source, { signal = null, maxOutputBytes = ARCHIVE_ENTRY_LIMITS.maxEntryBytes } = {}) {
  let decompressor;
  try {
    decompressor = new DecompressionStream('gzip');
  } catch {
    throw new Error('This browser cannot decompress standalone gzip streams.');
  }
  const reader = source.stream().pipeThrough(decompressor).getReader();
  const chunks = [];
  let total = 0;
  let timedOut = false;
  const abort = () => reader.cancel(abortError(signal)).catch(() => {});
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    reader.cancel(new Error('Standalone stream decompression timed out.')).catch(() => {});
  }, ARCHIVE_ENTRY_LIMITS.timeoutMs);
  try {
    while (true) {
      if (signal?.aborted) throw abortError(signal);
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = value instanceof Uint8Array ? value : new Uint8Array(value || 0);
      total += chunk.length;
      if (total > maxOutputBytes) {
        const message = maxOutputBytes < ARCHIVE_ENTRY_LIMITS.maxEntryBytes
          ? 'Decompressed stream exceeds the remaining archive session limit.'
          : `Decompressed stream exceeds the ${ARCHIVE_ENTRY_LIMITS.maxEntryBytes}-byte entry limit.`;
        throw new Error(message);
      }
      if (source.size > 0 && total / source.size > ARCHIVE_ENTRY_LIMITS.maxExpansionRatio) {
        throw new Error(`Stream expansion exceeds the ${ARCHIVE_ENTRY_LIMITS.maxExpansionRatio}:1 limit.`);
      }
      chunks.push(chunk);
    }
    if (timedOut) throw new Error('Standalone stream decompression timed out.');
    if (signal?.aborted) throw abortError(signal);
  } catch (error) {
    await reader.cancel(error).catch(() => {});
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

function decompressWithCodecWorker(source, format, {
  signal = null,
  maxOutputBytes = ARCHIVE_ENTRY_LIMITS.maxEntryBytes,
} = {}) {
  if (signal?.aborted) return Promise.reject(abortError(signal));
  const ratioLimit = source.size > 0
    ? Math.floor(source.size * ARCHIVE_ENTRY_LIMITS.maxExpansionRatio)
    : ARCHIVE_ENTRY_LIMITS.maxEntryBytes;
  const outputLimit = Math.max(1, Math.min(maxOutputBytes, ARCHIVE_ENTRY_LIMITS.maxEntryBytes, ratioLimit));

  return new Promise((resolve, reject) => {
    const worker = new Worker(codecWorkerUrl, { type: 'module' });
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      worker.terminate();
      callback(value);
    };
    const abort = () => finish(reject, abortError(signal));
    const timer = setTimeout(() => {
      finish(reject, new Error('Standalone stream decompression timed out.'));
    }, ARCHIVE_ENTRY_LIMITS.timeoutMs);
    signal?.addEventListener('abort', abort, { once: true });
    worker.onerror = (event) => finish(reject, new Error(event.message || 'Standalone stream decoder failed.'));
    worker.onmessage = ({ data }) => {
      if (data?.error) {
        const message = data.error.message === 'Decompressed stream exceeds the in-browser output limit.'
          ? (ratioLimit < Math.min(maxOutputBytes, ARCHIVE_ENTRY_LIMITS.maxEntryBytes)
              ? `Stream expansion exceeds the ${ARCHIVE_ENTRY_LIMITS.maxExpansionRatio}:1 limit.`
              : maxOutputBytes < ARCHIVE_ENTRY_LIMITS.maxEntryBytes
                ? 'Decompressed stream exceeds the remaining archive session limit.'
                : `Decompressed stream exceeds the ${ARCHIVE_ENTRY_LIMITS.maxEntryBytes}-byte entry limit.`)
          : data.error.message;
        const error = new Error(message || 'Standalone stream decoder failed.');
        error.name = data.error.name || 'Error';
        finish(reject, error);
        return;
      }
      const bytes = new Uint8Array(data?.bytes || 0);
      if (bytes.length > outputLimit) {
        finish(reject, new Error('Standalone stream decoder exceeded its output limit.'));
        return;
      }
      finish(resolve, bytes);
    };

    source.arrayBuffer().then((buffer) => {
      if (settled) return;
      worker.postMessage({ format, bytes: buffer, maxOutputBytes: outputLimit }, [buffer]);
    }).catch((error) => finish(reject, error));
  });
}

export function releaseArchive(intake) {
  if (intake && typeof intake === 'object') standaloneResults.delete(intake);
}

async function openArchive(file, signal = null) {
  const { Archive } = await loadLib();
  if (signal?.aborted) throw signal.reason || new DOMException('Aborted', 'AbortError');
  const worker = new Worker(workerUrl, { type: 'module' });
  const abort = () => worker.terminate();
  signal?.addEventListener('abort', abort, { once: true });
  // Archive.open reads this factory synchronously before its first await. Each operation therefore
  // owns a worker that can be terminated even if opening or extraction never settles.
  Archive.init({ getWorker: () => worker });
  try {
    const archive = await Archive.open(file);
    return { archive, worker, abort };
  } catch (error) {
    worker.terminate();
    signal?.removeEventListener('abort', abort);
    throw error;
  }
}

function normalizeRawEntries(rawEntries, intake, encryptedState) {
  const entries = rawEntries.map((entry) => {
    const sourcePath = String(entry?.path || '').replace(/\\/g, '/');
    const type = String(entry?.type || 'UNKNOWN');
    const sizeValue = Number(entry?.size);
    const size = Number.isFinite(sizeValue) && sizeValue >= 0 ? sizeValue : null;
    return {
      name: sourcePath,
      sourcePath,
      size,
      uncompressedSize: size,
      compressedSize: null,
      kind: type.toLowerCase().replaceAll('_', '-'),
      isDir: type === 'DIR',
      dir: type === 'DIR',
      regular: type === 'FILE',
      symlink: type === 'SYMBOLIC_LINK',
      encrypted: encryptedState === true,
      lastModified: Number(entry?.lastModified) || null,
    };
  });
  const regular = entries.filter((entry) => entry.regular);
  if (standaloneArchiveStream(intake.filename) && regular.length === 1) {
    regular[0].name = standaloneStreamEntryName(intake.filename);
  }
  return entries;
}

// List an archive's contents. Returns { files: [{name, size, isDir}], totalFiles, totalSize }.
export async function listArchive(intake, { password = null } = {}) {
  assertArchiveSource(intake);
  if (standaloneArchiveStream(intake.filename)) {
    const format = standaloneCompressionFormat(intake.filename);
    const entry = {
      name: standaloneStreamEntryName(intake.filename),
      sourcePath: standaloneStreamEntryName(intake.filename),
      size: null,
      uncompressedSize: null,
      compressedSize: Number(intake.size ?? intake.file?.size ?? intake.bytes?.length ?? 0),
      kind: 'file',
      isDir: false,
      dir: false,
      regular: true,
      symlink: false,
      encrypted: false,
      allowUnknownSize: true,
      lastModified: Number(intake.lastModified) || null,
    };
    return {
      files: [entry],
      totalFiles: 1,
      totalSize: 0,
      encryptedState: false,
      format,
    };
  }
  const file = intakeToFile(intake);
  const opened = await openArchive(file);
  try {
    if (password != null) await opened.archive.usePassword(password);
    const encryptedState = await opened.archive.hasEncryptedData();
    const listFiles = opened.archive.client?.listFiles;
    if (typeof listFiles !== 'function') {
      throw new Error('The installed archive reader does not expose safe raw entry metadata.');
    }
    const raw = await opened.archive.client.listFiles();
    if (!Array.isArray(raw)) throw new Error('Archive reader returned an invalid entry listing.');
    const files = normalizeRawEntries(raw, intake, encryptedState);
    const fileEntries = files.filter((entry) => entry.regular);
    const totalSize = fileEntries.reduce((sum, entry) => sum + (entry.size || 0), 0);
    return {
      files,
      totalFiles: fileEntries.length,
      totalSize,
      encryptedState,
      format: archiveFormatFromFilename(intake.filename),
    };
  } finally {
    await opened.archive.close().catch(() => {});
  }
}

// Extract a single file entry by path from an archive. Returns Uint8Array.
export async function extractFile(intake, entryPath, {
  password = null,
  signal = null,
  maxOutputBytes = ARCHIVE_ENTRY_LIMITS.maxEntryBytes,
} = {}) {
  assertArchiveSource(intake);
  if (standaloneArchiveStream(intake.filename)) {
    const stream = await decompressStandalone(intake, { signal, maxOutputBytes });
    if (entryPath !== stream.name) throw new Error('Archive entry was not found.');
    if (signal?.aborted) throw abortError(signal);
    return stream.bytes;
  }
  const file = intakeToFile(intake);
  const opened = await openArchive(file, signal);
  try {
    if (password != null) await opened.archive.usePassword(password);
    const result = await opened.archive.extractSingleFile(entryPath);
    if (!result) throw new Error('Archive entry was not found.');
    return new Uint8Array(await result.arrayBuffer());
  } finally {
    signal?.removeEventListener('abort', opened.abort);
    await opened.archive.close().catch(() => opened.worker.terminate());
  }
}
