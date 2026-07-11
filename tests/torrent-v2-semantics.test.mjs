import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { bencodeDictionaryEntries, decodeBencode } from '../docs/types/binary/torrent/bencode.js';
import { extract as extractTorrentMetadata } from '../docs/types/binary/torrent/metadata.js';
import { render as renderTorrent } from '../docs/types/binary/torrent/renderer.js';
import { inspectTorrentInfo, inspectV2FileTree } from '../docs/types/binary/torrent/semantics.js';

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
  if (value instanceof Map) {
    const entries = [...value.entries()]
      .map(([key, item]) => ({ bytes: Buffer.from(key), item }))
      .sort((a, b) => Buffer.compare(a.bytes, b.bytes));
    const encoded = [Buffer.from('d')];
    for (const entry of entries) encoded.push(bencode(entry.bytes), bencode(entry.item));
    encoded.push(Buffer.from('e'));
    return Buffer.concat(encoded);
  }
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

function v2TorrentFixture(info, extra = {}) {
  return torrentFixture(info, { 'piece layers': new Map(), ...extra });
}

function digest(algorithm, bytes) {
  return createHash(algorithm).update(bytes).digest('hex');
}

function hashBytes(algorithm, bytes) {
  return createHash(algorithm).update(bytes).digest();
}

