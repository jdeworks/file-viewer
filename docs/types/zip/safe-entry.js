// Shared resource bounds for opening one entry from a ZIP-derived container.
// The central directory is cheap to inspect; extraction is allowed only after its declared sizes
// pass these checks, and the actual result is checked again before it reaches normal file intake.

export const ARCHIVE_ENTRY_LIMITS = Object.freeze({
  maxEntries: 10000,
  maxEntryBytes: 64 * 1024 * 1024,
  maxSessionBytes: 256 * 1024 * 1024,
  maxExpansionRatio: 1000,
  maxNestedDepth: 3,
  timeoutMs: 15000,
});

export class ArchiveEntryError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ArchiveEntryError';
    this.code = code;
  }
}

export function archivePathIssue(name) {
  const value = String(name || '').replace(/\\/g, '/');
  if (!value || value.includes('\0')) return 'invalid path';
  if (value.startsWith('/') || /^[a-z]:\//i.test(value)) return 'absolute path';
  if (value.split('/').some((part) => part === '..')) return 'parent traversal';
  return null;
}

function entrySize(entry, key) {
  const direct = Number(entry?.[key]);
  if (Number.isFinite(direct) && direct >= 0) return direct;
  const nested = Number(entry?._data?.[key]);
  return Number.isFinite(nested) && nested >= 0 ? nested : null;
}

export function describeArchiveEntries(entries, limits = ARCHIVE_ENTRY_LIMITS) {
  const source = Array.isArray(entries) ? entries : [];
  if (source.length > limits.maxEntries) {
    throw new ArchiveEntryError('too-many-entries',
      `Archive contains ${source.length} entries; the limit is ${limits.maxEntries}.`);
  }
  const totals = new Map();
  for (const entry of source) totals.set(entry.name, (totals.get(entry.name) || 0) + 1);
  const seen = new Map();
  return source.map((entry, index) => {
    const duplicateIndex = (seen.get(entry.name) || 0) + 1;
    seen.set(entry.name, duplicateIndex);
    return {
      ...entry,
      index,
      key: `${index}:${entry.name}`,
      duplicateIndex,
      duplicateCount: totals.get(entry.name) || 1,
      pathIssue: archivePathIssue(entry.name),
      uncompressedSize: entrySize(entry, 'uncompressedSize'),
      compressedSize: entrySize(entry, 'compressedSize'),
      symlink: !!entry.symlink,
    };
  });
}

export function assertEntryMayOpen(record, {
  depth = 0,
  extractedBytes = 0,
  limits = ARCHIVE_ENTRY_LIMITS,
} = {}) {
  if (!record) throw new ArchiveEntryError('missing-entry', 'Archive entry was not found.');
  if (record.dir) throw new ArchiveEntryError('directory', 'Directories cannot be opened as files.');
  if (record.symlink) throw new ArchiveEntryError('symlink', 'Symbolic-link entries are shown as metadata only.');
  if (record.pathIssue) throw new ArchiveEntryError('unsafe-path', `Entry has an unsafe ${record.pathIssue}.`);
  if (record.duplicateCount > 1) {
    throw new ArchiveEntryError('duplicate-name',
      `Entry name is duplicated ${record.duplicateCount} times and cannot be selected unambiguously.`);
  }
  if (record.encrypted) throw new ArchiveEntryError('encrypted', 'Encrypted entries are not opened by this viewer.');
  if (depth >= limits.maxNestedDepth) {
    throw new ArchiveEntryError('nesting-limit', `Nested archive depth is limited to ${limits.maxNestedDepth}.`);
  }
  const uncompressed = record.uncompressedSize;
  const compressed = record.compressedSize;
  if (!Number.isFinite(uncompressed)) {
    throw new ArchiveEntryError('unknown-size', 'Entry has no trustworthy uncompressed size.');
  }
  if (uncompressed > limits.maxEntryBytes) {
    throw new ArchiveEntryError('entry-too-large',
      `Entry expands to ${uncompressed} bytes; the per-entry limit is ${limits.maxEntryBytes}.`);
  }
  if (extractedBytes + uncompressed > limits.maxSessionBytes) {
    throw new ArchiveEntryError('session-too-large',
      `Opening this entry would exceed the ${limits.maxSessionBytes}-byte session limit.`);
  }
  if (uncompressed > 0 && Number.isFinite(compressed)) {
    const ratio = compressed > 0 ? uncompressed / compressed : Infinity;
    if (ratio > limits.maxExpansionRatio) {
      throw new ArchiveEntryError('expansion-ratio',
        `Entry expansion ratio ${Math.round(ratio)}:1 exceeds the ${limits.maxExpansionRatio}:1 limit.`);
    }
  }
}

export function createBoundedEntryOpener({
  intake,
  records,
  extract,
  makeIntake,
  limits = ARCHIVE_ENTRY_LIMITS,
}) {
  const described = describeArchiveEntries(records, limits);
  const byKey = new Map(described.map((record) => [record.key, record]));
  const byName = new Map();
  for (const record of described) if (!byName.has(record.name)) byName.set(record.name, record);
  const depth = Number(intake?.archiveDepth) || 0;
  let extractedBytes = 0;
  let generation = 0;
  let disposed = false;

  function find(selector) {
    return byKey.get(selector) || byName.get(selector) || null;
  }

  async function open(selector) {
    if (disposed) throw new ArchiveEntryError('disposed', 'Archive viewer is no longer active.');
    const record = find(selector);
    assertEntryMayOpen(record, { depth, extractedBytes, limits });
    const token = ++generation;
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new ArchiveEntryError('timeout',
        `Entry extraction exceeded ${Math.round(limits.timeoutMs / 1000)} seconds.`)), limits.timeoutMs);
    });
    let bytes;
    try {
      bytes = await Promise.race([Promise.resolve().then(() => extract(record)), timeout]);
    } finally {
      clearTimeout(timer);
    }
    if (disposed || token !== generation) {
      throw new ArchiveEntryError('stale', 'A newer archive entry request replaced this extraction.');
    }
    if (!(bytes instanceof Uint8Array)) bytes = new Uint8Array(bytes || 0);
    if (bytes.length > limits.maxEntryBytes || extractedBytes + bytes.length > limits.maxSessionBytes) {
      throw new ArchiveEntryError('actual-size-limit', 'Extracted bytes exceed the configured archive limit.');
    }
    if (record.uncompressedSize != null && bytes.length !== record.uncompressedSize) {
      throw new ArchiveEntryError('size-mismatch',
        `Extracted ${bytes.length} bytes but the archive declared ${record.uncompressedSize}.`);
    }
    extractedBytes += bytes.length;
    const filename = String(record.name || '').replace(/\\/g, '/').split('/').pop() || 'archive-entry';
    const inner = makeIntake(bytes, filename);
    inner.archiveDepth = depth + 1;
    inner.archiveEntryPath = record.name;
    return inner;
  }

  return {
    records: described,
    open,
    revoke() { disposed = true; generation++; },
    get extractedBytes() { return extractedBytes; },
  };
}
