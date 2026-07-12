#!/usr/bin/env node
// Generates a deterministic synthetic Pages ZIP with a meaningful embedded preview and a tiny
// Snappy/IWA packet containing human-readable Protobuf strings. It is intentionally not a full
// Pages document; it exercises exactly the thumbnail + heuristic-text capabilities the viewer
// claims without shipping a copyrighted office file.
import { createRequire } from 'node:module';
import { deflateSync } from 'node:zlib';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const JSZip = require('jszip');
const WIDTH = 640;
const HEIGHT = 360;
const FIXED_DATE = new Date('2000-01-01T00:00:00Z');

const GLYPHS = {
  A:'01110100011000111111100011000110001', B:'11110100011000111110100011000111110',
  C:'01111100001000010000100001000001111', D:'11110100011000110001100011000111110',
  E:'11111100001000011110100001000011111', F:'11111100001000011110100001000010000',
  G:'01111100001000010111100011000101111', H:'10001100011000111111100011000110001',
  I:'11111001000010000100001000010011111', L:'10000100001000010000100001000011111',
  M:'10001110111010110101100011000110001', N:'10001110011010110011100011000110001',
  O:'01110100011000110001100011000101110', P:'11110100011000111110100001000010000',
  R:'11110100011000111110101001001010001', S:'01111100001000001110000010000111110',
  T:'11111001000010000100001000010000100', V:'10001100011000110001100010101000100',
  W:'10001100011000110101101011101110001', Y:'10001100010101000100001000010000100',
};

function rect(pixels, x, y, width, height, color) {
  for (let row = Math.max(0, y); row < Math.min(HEIGHT, y + height); row++) {
    for (let col = Math.max(0, x); col < Math.min(WIDTH, x + width); col++) {
      const offset = (row * WIDTH + col) * 3;
      pixels[offset] = color[0]; pixels[offset + 1] = color[1]; pixels[offset + 2] = color[2];
    }
  }
}

function drawText(pixels, value, x, y, scale, color) {
  let cursor = x;
  for (const character of value.toUpperCase()) {
    const glyph = GLYPHS[character];
    if (glyph) {
      for (let row = 0; row < 7; row++) for (let col = 0; col < 5; col++) {
        if (glyph[row * 5 + col] === '1') rect(pixels, cursor + col * scale, y + row * scale, scale, scale, color);
      }
    }
    cursor += 6 * scale;
  }
}

function previewPixels() {
  const pixels = Buffer.alloc(WIDTH * HEIGHT * 3);
  for (let y = 0; y < HEIGHT; y++) {
    const mix = y / (HEIGHT - 1);
    for (let x = 0; x < WIDTH; x++) {
      const offset = (y * WIDTH + x) * 3;
      pixels[offset] = Math.round(242 - mix * 18);
      pixels[offset + 1] = Math.round(247 - mix * 12);
      pixels[offset + 2] = Math.round(255 - mix * 3);
    }
  }
  rect(pixels, 38, 28, 564, 304, [255, 255, 255]);
  rect(pixels, 38, 28, 10, 304, [37, 99, 235]);
  drawText(pixels, 'FILE VIEWER', 78, 64, 6, [22, 45, 82]);
  drawText(pixels, 'PAGES SAMPLE', 78, 135, 5, [37, 99, 235]);
  rect(pixels, 78, 204, 430, 8, [199, 210, 226]);
  rect(pixels, 78, 228, 476, 8, [215, 223, 235]);
  rect(pixels, 78, 252, 390, 8, [215, 223, 235]);
  rect(pixels, 78, 285, 148, 20, [224, 233, 252]);
  return pixels;
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}
function png(pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0); ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  const rows = Buffer.alloc((WIDTH * 3 + 1) * HEIGHT);
  for (let y = 0; y < HEIGHT; y++) pixels.copy(rows, y * (WIDTH * 3 + 1) + 1, y * WIDTH * 3, (y + 1) * WIDTH * 3);
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    pngChunk('IHDR', ihdr), pngChunk('IDAT', deflateSync(rows, { level: 9 })), pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function varint(value) {
  const bytes = [];
  let number = value >>> 0;
  do { bytes.push((number & 0x7f) | (number > 0x7f ? 0x80 : 0)); number >>>= 7; } while (number);
  return Buffer.from(bytes);
}
function protobufStrings(values) {
  return Buffer.concat(values.flatMap((value, index) => {
    const bytes = Buffer.from(value, 'utf8');
    return [varint(((index + 1) << 3) | 2), varint(bytes.length), bytes];
  }));
}
function snappyLiteral(bytes) {
  const length = bytes.length - 1;
  let tag;
  if (bytes.length < 61) tag = Buffer.from([length << 2]);
  else if (length <= 0xff) tag = Buffer.from([60 << 2, length]);
  else tag = Buffer.from([61 << 2, length & 0xff, length >>> 8]);
  return Buffer.concat([varint(bytes.length), tag, bytes]);
}
function iwaPacket(values) {
  const protobuf = protobufStrings(values);
  const header = Buffer.from([0, protobuf.length >>> 16 & 0xff, protobuf.length >>> 8 & 0xff, protobuf.length & 0xff]);
  return Buffer.concat([header, snappyLiteral(protobuf)]);
}

const zip = new JSZip();
zip.file('preview.png', png(previewPixels()), { date: FIXED_DATE, createFolders: false });
zip.file('Index/Document.iwa', iwaPacket([
  'File Viewer Pages Fidelity Sample',
  'A generated local fixture with a meaningful document thumbnail and extractable text.',
  'The preview intentionally demonstrates partial support without claiming complete Pages fidelity.',
]), { date: FIXED_DATE, createFolders: false });
const output = await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE', platform: 'UNIX' });
const destination = join(new URL('../docs/examples/', import.meta.url).pathname, 'sample.pages');
await writeFile(destination, output);
console.log(`Wrote ${destination} (${output.length} bytes, ${WIDTH}x${HEIGHT} preview + IWA text)`);
