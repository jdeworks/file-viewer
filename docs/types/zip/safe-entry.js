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

export function createArchiveExtractionSession() {
  let extractedBytes = 0;
  let generation = 0;
  let active = null;

  function begin(owner) {
    if (active) {
      active.controller.abort(new ArchiveEntryError('stale', 'A newer archive entry request replaced this extraction.'));
    }
    const controller = new AbortController();
    const token = ++generation;
    active = { owner, token, controller };
    return { token, signal: controller.signal };
  }

  function isCurrent(owner, token) {
    return active?.owner === owner && active.token === token && !active.controller.signal.aborted;
  }

  function finish(owner, token, bytes) {
    if (!isCurrent(owner, token)) {
      throw new ArchiveEntryError('stale', 'A newer archive entry request replaced this extraction.');
    }
    extractedBytes += bytes;
    active = null;
  }

  function abortOwner(owner, reason = new ArchiveEntryError('disposed', 'Archive viewer is no longer active.')) {
    if (active?.owner !== owner) return;
    const { controller } = active;
    active = null;
    generation++;
    controller.abort(reason);
  }

  return {
    begin,
    isCurrent,
    finish,
    abortOwner,
    get extractedBytes() { return extractedBytes; },
    get active() { return !!active; },
  };
}

let pageExtractionSession = null;
export function getPageArchiveExtractionSession() {
  if (!pageExtractionSession) pageExtractionSession = createArchiveExtractionSession();
  return pageExtractionSession;
}

export function archivePathIssue(name) {
  const value = String(name || '').replace(/\\/g, '/');
  if (!value || value.includes('\0')) return 'invalid path';
  if (value.startsWith('/') || /^[a-z]:\//i.test(value)) return 'absolute path';
  if (value.split('/').some((part) => part === '..')) return 'parent traversal';
  return null;
}

function entrySize(entry, key) {
  const directValue = entry?.[key];
  if (directValue != null) {
    const direct = Number(directValue);
    if (Number.isFinite(direct) && direct >= 0) return direct;
  }
  const nestedValue = entry?._data?.[key];
  if (nestedValue == null) return null;
  const nested = Number(nestedValue);
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
  if (record.regular === false) throw new ArchiveEntryError('non-regular', 'This archive entry is metadata only.');
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
  if (!Number.isFinite(uncompressed) && record.allowUnknownSize !== true) {
    throw new ArchiveEntryError('unknown-size', 'Entry has no trustworthy uncompressed size.');
  }
  if (Number.isFinite(uncompressed) && uncompressed > limits.maxEntryBytes) {
    throw new ArchiveEntryError('entry-too-large',
      `Entry expands to ${uncompressed} bytes; the per-entry limit is ${limits.maxEntryBytes}.`);
  }
  if (Number.isFinite(uncompressed) && extractedBytes + uncompressed > limits.maxSessionBytes) {
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
  session = null,
}) {
  session = session || intake?.archiveExtractionSession || createArchiveExtractionSession();
  const described = describeArchiveEntries(records, limits);
  const byKey = new Map(described.map((record) => [record.key, record]));
  const byName = new Map();
  for (const record of described) if (!byName.has(record.name)) byName.set(record.name, record);
  const depth = Number(intake?.archiveDepth) || 0;
  let disposed = false;
  const owner = Symbol('archive-entry-opener');

  function find(selector) {
    return byKey.get(selector) || byName.get(selector) || null;
  }

  async function open(selector) {
    if (disposed) throw new ArchiveEntryError('disposed', 'Archive viewer is no longer active.');
    const record = find(selector);
    assertEntryMayOpen(record, { depth, extractedBytes: session.extractedBytes, limits });
    const maxOutputBytes = Math.min(limits.maxEntryBytes, limits.maxSessionBytes - session.extractedBytes);
    if (maxOutputBytes <= 0) {
      throw new ArchiveEntryError('session-too-large',
        `Opening this entry would exceed the ${limits.maxSessionBytes}-byte session limit.`);
    }
    const operation = session.begin(owner);
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const error = new ArchiveEntryError('timeout',
          `Entry extraction exceeded ${Math.round(limits.timeoutMs / 1000)} seconds.`);
        reject(error);
        session.abortOwner(owner, error);
      }, limits.timeoutMs);
    });
    let bytes;
    try {
      bytes = await Promise.race([
        Promise.resolve().then(() => extract(record, { signal: operation.signal, maxOutputBytes })),
        timeout,
      ]);
    } catch (error) {
      if (!session.isCurrent(owner, operation.token)) {
        const reason = operation.signal.reason;
        if (reason instanceof ArchiveEntryError) throw reason;
        throw new ArchiveEntryError('stale', 'A newer archive entry request replaced this extraction.');
      }
      session.abortOwner(owner, error);
      throw error;
    } finally {
      clearTimeout(timer);
    }
    if (disposed || !session.isCurrent(owner, operation.token)) {
      throw new ArchiveEntryError('stale', 'A newer archive entry request replaced this extraction.');
    }
    try {
      if (!(bytes instanceof Uint8Array)) bytes = new Uint8Array(bytes || 0);
      if (bytes.length > limits.maxEntryBytes || session.extractedBytes + bytes.length > limits.maxSessionBytes) {
        throw new ArchiveEntryError('actual-size-limit', 'Extracted bytes exceed the configured archive limit.');
      }
      if (record.uncompressedSize != null && bytes.length !== record.uncompressedSize) {
        throw new ArchiveEntryError('size-mismatch',
          `Extracted ${bytes.length} bytes but the archive declared ${record.uncompressedSize}.`);
      }
    } catch (error) {
      session.abortOwner(owner, error);
      throw error;
    }
    session.finish(owner, operation.token, bytes.length);
    const filename = String(record.name || '').replace(/\\/g, '/').split('/').pop() || 'archive-entry';
    const inner = makeIntake(bytes, filename);
    inner.archiveDepth = depth + 1;
    inner.archiveEntryPath = record.name;
    inner.archiveExtractionSession = session;
    return inner;
  }

  return {
    records: described,
    open,
    revoke() {
      disposed = true;
      session.abortOwner(owner);
    },
    get extractedBytes() { return session.extractedBytes; },
    session,
  };
}
