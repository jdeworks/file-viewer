import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { decodeBencode } from '../docs/types/binary/torrent/bencode.js';
import { extract as extractTorrentMetadata } from '../docs/types/binary/torrent/metadata.js';
import { render as renderTorrent } from '../docs/types/binary/torrent/renderer.js';
import { inspectV2FileTree } from '../docs/types/binary/torrent/semantics.js';

function bencode(value) {
  if (value instanceof Uint8Array) {
    const bytes = Buffer.from(value.buffer, value.byteOffset, value.byteLength);
    return Buffer.concat([Buffer.from(`${bytes.length}:`), bytes]);
  }
  if (typeof value === 'string') {
    const bytes = Buffer.from(value);
    return Buffer.concat([Buffer.from(`${bytes.length}:`), bytes]);
  }
  if (Number.isSafeInteger(value)) return Buffer.from(`i${value}e`);
  if (Array.isArray(value)) return Buffer.concat([Buffer.from('l'), ...value.map(bencode), Buffer.from('e')]);
  if (value && typeof value === 'object') {
    const entries = Object.keys(value)
      .map((key) => ({ key, bytes: Buffer.from(key) }))
      .sort((a, b) => Buffer.compare(a.bytes, b.bytes));
    const encoded = [Buffer.from('d')];
    for (const entry of entries) encoded.push(bencode(entry.bytes), bencode(value[entry.key]));
    encoded.push(Buffer.from('e'));
    return Buffer.concat(encoded);
  }
  throw new TypeError(`Cannot bencode ${String(value)}`);
}

function torrentFixture(info, extra = {}) {
  const infoBytes = bencode(info);
  return { infoBytes, bytes: bencode({ ...extra, info }) };
}

function digest(algorithm, bytes) {
  return createHash(algorithm).update(bytes).digest('hex');
}

function magnetTopics(html) {
  const href = html.match(/<a href="([^"]+)"/)?.[1];
  assert.ok(href, 'renderer must emit a magnet anchor');
  return new URL(href.replaceAll('&amp;', '&')).searchParams.getAll('xt');
}

function v2File(length, fill) {
  const properties = { length };
  if (length > 0) properties['pieces root'] = Buffer.alloc(32, fill);
  return { '': properties };
}

const v2Info = {
  'file tree': {
    dir: {
      'alpha.bin': v2File(5, 0x11),
      nested: { 'empty.txt': v2File(0, 0) },
    },
    'root.txt': v2File(7, 0x22),
  },
  'meta version': 2,
  name: 'v2-only',
  'piece length': 16384,
};
const v2 = torrentFixture(v2Info, { announce: 'https://tracker.invalid/v2' });
const v2Sha256 = digest('sha256', v2.infoBytes);
const v2Btmh = `1220${v2Sha256}`;
const v2Html = (await renderTorrent({ bytes: v2.bytes, name: 'v2-only.torrent' })).bodyHtml;
assert.match(v2Html, new RegExp(`xt=urn:btmh:${v2Btmh}`));
assert.doesNotMatch(v2Html, /urn:btih:/);
assert.deepEqual(magnetTopics(v2Html), [`urn:btmh:${v2Btmh}`]);
assert.match(v2Html, /<dt>Size<\/dt><dd>12 B<\/dd>/);
assert.match(v2Html, /Files \(3\)/);
for (const path of ['dir/alpha.bin', 'dir/nested/empty.txt', 'root.txt']) assert.match(v2Html, new RegExp(path));
const v2Metadata = extractTorrentMetadata({ bytes: v2.bytes });
assert.equal(v2Metadata.totalSize, 12);
assert.equal(v2Metadata.fileCount, 3);

const hybridInfo = {
  'file tree': { 'hybrid.bin': v2File(5, 0x33) },
  length: 5,
  'meta version': 2,
  name: 'hybrid',
  'piece length': 16384,
  pieces: Buffer.alloc(20, 0x44),
};
const hybrid = torrentFixture(hybridInfo, { announce: 'https://tracker.invalid/hybrid' });
const hybridSha1 = digest('sha1', hybrid.infoBytes);
const hybridBtmh = `1220${digest('sha256', hybrid.infoBytes)}`;
const hybridHtml = (await renderTorrent({ bytes: hybrid.bytes, name: 'hybrid.torrent' })).bodyHtml;
assert.match(hybridHtml, new RegExp(`xt=urn:btmh:${hybridBtmh}`));
assert.match(hybridHtml, new RegExp(`xt=urn:btih:${hybridSha1}`));
assert.deepEqual(magnetTopics(hybridHtml), [`urn:btmh:${hybridBtmh}`, `urn:btih:${hybridSha1}`]);
assert.match(hybridHtml, /BitTorrent v1 \+ v2 hybrid/);
const hybridMetadata = extractTorrentMetadata({ bytes: hybrid.bytes });
assert.equal(hybridMetadata.totalSize, 5);
assert.equal(hybridMetadata.fileCount, 1);

// Merely carrying a v1-shaped length without a valid pieces field must not create a btih topic.
const v2WithStrayLength = torrentFixture({ ...v2Info, length: 12 });
const strayHtml = (await renderTorrent({ bytes: v2WithStrayLength.bytes, name: 'stray.torrent' })).bodyHtml;
assert.match(strayHtml, /urn:btmh:/);
assert.doesNotMatch(strayHtml, /urn:btih:/);

