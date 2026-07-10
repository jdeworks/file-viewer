import assert from 'node:assert/strict';
import { archiveEntryName } from '../docs/core/archivelib.js';

assert.equal(archiveEntryName({ name: 'README.md' }, ''), 'README.md');
assert.equal(archiveEntryName({ name: 'data.json' }, 'nested/'), 'nested/data.json');
assert.equal(archiveEntryName({ name: 'data.json' }, 'nested'), 'nested/data.json');
assert.equal(archiveEntryName({ name: 'data.json' }, 'nested/data.json'), 'nested/data.json');
assert.equal(archiveEntryName(null, 'empty/'), 'empty');
assert.equal(archiveEntryName({ name: 'win.txt' }, 'folder\\child\\'), 'folder/child/win.txt');

console.log('archive lib path regressions passed');