function fixtureSemantics(fixture) {
  const torrent = decodeBencode(fixture.bytes).value;
  return inspectTorrentInfo(torrent.info, torrent['piece layers']);
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

// Raw bencode dictionary keys retain canonical byte ordering and never acquire Object.prototype.
const rawKeyDictionary = decodeBencode(bencode(new Map([
  [Buffer.from([0xff]), 2],
  [Buffer.from([0x80]), 1],
]))).value;
const rawKeyEntries = bencodeDictionaryEntries(rawKeyDictionary);
assert.deepEqual(rawKeyEntries.map((entry) => [...entry.key]), [[0x80], [0xff]]);
assert.deepEqual(rawKeyEntries.map((entry) => entry.text), [null, null]);
assert.deepEqual(Object.keys(rawKeyDictionary), []);
const reversedRawKeys = Buffer.concat([
  Buffer.from('d1:'), Buffer.from([0xff]), Buffer.from('i1e1:'), Buffer.from([0x80]), Buffer.from('i2ee'),
]);
assert.throws(() => decodeBencode(reversedRawKeys), /canonical byte order/);
const prototypeSafe = decodeBencode(bencode(new Map([[Buffer.from('__proto__'), 7]]))).value;
assert.equal(Object.getPrototypeOf(prototypeSafe), null);
assert.equal(prototypeSafe.__proto__, 7);

// All non-empty files below fit in one piece and the empty file omits its pieces root. BEP 52 still
// requires the top-level piece-layers dictionary, but it is correctly empty here and in the hybrid.
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
const v2 = v2TorrentFixture(v2Info, { announce: 'https://tracker.invalid/v2' });
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

const absentEmptyLayers = torrentFixture(v2Info);
assert.equal(fixtureSemantics(absentEmptyLayers).v2.pieceLayers.missing, true);
const absentEmptyLayersHtml = (await renderTorrent({
  bytes: absentEmptyLayers.bytes,
  name: 'absent-empty-layers.torrent',
})).bodyHtml;
assert.doesNotMatch(absentEmptyLayersHtml, /magnet:\?/);

// BEP 52 permits invalid UTF-8 path keys. Inventory them with an inert raw-byte label rather than
// losing the child or treating the otherwise structurally valid torrent as malformed.
const rawPathInfo = {
  'file tree': new Map([[Buffer.from([0x80]), v2File(1, 0x66)]]),
  'meta version': 2,
  name: 'raw-path-v2',
  'piece length': 16384,
};
const rawPath = v2TorrentFixture(rawPathInfo);
const rawPathHtml = (await renderTorrent({ bytes: rawPath.bytes, name: 'raw-path.torrent' })).bodyHtml;
assert.match(rawPathHtml, /magnet:\?/);
assert.match(rawPathHtml, /\[raw:80\]/);
assert.equal(extractTorrentMetadata({ bytes: rawPath.bytes }).fileCount, 1);

// A real two-piece payload exercises a raw, invalid-UTF-8 root key and the complete BEP 52 layer.
const layeredContent = Buffer.alloc(20000);
for (let index = 0; index < layeredContent.length; index++) layeredContent[index] = (index * 31 + 7) & 0xff;
const layeredPieceHashes = [
  hashBytes('sha256', layeredContent.subarray(0, 16384)),
  hashBytes('sha256', layeredContent.subarray(16384)),
];
const layeredValue = Buffer.concat(layeredPieceHashes);
const layeredRoot = hashBytes('sha256', layeredValue);
assert.throws(() => new TextDecoder('utf-8', { fatal: true }).decode(layeredRoot));
const layeredInfo = {
  'file tree': { 'two-piece.bin': { '': { length: 20000, 'pieces root': layeredRoot } } },
  'meta version': 2,
  name: 'two-piece-v2',
  'piece length': 16384,
};
const layered = v2TorrentFixture(layeredInfo, {
  'piece layers': new Map([[layeredRoot, layeredValue]]),
});
const decodedLayered = decodeBencode(layered.bytes).value;
assert.equal(decodedLayered.info.name, 'two-piece-v2');
const decodedLayerEntries = bencodeDictionaryEntries(decodedLayered['piece layers']);
assert.equal(decodedLayerEntries.length, 1);
assert.equal(decodedLayerEntries[0].text, null);
assert.deepEqual(Buffer.from(decodedLayerEntries[0].key), layeredRoot);
assert.deepEqual(Buffer.from(decodedLayerEntries[0].value), layeredValue);
const layeredSemantics = inspectTorrentInfo(decodedLayered.info, decodedLayered['piece layers']);
assert.equal(layeredSemantics.hasV2, true);
assert.equal(layeredSemantics.v2.pieceLayers.valid, true);
assert.equal(layeredSemantics.v2.pieceLayers.requiredFileCount, 1);
const layeredBtmh = '122058f5b9b1617621f9cf058cac898d460a52b6bad71e2f0c3c869e152e6b3f1948';
assert.equal(`1220${digest('sha256', layered.infoBytes)}`, layeredBtmh);
const layeredHtml = (await renderTorrent({ bytes: layered.bytes, name: 'two-piece.torrent' })).bodyHtml;
assert.deepEqual(magnetTopics(layeredHtml), [`urn:btmh:${layeredBtmh}`]);
assert.match(layeredHtml, /Files \(1\)/);
assert.match(layeredHtml, /two-piece\.bin/);
const layeredMetadata = extractTorrentMetadata({ bytes: layered.bytes });
assert.equal(layeredMetadata.totalSize, 20000);
assert.equal(layeredMetadata.fileCount, 1);

const missingLayer = torrentFixture(layeredInfo);
const missingLayerSemantics = fixtureSemantics(missingLayer);
assert.equal(missingLayerSemantics.hasV2, false);
assert.equal(missingLayerSemantics.v2.pieceLayers.missing, true);
const missingLayerHtml = (await renderTorrent({ bytes: missingLayer.bytes, name: 'missing-layer.torrent' })).bodyHtml;
assert.doesNotMatch(missingLayerHtml, /magnet:\?/);
assert.match(missingLayerHtml, /piece layers are missing/i);

const shortLayerKey = v2TorrentFixture(layeredInfo, {
  'piece layers': new Map([[layeredRoot.subarray(0, 31), layeredValue]]),
});
const shortLayerKeySemantics = fixtureSemantics(shortLayerKey);
assert.equal(shortLayerKeySemantics.hasV2, false);
assert.equal(shortLayerKeySemantics.v2.pieceLayers.malformed, true);

const shortLayerValue = v2TorrentFixture(layeredInfo, {
  'piece layers': new Map([[layeredRoot, layeredValue.subarray(0, 32)]]),
});
const shortLayerValueSemantics = fixtureSemantics(shortLayerValue);
assert.equal(shortLayerValueSemantics.hasV2, false);
assert.equal(shortLayerValueSemantics.v2.pieceLayers.malformed, true);

const corruptedLayerValue = Buffer.from(layeredValue);
corruptedLayerValue[0] ^= 0xff;
const inconsistentLayer = v2TorrentFixture(layeredInfo, {
  'piece layers': new Map([[layeredRoot, corruptedLayerValue]]),
});
const inconsistentLayerSemantics = fixtureSemantics(inconsistentLayer);
assert.equal(inconsistentLayerSemantics.hasV2, false);
assert.equal(inconsistentLayerSemantics.v2.pieceLayers.inconsistent, true);
const inconsistentLayerHtml = (await renderTorrent({
  bytes: inconsistentLayer.bytes,
  name: 'inconsistent-layer.torrent',
})).bodyHtml;
assert.doesNotMatch(inconsistentLayerHtml, /urn:btmh:/);
assert.match(inconsistentLayerHtml, /piece layers are malformed or inconsistent/i);

const hybridInfo = {
  'file tree': { 'hybrid.bin': v2File(5, 0x33) },
  length: 5,
  'meta version': 2,
  name: 'hybrid',
  'piece length': 16384,
  pieces: Buffer.alloc(20, 0x44),
};
const hybrid = v2TorrentFixture(hybridInfo, { announce: 'https://tracker.invalid/hybrid' });
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
const v2WithStrayLength = v2TorrentFixture({ ...v2Info, length: 12 });
const strayHtml = (await renderTorrent({ bytes: v2WithStrayLength.bytes, name: 'stray.torrent' })).bodyHtml;
assert.match(strayHtml, /urn:btmh:/);
assert.doesNotMatch(strayHtml, /urn:btih:/);

// The root of a BEP 52 file tree cannot itself be a file. Treat it as malformed, do not count it,
// and still terminate normally while reporting the partial/invalid inventory.
const malformed = v2TorrentFixture({
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

const invalidPieceLength = v2TorrentFixture({ ...v2Info, 'piece length': 12000 });
const invalidPieceHtml = (await renderTorrent({ bytes: invalidPieceLength.bytes, name: 'invalid-piece.torrent' })).bodyHtml;
assert.doesNotMatch(invalidPieceHtml, /magnet:\?/);

for (const pieceLength of [32 * 1024 * 1024, 4 * 1024 * 1024 * 1024]) {
  const largePiece = v2TorrentFixture({ ...v2Info, 'piece length': pieceLength });
  const largePieceHash = `1220${digest('sha256', largePiece.infoBytes)}`;
  const largePieceHtml = (await renderTorrent({ bytes: largePiece.bytes, name: 'large-piece.torrent' })).bodyHtml;
  assert.match(largePieceHtml, new RegExp(`xt=urn:btmh:${largePieceHash}`));
}

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
