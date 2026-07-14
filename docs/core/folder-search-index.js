// Bounded, idle-time content cache for folder search. It warms small local text files without
// blocking intake; foreground search can still read uncached files so the cache never changes
// correctness. Binary-looking files are remembered as null to avoid repeated reads.

const DEFAULT_MAX_FILE_BYTES = 2 * 1024 * 1024;
const DEFAULT_MAX_CACHE_BYTES = 16 * 1024 * 1024;
const DEFAULT_MAX_CACHE_ENTRIES = 2000;
const IDLE_BATCH = 12;

function waitForIdle() {
  if (typeof requestIdleCallback === 'function') {
    return new Promise((resolve) => requestIdleCallback(resolve, { timeout: 120 }));
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export function createFolderSearchIndex(entries, {
  maxFileBytes = DEFAULT_MAX_FILE_BYTES,
  maxCacheBytes = DEFAULT_MAX_CACHE_BYTES,
  maxCacheEntries = DEFAULT_MAX_CACHE_ENTRIES,
} = {}) {
  const values = new Map();
  const pending = new Map();
  const candidates = [];
  let reservedBytes = 0;
  let cancelled = false;

  const info = {
    eligible: 0,
    scheduled: 0,
    indexed: 0,
    complete: false,
    cancelled: false,
  };

  for (const entry of entries || []) {
    if (typeof entry.file?.text !== 'function' || entry.file.size > maxFileBytes) continue;
    info.eligible++;
    if (candidates.length >= maxCacheEntries || reservedBytes + entry.file.size > maxCacheBytes) continue;
    candidates.push(entry);
    reservedBytes += entry.file.size;
  }
  info.scheduled = candidates.length;
  const cacheable = new Set(candidates.map((entry) => entry.path));

  async function read(entry, { cache = true } = {}) {
    const path = entry?.path;
    if (!path || typeof entry.file?.text !== 'function' || entry.file.size > maxFileBytes) return null;
    if (values.has(path)) return values.get(path);
    if (pending.has(path)) return pending.get(path);

    const shouldCache = cache && cacheable.has(path);
    const promise = entry.file.text()
      .then((text) => text.includes('\0') ? null : text)
      .catch(() => null)
      .then((text) => {
        if (shouldCache && !cancelled) {
          values.set(path, text);
          info.indexed = values.size;
        }
        return text;
      })
      .finally(() => pending.delete(path));
    if (shouldCache) pending.set(path, promise);
    return promise;
  }

  const done = (async () => {
    for (let offset = 0; offset < candidates.length && !cancelled; offset += IDLE_BATCH) {
      await waitForIdle();
      const batch = candidates.slice(offset, offset + IDLE_BATCH);
      for (const entry of batch) {
        if (cancelled) break;
        await read(entry);
      }
    }
    info.complete = !cancelled;
    return info;
  })();

  return {
    info,
    done,
    read,
    has: (path) => values.has(path),
    get: (path) => values.get(path),
    cancel() {
      cancelled = true;
      info.complete = false;
      info.cancelled = true;
      values.clear();
      pending.clear();
    },
  };
}
