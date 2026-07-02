import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { imageEntryCount, listCentralDirectory, verifyZipCryptoPassword } from '../docs/types/zip/ziplib.js';
import { detect as detectArchive } from '../docs/types/archive/detect.js';
import { inspectArchive } from '../docs/types/archive/metadata.js';
import { riskyArchiveEntries } from '../docs/types/zip/metadata.js';
import { parseHeader } from '../docs/types/sqlite/sqlitelib.js';

const root = new URL('../docs/examples/', import.meta.url);

function tarHeader(name, size, type = '0') {
  const block = new Uint8Array(512);
  const enc = new TextEncoder();
  block.set(enc.encode(name), 0);
  block.set(enc.encode('0000644\0'), 100);
  block.set(enc.encode('0000000\0'), 108);
  block.set(enc.encode('0000000\0'), 116);
  block.set(enc.encode(size.toString(8).padStart(11, '0') + '\0'), 124);
  block.set(enc.encode('00000000000\0'), 136);
  block.fill(0x20, 148, 156);
  block[156] = type.charCodeAt(0);
  block.set(enc.encode('ustar\0'), 257);
  let sum = 0;
  for (const b of block) sum += b;
  block.set(enc.encode(sum.toString(8).padStart(6, '0') + '\0 '), 148);
  return block;
}

function concat(...parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const part of parts) { out.set(part, at); at += part.length; }
  return out;
}

const zip = listCentralDirectory(await readFile(new URL('sample.zip', root)));
assert.equal(zip.files.length, 4);
assert.equal(zip.folders.length, 2);
assert.equal(zip.totalU, 576);
assert.equal(zip.methods.get(8), 4);

const cbz = listCentralDirectory(await readFile(new URL('sample.cbz', root)));
assert.equal(cbz.files.length, 3);
assert.equal(imageEntryCount(cbz.files), 3);

const locked = listCentralDirectory(await readFile(new URL('sample-locked.zip', root)));
assert.equal(locked.encrypted.size, 1);
assert.equal(locked.files.find((f) => f.name === 'secret.txt')?.encryption, 'zipcrypto');
assert.equal(locked.files.find((f) => f.name === 'readme.txt')?.encrypted, false);
assert.equal(verifyZipCryptoPassword(await readFile(new URL('sample-locked.zip', root)), locked.files.find((f) => f.name === 'secret.txt'), 'wrong'), false);

const risky = riskyArchiveEntries([
  { name: 'docs/readme.txt' },
  { name: 'payload/invoice.pdf.exe' },
  { name: 'payload/document.pdf.zip' },
  { name: 'assets/jquery.min.js' },
]);
assert.equal(risky.score, 75);
assert.equal(risky.entries.length, 2);
assert.equal(risky.entries[0].name, 'payload/invoice.pdf.exe');
assert.equal(risky.entries[0].level, 'high');
assert.equal(risky.entries[1].level, 'caution');

const sevenZip = inspectArchive(await readFile(new URL('Sample.7z', root)), 'Sample.7z');
assert.equal(sevenZip.format, '7z');
assert.equal(sevenZip.version, '0.4');

const body = new Uint8Array(512);
const tar = inspectArchive(concat(tarHeader('docs/', 0, '5'), tarHeader('docs/readme.txt', 5), body, new Uint8Array(1024)), 'sample.tar');
assert.equal(tar.format, 'TAR');
assert.equal(tar.files, 1);
assert.equal(tar.folders, 1);
assert.equal(tar.total, 5);

assert.equal(detectArchive({ filename: 'source.tbz2' }), 0.92);
assert.equal(detectArchive({ filename: 'source.txz' }), 0.92);
assert.equal(inspectArchive(Uint8Array.from([0x42, 0x5a, 0x68]), 'source.tbz2').format, 'Bzip2-compressed TAR');
assert.equal(inspectArchive(Uint8Array.from([0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00]), 'source.txz').format, 'XZ-compressed TAR');

const sqlite = parseHeader(await readFile(new URL('sample.sqlite', root)));
assert.equal(sqlite.pageSize, 4096);
assert.equal(sqlite.pages, 3);
assert.equal(sqlite.encoding, 'UTF-8');
assert.equal(sqlite.versionText, '3.45.2');

console.log('archive metadata parser tests passed');