// The root of a BEP 52 file tree cannot itself be a file. Treat it as malformed, do not count it,
// and still terminate normally while reporting the partial/invalid inventory.
const malformed = torrentFixture({
  'file tree': { '': { length: 9 } },
  'meta version': 2,
  name: 'malformed-v2',
  'piece length': 16384,
});
const malformedHtml = (await renderTorrent({ bytes: malformed.bytes, name: 'malformed.torrent' })).bodyHtml;
assert.match(malformedHtml, /file tree is malformed/i);
assert.match(malformedHtml, /<dt>Files<\/dt><dd>0<\/dd>/);
assert.doesNotMatch(malformedHtml, /magnet:\?/);
const malformedMetadata = extractTorrentMetadata({ bytes: malformed.bytes });
assert.equal(malformedMetadata.totalSize, 0);
assert.equal(malformedMetadata.fileCount, 0);
const malformedTree = inspectV2FileTree(decodeBencode(malformed.bytes).value.info['file tree']);
assert.equal(malformedTree.malformed, true);

const invalidPieceLength = torrentFixture({ ...v2Info, 'piece length': 12000 });
const invalidPieceHtml = (await renderTorrent({ bytes: invalidPieceLength.bytes, name: 'invalid-piece.torrent' })).bodyHtml;
assert.doesNotMatch(invalidPieceHtml, /magnet:\?/);

const fileNode = (length) => ({ '': { length, ...(length > 0 ? { 'pieces root': Buffer.alloc(32, 0x55) } : {}) } });
const wideTree = {
  f1: fileNode(1),
  f2: fileNode(2),
  f3: fileNode(3),
  f4: fileNode(4),
  f5: fileNode(5),
};
const bounded = inspectV2FileTree(wideTree, { maxNodes: 3, maxInventoryFiles: 1 });
assert.deepEqual({
  fileCount: bounded.fileCount,
  totalSize: bounded.totalSize,
  paths: bounded.files.map((file) => file.path),
  truncated: bounded.truncated,
  inventoryTruncated: bounded.inventoryTruncated,
  totalSizeComplete: bounded.totalSizeComplete,
}, {
  fileCount: 2,
  totalSize: 3,
  paths: ['f1'],
  truncated: true,
  inventoryTruncated: true,
  totalSizeComplete: false,
});

const inventoryBounded = inspectV2FileTree(wideTree, { maxNodes: 10, maxInventoryFiles: 1 });
assert.equal(inventoryBounded.fileCount, 5);
assert.equal(inventoryBounded.totalSize, 15);
assert.equal(inventoryBounded.files.length, 1);
assert.equal(inventoryBounded.inventoryTruncated, true);
assert.equal(inventoryBounded.truncated, false);
assert.equal(inventoryBounded.totalSizeComplete, true);

const overflowed = inspectV2FileTree({ huge: fileNode(Number.MAX_SAFE_INTEGER), extra: fileNode(1) });
assert.equal(overflowed.totalSize, Number.MAX_SAFE_INTEGER);
assert.equal(overflowed.overflow, true);
assert.equal(overflowed.totalSizeComplete, false);

const depthBounded = inspectV2FileTree({ a: { b: { c: fileNode(1) } } }, { maxDepth: 2 });
assert.equal(depthBounded.fileCount, 0);
assert.equal(depthBounded.truncated, true);

const mixedLeaf = inspectV2FileTree({ bad: { '': { length: 4 }, child: fileNode(9) } });
assert.equal(mixedLeaf.malformed, true);
assert.equal(mixedLeaf.fileCount, 1);
assert.equal(mixedLeaf.totalSize, 4);

const cyclicTree = Object.create(null);
cyclicTree.loop = cyclicTree;
const cyclic = inspectV2FileTree(cyclicTree);
assert.equal(cyclic.malformed, true);
assert.equal(cyclic.fileCount, 0);
assert.equal(cyclic.nodesVisited, 1);

// Preserve the committed v1 fixture: same file inventory and exact SHA-1-only magnet semantics.
const v1Bytes = await readFile(new URL('../docs/examples/sample.torrent', import.meta.url));
const decodedV1 = decodeBencode(v1Bytes);
const v1Sha1 = digest('sha1', v1Bytes.subarray(decodedV1.infoRange.start, decodedV1.infoRange.end));
const v1Html = (await renderTorrent({ bytes: v1Bytes, name: 'sample.torrent' })).bodyHtml;
assert.match(v1Html, new RegExp(`xt=urn:btih:${v1Sha1}`));
assert.doesNotMatch(v1Html, /urn:btmh:/);
assert.deepEqual(magnetTopics(v1Html), [`urn:btih:${v1Sha1}`]);
assert.match(v1Html, /Files \(3\)/);
for (const path of ['docs/readme.txt', 'data/people.csv', 'src/example.js']) assert.match(v1Html, new RegExp(path.replace('.', '\\.')));
const v1Metadata = extractTorrentMetadata({ bytes: v1Bytes });
assert.equal(v1Metadata.fileCount, 3);
assert.equal(v1Metadata.pieceSize, 64);

console.log('torrent v2 semantics tests passed');
