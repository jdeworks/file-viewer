// Comic archive reader. Container directories are listed up front, but page bytes are extracted
// only when the renderer asks for them. This keeps a large CBZ from expanding every image merely
// to open the reader. .cbr/.cb7/.cbt use the same descriptor interface through opt-in libarchive.
import { loadGlobal, vendor } from '../../../core/script-loader.js';

const IMAGE_RE = /\.(jpe?g|png|gif|webp|avif|bmp)$/i;
const MIME_BY_EXTENSION = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', avif: 'image/avif', bmp: 'image/bmp',
};

export const COMIC_LIMITS = Object.freeze({
  maxPages: 2000,
  maxPageBytes: 64 * 1024 * 1024,
  maxActivePages: 8,
  maxActiveBytes: 192 * 1024 * 1024,
  maxConcurrentLoads: 2,
  initialPages: 3,
});

export const COMIC_RESOURCE_LIMIT_CODE = 'FV_COMIC_RESOURCE_LIMIT';

function boundedLimit(value, maximum) {
  return Number.isSafeInteger(value) && value > 0 ? Math.min(value, maximum) : maximum;
}

function resourceLimitError(message) {
  const error = new Error(message);
  error.code = COMIC_RESOURCE_LIMIT_CODE;
  return error;
}

function mimeForName(name) {
  const extension = String(name).split('.').pop().toLowerCase();
  return MIME_BY_EXTENSION[extension] || 'application/octet-stream';
}

function declaredSize(entry) {
  const size = entry?._data?.uncompressedSize ?? entry?.uncompressedSize ?? entry?.size;
  return Number.isSafeInteger(size) && size >= 0 ? size : null;
}

