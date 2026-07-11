#!/usr/bin/env node
// Generates docs/examples/sample.cbz — three deterministic 600×900 comic pages with real panel
// geometry, gutters, lettering, gradients, and distinct art. This exercises scaling, natural page
// order, fit-to-width, and two-page spread behavior instead of three single-color thumbnails.
import { createRequire } from 'node:module';
import { deflateSync } from 'node:zlib';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const JSZip = require('jszip');
const WIDTH = 600;
const HEIGHT = 900;
const FIXED_DATE = new Date('2000-01-01T00:00:00Z');

const GLYPHS = {
  A:'01110100011000111111100011000110001', B:'11110100011000111110100011000111110',
  C:'01111100001000010000100001000001111', D:'11110100011000110001100011000111110',
  E:'11111100001000011110100001000011111', F:'11111100001000011110100001000010000',
  G:'01111100001000010111100011000101111', H:'10001100011000111111100011000110001',
  I:'11111001000010000100001000010011111', J:'00111000100001000010100101001001100',
  K:'10001100101010011000101001001010001', L:'10000100001000010000100001000011111',
  M:'10001110111010110101100011000110001', N:'10001110011010110011100011000110001',
  O:'01110100011000110001100011000101110', P:'11110100011000111110100001000010000',
  Q:'01110100011000110001101011001001101', R:'11110100011000111110101001001010001',
  S:'01111100001000001110000010000111110', T:'11111001000010000100001000010000100',
  U:'10001100011000110001100011000101110', V:'10001100011000110001100010101000100',
  W:'10001100011000110101101011101110001', X:'10001100010101000100010101000110001',
  Y:'10001100010101000100001000010000100', Z:'11111000010001000100010001000011111',
  '0':'01110100011001110101110011000101110', '1':'00100011000010000100001000010001110',
  '2':'01110100010000100010001000100011111', '3':'11110000010000101110000010000111110',
  '4':'00010001100101010010111110001000010', '5':'11111100001111000001000011000101110',
  '6':'00110010001000011110100011000101110', '7':'11111000010001000100010000100001000',
  '8':'01110100011000101110100011000101110', '9':'01110100011000101111000010001001100',
};
for (const [character, glyph] of Object.entries(GLYPHS)) {
  if (glyph.length !== 35) throw new Error(`invalid 5x7 glyph ${character}: ${glyph.length} bits`);
}

const pages = [
  { name: 'page-01.png', colors: [[34,61,110],[76,153,187],[244,191,91]], label: 'PAGE 01' },
  { name: 'page-02.png', colors: [[75,42,107],[186,86,133],[82,180,164]], label: 'PAGE 02' },
  { name: 'page-10.png', colors: [[22,81,70],[239,112,83],[249,214,117]], label: 'PAGE 10' },
];

function makeCanvas(pageIndex, palette) {
  const pixels = Buffer.alloc(WIDTH * HEIGHT * 3);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const wave = ((x * 13 + y * 7 + pageIndex * 29) % 41) - 20;
      const mix = y / (HEIGHT - 1);
      const accent = 0.24 * (x / (WIDTH - 1));
      const upper = (1 - mix) * (1 - accent);
      const lower = mix * (1 - accent);
      const offset = (y * WIDTH + x) * 3;
      for (let channel = 0; channel < 3; channel++) {
        pixels[offset + channel] = Math.max(0, Math.min(255,
          Math.round(palette[0][channel] * upper + palette[1][channel] * lower
            + palette[2][channel] * accent + wave * 0.65)));
      }
    }
  }
  return pixels;
}

function pixel(canvas, x, y, color) {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  const offset = (Math.floor(y) * WIDTH + Math.floor(x)) * 3;
  canvas[offset] = color[0]; canvas[offset + 1] = color[1]; canvas[offset + 2] = color[2];
}
function rect(canvas, x, y, width, height, color) {
  for (let row = Math.max(0, y); row < Math.min(HEIGHT, y + height); row++) {
    for (let col = Math.max(0, x); col < Math.min(WIDTH, x + width); col++) pixel(canvas, col, row, color);
  }
}
function frame(canvas, x, y, width, height, fill, border = [18, 24, 35], stroke = 7) {
  rect(canvas, x, y, width, height, border);
  rect(canvas, x + stroke, y + stroke, width - stroke * 2, height - stroke * 2, fill);
}
function line(canvas, x0, y0, x1, y1, color, thickness = 3) {
  let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1, error = dx + dy;
  while (true) {
    rect(canvas, x0 - Math.floor(thickness / 2), y0 - Math.floor(thickness / 2), thickness, thickness, color);
    if (x0 === x1 && y0 === y1) break;
    const twice = 2 * error;
    if (twice >= dy) { error += dy; x0 += sx; }
    if (twice <= dx) { error += dx; y0 += sy; }
  }
}
function circle(canvas, cx, cy, radius, color) {
  for (let y = -radius; y <= radius; y++) {
    const span = Math.floor(Math.sqrt(radius * radius - y * y));
    rect(canvas, cx - span, cy + y, span * 2 + 1, 1, color);
  }
}
function text(canvas, value, x, y, scale = 5, color = [15, 22, 32]) {
  let cursor = x;
  for (const character of value.toUpperCase()) {
    const glyph = GLYPHS[character];
    if (glyph) {
      for (let row = 0; row < 7; row++) for (let col = 0; col < 5; col++) {
        if (glyph[row * 5 + col] === '1') rect(canvas, cursor + col * scale, y + row * scale, scale, scale, color);
      }
    }
    cursor += 6 * scale;
  }
}

