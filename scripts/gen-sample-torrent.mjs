#!/usr/bin/env node
// Generates docs/examples/sample.torrent — a canonical multi-file BitTorrent v1 metainfo file
// whose piece hashes are computed from three deterministic nested payloads. tracker.invalid is a
// reserved non-resolving domain; the viewer must never contact it.
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const PIECE_LENGTH = 64;
const files = [
  { path: ['docs', 'readme.txt'], data: Buffer.from('File Viewer torrent sample\nNested files and real piece hashes.\n') },
  { path: ['data', 'people.csv'], data: Buffer.from('name,role\nAda Lovelace,Mathematician\nGrace Hopper,Computer scientist\n') },
  { path: ['src', 'example.js'], data: Buffer.from('export const answer = 42;\nexport function greet(name) { return `Hello ${name}`; }\n') },
];
const payload = Buffer.concat(files.map((file) => file.data));
const pieces = [];
for (let offset = 0; offset < payload.length; offset += PIECE_LENGTH) {
  pieces.push(createHash('sha1').update(payload.subarray(offset, offset + PIECE_LENGTH)).digest());
}

function bencode(value) {
  if (Buffer.isBuffer(value)) return Buffer.concat([Buffer.from(`${value.length}:`), value]);
  if (typeof value === 'string') return bencode(Buffer.from(value, 'utf8'));
  if (Number.isInteger(value)) return Buffer.from(`i${value}e`);
  if (Array.isArray(value)) return Buffer.concat([Buffer.from('l'), ...value.map(bencode), Buffer.from('e')]);
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).sort(([a], [b]) => Buffer.from(a).compare(Buffer.from(b)));
    return Buffer.concat([
      Buffer.from('d'),
      ...entries.flatMap(([key, item]) => [bencode(key), bencode(item)]),
      Buffer.from('e'),
    ]);
  }
  throw new TypeError(`cannot bencode ${typeof value}`);
}

const torrent = {
  announce: 'https://tracker.invalid/announce',
  'announce-list': [['https://tracker.invalid/announce'], ['udp://backup.tracker.invalid:6969/announce']],
  comment: 'Deterministic File Viewer multi-file sample',
  'created by': 'File Viewer fixture generator',
  'creation date': 1767225600,
  info: {
    files: files.map((file) => ({ length: file.data.length, path: file.path })),
    name: 'file-viewer-sample',
    'piece length': PIECE_LENGTH,
    pieces: Buffer.concat(pieces),
  },
};

const output = bencode(torrent);
const destination = join(new URL('../docs/examples/', import.meta.url).pathname, 'sample.torrent');
await writeFile(destination, output);
console.log(`Wrote ${destination} (${output.length} bytes, ${files.length} files, ${pieces.length} verified pieces)`);