// Natural sort so 2.jpg < 10.jpg (comic pages are number-named).
function naturalCmp(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

// Identify the container from magic bytes: PK = zip (.cbz), Rar! = rar (.cbr), 7z = 7-zip.
// POSIX/GNU tar (.cbt) has no magic at offset 0 — the "ustar" marker sits at offset 257, so a
// short buffer (e.g. a small metadata-only read) won't classify as tar; that's fine, we only
// need this for the full-file open/inspect path.
export function archiveKind(bytes) {
  const b = bytes;
  if (!b || b.length < 4) return 'unknown';
  if (b[0] === 0x50 && b[1] === 0x4b) return 'zip';                                   // PK
  if (b[0] === 0x52 && b[1] === 0x61 && b[2] === 0x72 && b[3] === 0x21) return 'rar'; // Rar!
  if (b[0] === 0x37 && b[1] === 0x7a && b[2] === 0xbc && b[3] === 0xaf) return '7z';  // 7z BC AF 27
  if (b.length >= 262 && b[257] === 0x75 && b[258] === 0x73 && b[259] === 0x74 &&
      b[260] === 0x61 && b[261] === 0x72) return 'tar';                              // ustar @ 257
  return 'unknown';
}

export function comicPagesFromNames(names) {
  return names
    .filter((n) => IMAGE_RE.test(n) && !n.split('/').pop().startsWith('.'))
    .sort(naturalCmp);
}

function pageDescriptor(name, size, extract, maxPageBytes) {
  const tooLarge = size !== null && size > maxPageBytes;
  return {
    name,
    size,
    tooLarge,
    async loadBlob() {
      if (tooLarge) throw resourceLimitError(`${name} exceeds the ${maxPageBytes}-byte page limit`);
      const value = await extract();
      const blob = value instanceof Blob ? value : new Blob([value], { type: mimeForName(name) });
      if (blob.size > maxPageBytes) throw resourceLimitError(`${name} exceeds the ${maxPageBytes}-byte page limit`);
      return blob.type ? blob : blob.slice(0, blob.size, mimeForName(name));
    },
  };
}

function boundedPageSet(names, getEntry, extract, options = {}) {
  const maxPages = boundedLimit(options.maxPages, COMIC_LIMITS.maxPages);
  const maxPageBytes = boundedLimit(options.maxPageBytes, COMIC_LIMITS.maxPageBytes);
  const sorted = comicPagesFromNames(names);
  const selected = sorted.slice(0, maxPages);
  const pages = selected.map((name) => {
    const entry = getEntry(name);
    return pageDescriptor(name, declaredSize(entry), () => extract(entry, name), maxPageBytes);
  });
  return {
    pages,
    totalPages: sorted.length,
    truncatedPages: Math.max(0, sorted.length - pages.length),
    oversizedPages: pages.filter((page) => page.tooLarge).length,
  };
}

// Exported for focused resource tests and for the production JSZip path below. Constructing these
// descriptors does not call entry.async(); extraction starts only when loadBlob() is requested.
export function comicFromZip(zip, options = {}) {
  const files = zip?.files || Object.create(null);
  const names = Object.keys(files).filter((name) => !files[name]?.dir);
  return boundedPageSet(
    names,
    (name) => files[name],
    (entry) => entry.async('blob'),
    options,
  );
}

// Small LRU of active blob URLs. The renderer clears an evicted image before its URL is revoked,
// and dispose() revokes everything even if the preview is replaced mid-extraction.
export function createComicPageCache(options = {}) {
  const maxActivePages = boundedLimit(options.maxActivePages, COMIC_LIMITS.maxActivePages);
  const maxActiveBytes = boundedLimit(options.maxActiveBytes, COMIC_LIMITS.maxActiveBytes);
  const maxPageBytes = boundedLimit(options.maxPageBytes, COMIC_LIMITS.maxPageBytes);
  const maxConcurrentLoads = boundedLimit(options.maxConcurrentLoads, COMIC_LIMITS.maxConcurrentLoads);
  const createObjectURL = options.createObjectURL || ((blob) => URL.createObjectURL(blob));
  const revokeObjectURL = options.revokeObjectURL || ((url) => URL.revokeObjectURL(url));
  const onEvict = typeof options.onEvict === 'function' ? options.onEvict : () => {};
  const active = new Map();
  const pending = new Map();
  const queue = [];
  let activeBytes = 0;
  let running = 0;
  let disposed = false;

  function closedError() { return new Error('Comic page cache is closed'); }

  function drainQueue() {
    if (disposed) {
      while (queue.length) queue.shift().reject(closedError());
      return;
    }
    while (running < maxConcurrentLoads && queue.length) {
      const job = queue.shift();
      running++;
      Promise.resolve().then(job.run).then(job.resolve, job.reject).finally(() => {
        running--;
        drainQueue();
      });
    }
  }

  function schedule(run) {
    return new Promise((resolve, reject) => {
      queue.push({ run, resolve, reject });
      drainQueue();
    });
  }

  function evict(index) {
    const record = active.get(index);
    if (!record) return;
    active.delete(index);
    activeBytes -= record.size;
    try { onEvict(index, record.url); } catch { /* cleanup remains best-effort */ }
    try { revokeObjectURL(record.url); } catch { /* cleanup remains best-effort */ }
  }

  function enforce(keepIndex) {
    while (active.size > maxActivePages || activeBytes > maxActiveBytes) {
      const oldest = active.keys().next().value;
      if (oldest === undefined) break;
      if (oldest === keepIndex && active.size === 1) break;
      if (oldest === keepIndex) {
        const keep = active.get(oldest);
        active.delete(oldest);
        active.set(oldest, keep);
        continue;
      }
      evict(oldest);
    }
  }

  async function load(index, page) {
    if (disposed) throw closedError();
    if (active.has(index)) {
      const record = active.get(index);
      active.delete(index);
      active.set(index, record);
      return record.url;
    }
    if (pending.has(index)) return pending.get(index);
    if (page.size !== null && page.size > maxPageBytes) {
      throw resourceLimitError(`${page.name} exceeds the ${maxPageBytes}-byte page limit`);
    }

    const promise = schedule(async () => {
      const blob = await page.loadBlob();
      if (!(blob instanceof Blob)) throw new TypeError('Comic page extractor did not return a Blob');
      if (blob.size > maxPageBytes || blob.size > maxActiveBytes) {
        throw resourceLimitError(`${page.name} exceeds the active comic resource limit`);
      }
      if (disposed) throw closedError();
      const url = createObjectURL(blob);
      active.set(index, { url, size: blob.size });
      activeBytes += blob.size;
      enforce(index);
      return url;
    });
    pending.set(index, promise);
    try { return await promise; }
    finally { pending.delete(index); }
  }

  return {
    load,
    touch(index) {
      if (!active.has(index)) return false;
      const record = active.get(index);
      active.delete(index);
      active.set(index, record);
      return true;
    },
    release: evict,
    dispose() {
      if (disposed) return;
      disposed = true;
      drainQueue();
      for (const index of [...active.keys()]) evict(index);
    },
    stats() { return { activePages: active.size, activeBytes, pendingPages: pending.size, disposed }; },
  };
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

// Open a comic into lazy page descriptors. No page bytes or blob URLs are produced here.
export async function openComic(intake, { enableArchiveWasm = false } = {}) {
  const kind = archiveKind(intake.bytes);

  if (kind === 'zip') {
    const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
    const zip = await JSZip.loadAsync(intake.bytes);
    return { kind: 'zip', ...comicFromZip(zip) };
  }

  if ((kind === 'rar' || kind === '7z' || kind === 'tar') && enableArchiveWasm) {
    const { listArchive, extractFile } = await import('../../../core/archivelib.js');
    const listing = await listArchive(intake);
    const imageEntries = listing.files
      .filter((e) => !e.isDir && IMAGE_RE.test(e.name) && !e.name.split('/').pop().startsWith('.'))
      .sort((a, b) => naturalCmp(a.name, b.name));
    const byName = new Map(imageEntries.map((entry) => [entry.name, entry]));
    const lazy = boundedPageSet(
      imageEntries.map((entry) => entry.name),
      (name) => byName.get(name),
      async (_entry, name) => new Blob([await extractFile(intake, name)], { type: mimeForName(name) }),
    );
    return { kind, ...lazy };
  }

  // RAR/7z/tar without WASM enabled, or unknown format — caller shows a friendly note.
  return { kind };
}
