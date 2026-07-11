import assert from 'node:assert/strict';
import {
  ARCHIVE_ENTRY_LIMITS,
  ArchiveEntryError,
  archivePathIssue,
  assertEntryMayOpen,
  createBoundedEntryOpener,
  describeArchiveEntries,
} from '../docs/types/zip/safe-entry.js';

const record = (name, uncompressedSize = 4, compressedSize = 4, extra = {}) => ({
  name, uncompressedSize, compressedSize, method: 0, dir: false, encrypted: false, ...extra,
});
const makeIntake = (bytes, filename) => ({ bytes, filename, size: bytes.length });

assert.equal(archivePathIssue('assets/config.json'), null);
assert.equal(archivePathIssue('../secret.txt'), 'parent traversal');
assert.equal(archivePathIssue('/etc/passwd'), 'absolute path');
assert.equal(archivePathIssue('C:/secret.txt'), 'absolute path');

const duplicates = describeArchiveEntries([record('same'), record('same')]);
assert.deepEqual(duplicates.map((entry) => [entry.duplicateIndex, entry.duplicateCount]), [[1, 2], [2, 2]]);
assert.throws(() => assertEntryMayOpen(duplicates[0]), (error) => error.code === 'duplicate-name');
assert.throws(() => assertEntryMayOpen(describeArchiveEntries([record('../bad')])[0]),
  (error) => error.code === 'unsafe-path');
assert.throws(() => assertEntryMayOpen(describeArchiveEntries([record('link', 1, 1, { symlink: true })])[0]),
  (error) => error.code === 'symlink');
assert.throws(() => assertEntryMayOpen(describeArchiveEntries([record('locked', 1, 1, { encrypted: true })])[0]),
  (error) => error.code === 'encrypted');
assert.throws(() => assertEntryMayOpen(describeArchiveEntries([
  record('bomb', ARCHIVE_ENTRY_LIMITS.maxEntryBytes, 1),
])[0]), (error) => error.code === 'expansion-ratio');
assert.throws(() => describeArchiveEntries(new Array(3).fill(null).map((_, i) => record(String(i))), {
  ...ARCHIVE_ENTRY_LIMITS, maxEntries: 2,
}), (error) => error.code === 'too-many-entries');

const basic = createBoundedEntryOpener({
  intake: { archiveDepth: 1 },
  records: [record('folder/demo.txt')],
  extract: async () => new Uint8Array([1, 2, 3, 4]),
  makeIntake,
});
const opened = await basic.open('folder/demo.txt');
assert.equal(opened.filename, 'demo.txt');
assert.equal(opened.archiveDepth, 2);
assert.equal(opened.archiveEntryPath, 'folder/demo.txt');
assert.equal(basic.extractedBytes, 4);

const mismatch = createBoundedEntryOpener({
  intake: {}, records: [record('wrong.bin', 4, 4)], extract: async () => new Uint8Array(3), makeIntake,
});
await assert.rejects(mismatch.open('wrong.bin'), (error) => error.code === 'size-mismatch');

const nested = createBoundedEntryOpener({
  intake: { archiveDepth: ARCHIVE_ENTRY_LIMITS.maxNestedDepth },
  records: [record('too-deep.zip')], extract: async () => new Uint8Array(4), makeIntake,
});
await assert.rejects(nested.open('too-deep.zip'), (error) => error.code === 'nesting-limit');

let resolveFirst;
const stale = createBoundedEntryOpener({
  intake: {}, records: [record('one', 1, 1), record('two', 1, 1)], makeIntake,
  extract: (entry) => entry.name === 'one'
    ? new Promise((resolve) => { resolveFirst = resolve; })
    : Promise.resolve(new Uint8Array([2])),
});
const first = stale.open('one');
await Promise.resolve();
const second = stale.open('two');
resolveFirst(new Uint8Array([1]));
await assert.rejects(first, (error) => error.code === 'stale');
assert.equal((await second).filename, 'two');

const timeout = createBoundedEntryOpener({
  intake: {}, records: [record('slow', 1, 1)], makeIntake,
  extract: () => new Promise(() => {}),
  limits: { ...ARCHIVE_ENTRY_LIMITS, timeoutMs: 5 },
});
await assert.rejects(timeout.open('slow'), (error) => error instanceof ArchiveEntryError && error.code === 'timeout');

const cumulative = createBoundedEntryOpener({
  intake: {}, records: [record('a', 2, 2), record('b', 2, 2)], makeIntake,
  extract: async () => new Uint8Array(2),
  limits: { ...ARCHIVE_ENTRY_LIMITS, maxSessionBytes: 3 },
});
await cumulative.open('a');
await assert.rejects(cumulative.open('b'), (error) => error.code === 'session-too-large');

const disposed = createBoundedEntryOpener({
  intake: {}, records: [record('done')], extract: async () => new Uint8Array(4), makeIntake,
});
disposed.revoke();
await assert.rejects(disposed.open('done'), (error) => error.code === 'disposed');

console.log('archive entry bounds tests passed');
