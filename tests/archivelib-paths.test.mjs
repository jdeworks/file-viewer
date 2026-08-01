import assert from 'node:assert/strict';
import {
  approveArchiveSource,
  ARCHIVE_SOURCE_LIMITS,
  archiveEntryName,
  archiveFormatFromFilename,
  archiveSourceStatus,
  likelyArchive,
  standaloneArchiveStream,
  standaloneStreamEntryName,
} from '../docs/core/archivelib.js';

assert.equal(archiveEntryName({ name: 'README.md' }, ''), 'README.md');
assert.equal(archiveEntryName({ name: 'data.json' }, 'nested/'), 'nested/data.json');
assert.equal(archiveEntryName({ name: 'data.json' }, 'nested'), 'nested/data.json');
assert.equal(archiveEntryName({ name: 'data.json' }, 'nested/data.json'), 'nested/data.json');
assert.equal(archiveEntryName(null, 'empty/'), 'empty');
assert.equal(archiveEntryName({ name: 'win.txt' }, 'folder\\child\\'), 'folder/child/win.txt');

assert.equal(likelyArchive({ filename: 'notes.txt.gz' }), true);
assert.equal(likelyArchive({ filename: 'payload.bin', bytes: Uint8Array.from([0x28, 0xb5, 0x2f, 0xfd]) }), true);
assert.equal(standaloneArchiveStream('notes.txt.gz'), true);
assert.equal(standaloneArchiveStream('backup.tar.gz'), false);
assert.equal(standaloneArchiveStream('backup.tgz'), false);
assert.equal(standaloneStreamEntryName('notes.txt.gz'), 'notes.txt');
assert.equal(standaloneStreamEntryName('payload.zst'), 'payload');
assert.equal(archiveFormatFromFilename('backup.tar.zst'), 'tar.zst');

const atWarning = { size: ARCHIVE_SOURCE_LIMITS.warnBytes };
const aboveWarning = { size: ARCHIVE_SOURCE_LIMITS.warnBytes + 1 };
assert.equal(archiveSourceStatus(atWarning).status, 'ok');
assert.equal(archiveSourceStatus(aboveWarning).status, 'confirm');
approveArchiveSource(aboveWarning);
assert.equal(archiveSourceStatus(aboveWarning).status, 'ok');
assert.equal(archiveSourceStatus({ size: ARCHIVE_SOURCE_LIMITS.maxBytes }).status, 'confirm');
assert.equal(archiveSourceStatus({ size: ARCHIVE_SOURCE_LIMITS.maxBytes + 1 }).status, 'too-large');
assert.equal(archiveSourceStatus({ size: 10, truncated: true }).status, 'incomplete');
assert.equal(archiveSourceStatus({ size: 10, truncated: true, file: { size: 10 } }).status, 'ok');

console.log('archive lib path regressions passed');
