#!/usr/bin/env node
// Generates docs/examples/sample.apk — a deterministic unsigned APK structure with compiled
// binary Android XML, a checksummed empty DEX, two real ELF64 native-library fixtures, and a
// meaningful asset. It intentionally has no META-INF signature material, so the viewer must not
// claim it is signed.
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const JSZip = require('jszip');
const examples = new URL('../docs/examples/', import.meta.url).pathname;
const FIXED_DATE = new Date('2000-01-01T00:00:00Z');
const NONE = 0xffffffff;

const u16 = (value) => { const b = Buffer.alloc(2); b.writeUInt16LE(value); return b; };
const u32 = (value) => { const b = Buffer.alloc(4); b.writeUInt32LE(value >>> 0); return b; };
const chunk = (type, headerSize, body) => Buffer.concat([u16(type), u16(headerSize), u32(8 + body.length), body]);

function stringPool(strings) {
  const encoded = strings.map((value) => {
    const bytes = Buffer.from(value, 'utf8');
    if (value.length >= 128 || bytes.length >= 128) throw new Error('AXML fixture string is too long');
    return Buffer.concat([Buffer.from([value.length, bytes.length]), bytes, Buffer.alloc(1)]);
  });
  const offsets = [];
  let offset = 0;
  for (const value of encoded) { offsets.push(offset); offset += value.length; }
  const raw = Buffer.concat(encoded);
  const padded = Buffer.concat([raw, Buffer.alloc((4 - raw.length % 4) % 4)]);
  const stringsStart = 28 + offsets.length * 4;
  const header = Buffer.concat([
    u32(strings.length), u32(0), u32(0x100), u32(stringsStart), u32(0), ...offsets.map(u32),
  ]);
  return chunk(0x0001, 28, Buffer.concat([header, padded]));
}

function nodeChunk(type, line, extension) {
  return chunk(type, 16, Buffer.concat([u32(line), u32(NONE), extension]));
}

function namespaceChunk(type, line, prefix, uri) {
  return nodeChunk(type, line, Buffer.concat([u32(prefix), u32(uri)]));
}

function startElement(line, namespace, name, attributes) {
  const attrBytes = attributes.map((attribute) => Buffer.concat([
    u32(attribute.namespace), u32(attribute.name), u32(attribute.raw),
    u16(8), Buffer.from([0, 0x03]), u32(attribute.typed),
  ]));
  const extension = Buffer.concat([
    u32(namespace), u32(name), u16(20), u16(20), u16(attributes.length), u16(0), u16(0), u16(0),
    ...attrBytes,
  ]);
  return nodeChunk(0x0102, line, extension);
}

function endElement(line, namespace, name) {
  return nodeChunk(0x0103, line, Buffer.concat([u32(namespace), u32(name)]));
}

function binaryManifest() {
  const strings = [
    'manifest', 'package', 'com.example.fileviewer', 'application', 'android',
    'http://schemas.android.com/apk/res/android', 'label', 'File Viewer Sample',
  ];
  const pool = stringPool(strings);
  const resourceIds = strings.map((_, index) => index === 6 ? 0x01010001 : 0);
  const resourceMap = chunk(0x0180, 8, Buffer.concat(resourceIds.map(u32)));
  const tree = Buffer.concat([
    namespaceChunk(0x0100, 1, 4, 5),
    startElement(2, NONE, 0, [{ namespace: NONE, name: 1, raw: 2, typed: 2 }]),
    startElement(3, NONE, 3, [{ namespace: 5, name: 6, raw: 7, typed: 7 }]),
    endElement(4, NONE, 3),
    endElement(5, NONE, 0),
    namespaceChunk(0x0101, 6, 4, 5),
  ]);
  return chunk(0x0003, 8, Buffer.concat([pool, resourceMap, tree]));
}

function adler32(bytes) {
  let a = 1;
  let b = 0;
  for (const value of bytes) { a = (a + value) % 65521; b = (b + a) % 65521; }
  return ((b << 16) | a) >>> 0;
}

function emptyDex() {
  const dex = Buffer.alloc(140);
  dex.write('dex\n035\0', 0, 'ascii');
  dex.writeUInt32LE(dex.length, 32);
  dex.writeUInt32LE(0x70, 36);
  dex.writeUInt32LE(0x12345678, 40);
  dex.writeUInt32LE(112, 52); // map_off
  dex.writeUInt32LE(28, 104); // data_size
  dex.writeUInt32LE(112, 108); // data_off
  dex.writeUInt32LE(2, 112); // header and map-list entries
  dex.writeUInt16LE(0x0000, 116); // TYPE_HEADER_ITEM
  dex.writeUInt32LE(1, 120);
  dex.writeUInt32LE(0, 124);
  dex.writeUInt16LE(0x1000, 128); // TYPE_MAP_LIST
  dex.writeUInt32LE(1, 132);
  dex.writeUInt32LE(112, 136);
  createHash('sha1').update(dex.subarray(32)).digest().copy(dex, 12);
  dex.writeUInt32LE(adler32(dex.subarray(12)), 8);
  return dex;
}

async function nativeLibrary(machine, code) {
  const elf = Buffer.from(await readFile(join(examples, 'sample.elf')));
  elf.writeUInt16LE(3, 16); // ET_DYN
  elf.writeUInt16LE(machine, 18);
  elf.writeBigUInt64LE(0n, 24); // shared objects have no process entry point
  elf.writeBigUInt64LE(0n, 80);
  elf.writeBigUInt64LE(0n, 88);
  elf.writeBigUInt64LE(0x100n, 384 + 64 + 16); // .text sh_addr
  elf.writeBigUInt64LE(0x100n, 0x140 + 32); // symbol value
  elf.writeBigUInt64LE(BigInt(code.length), 0x140 + 40);
  elf.fill(0, 0x100, 0x109);
  Buffer.from(code).copy(elf, 0x100);
  elf.write('fvinit\0', 0x139, 'ascii');
  return elf;
}

const zip = new JSZip();
const options = { date: FIXED_DATE, createFolders: false };
zip.file('AndroidManifest.xml', binaryManifest(), options);
zip.file('classes.dex', emptyDex(), options);
zip.file('lib/arm64-v8a/libexample.so', await nativeLibrary(0xb7, [0xc0, 0x03, 0x5f, 0xd6]), options);
zip.file('lib/x86_64/libexample.so', await nativeLibrary(0x3e, [0xc3]), options);
zip.file('assets/config.json', JSON.stringify({ app: 'File Viewer Sample', offline: true, version: 1 }, null, 2) + '\n', options);

const output = await zip.generateAsync({
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 9 },
  platform: 'UNIX',
});
const destination = join(examples, 'sample.apk');
await writeFile(destination, output);
console.log(`Wrote ${destination} (${output.length} bytes, 5 real entries, unsigned)`);