function drawPage(index, page) {
  const canvas = makeCanvas(index, page.colors);
  rect(canvas, 24, 22, 552, 72, [249, 247, 237]);
  frame(canvas, 24, 22, 552, 72, [249, 247, 237]);
  text(canvas, 'FILE VIEWER', 48, 38, 6);
  text(canvas, page.label, 390, 48, 3, page.colors[0]);
  if (index === 0) {
    frame(canvas, 28, 118, 544, 300, [205, 232, 239]);
    line(canvas, 48, 376, 540, 156, page.colors[0], 8);
    circle(canvas, 180, 252, 62, page.colors[2]); circle(canvas, 180, 252, 38, [249,247,237]);
    frame(canvas, 28, 440, 258, 420, [245, 205, 132]);
    frame(canvas, 314, 440, 258, 420, [119, 192, 183]);
    text(canvas, 'OPEN', 76, 470, 6); text(canvas, 'INSPECT', 330, 470, 5);
    for (let y = 565; y < 820; y += 38) line(canvas, 52, y, 256, y - 20, [68,80,105], 4);
    for (let x = 344; x < 540; x += 45) circle(canvas, x, 650 + ((x / 45) % 2) * 55, 18, page.colors[2]);
  } else if (index === 1) {
    frame(canvas, 28, 118, 258, 330, [232, 214, 239]);
    frame(canvas, 314, 118, 258, 330, [206, 239, 228]);
    frame(canvas, 28, 476, 258, 384, [248, 221, 173]);
    frame(canvas, 314, 476, 258, 384, [207, 220, 246]);
    text(canvas, 'OFFLINE', 48, 146, 4); text(canvas, 'COMPARE', 328, 146, 4);
    for (let i = 0; i < 7; i++) {
      circle(canvas, 72 + i * 28, 284 + (i % 2) * 24, 11 + (i % 3) * 3, page.colors[1]);
      line(canvas, 338, 240 + i * 24, 548, 205 + i * 31, page.colors[0], 3);
    }
    text(canvas, 'LIGHT', 64, 510, 5); text(canvas, 'DARK', 360, 510, 5);
    for (let y = 620; y < 820; y += 32) {
      rect(canvas, 55, y, 200, 15, [255 - (y % 97), 130 + (y % 73), 90]);
      rect(canvas, 340, y, 200, 15, [30 + (y % 79), 55, 110 + (y % 91)]);
    }
  } else {
    frame(canvas, 28, 118, 544, 742, [250, 225, 162]);
    for (let r = 260; r > 30; r -= 24) circle(canvas, 300, 410, r, r % 48 ? page.colors[1] : page.colors[0]);
    circle(canvas, 300, 410, 118, [249,247,237]);
    text(canvas, 'THE END', 181, 378, 8, page.colors[0]);
    frame(canvas, 96, 660, 408, 124, [249,247,237]);
    text(canvas, 'KEEP EXPLORING', 122, 699, 5, page.colors[1]);
  }
  return canvas;
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let value = n;
  for (let i = 0; i < 8; i++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const name = Buffer.from(type);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  return Buffer.concat([length, name, data, checksum]);
}
function png(canvas) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0); ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  const rows = Buffer.alloc((WIDTH * 3 + 1) * HEIGHT);
  for (let y = 0; y < HEIGHT; y++) canvas.copy(rows, y * (WIDTH * 3 + 1) + 1, y * WIDTH * 3, (y + 1) * WIDTH * 3);
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    pngChunk('IHDR', ihdr), pngChunk('IDAT', deflateSync(rows, { level: 9 })), pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const zip = new JSZip();
for (let index = 0; index < pages.length; index++) {
  zip.file(pages[index].name, png(drawPage(index, pages[index])), { date: FIXED_DATE, createFolders: false });
}
const output = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 }, platform: 'UNIX' });
const destination = join(new URL('../docs/examples/', import.meta.url).pathname, 'sample.cbz');
await writeFile(destination, output);
console.log(`Wrote ${destination} (${output.length} bytes, 3 illustrated ${WIDTH}x${HEIGHT} pages)`);
