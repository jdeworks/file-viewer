#!/usr/bin/env node
// Generates docs/examples/sample.fits — a valid 64×48 FITS primary image HDU with deterministic
// 16-bit big-endian pixels. Both the header and data use the FITS-mandated 2,880-byte blocking.
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BLOCK = 2880;
const WIDTH = 64;
const HEIGHT = 48;

function valueCard(keyword, value, comment = '') {
  const prefix = `${keyword.padEnd(8)}= ${String(value).padStart(20)}`;
  return `${prefix}${comment ? ` / ${comment}` : ''}`.slice(0, 80).padEnd(80, ' ');
}

function textCard(keyword, value) {
  return `${keyword.padEnd(8)}${value}`.slice(0, 80).padEnd(80, ' ');
}

const pixels = Buffer.alloc(WIDTH * HEIGHT * 2);
let minPixel = Number.POSITIVE_INFINITY;
let maxPixel = Number.NEGATIVE_INFINITY;
for (let y = 0; y < HEIGHT; y++) {
  for (let x = 0; x < WIDTH; x++) {
    const gradient = Math.round((x / (WIDTH - 1)) * 9000 + (y / (HEIGHT - 1)) * 5000);
    const starA = Math.max(0, 8000 - ((x - 18) ** 2 + (y - 15) ** 2) * 650);
    const starB = Math.max(0, 6000 - ((x - 46) ** 2 + (y - 31) ** 2) * 500);
    const value = Math.min(20000, gradient + starA + starB);
    minPixel = Math.min(minPixel, value);
    maxPixel = Math.max(maxPixel, value);
    pixels.writeInt16BE(value, (y * WIDTH + x) * 2);
  }
}

const cards = [
  valueCard('SIMPLE', 'T', 'file conforms to FITS standard'),
  valueCard('BITPIX', '16', '16-bit signed integer pixels'),
  valueCard('NAXIS', '2', 'two-dimensional primary image'),
  valueCard('NAXIS1', String(WIDTH), 'image width'),
  valueCard('NAXIS2', String(HEIGHT), 'image height'),
  valueCard('EXTEND', 'T', 'extensions may be present'),
  valueCard('OBJECT', "'FV-GRADIENT'", 'synthetic gradient and star field'),
  valueCard('TELESCOP', "'FileViewer'", 'deterministic sample generator'),
  valueCard('INSTRUME', "'DemoCam'", 'public-beta fixture'),
  valueCard('OBSERVER', "'File Viewer'", 'sample data only'),
  valueCard('DATE-OBS', "'2026-01-15T09:30:00'", 'fixed UTC timestamp'),
  valueCard('EXPTIME', '30.0', 'seconds'),
  valueCard('BZERO', '0', 'physical value offset'),
  valueCard('BSCALE', '1', 'physical value scale'),
  valueCard('DATAMIN', String(minPixel), 'minimum stored value'),
  valueCard('DATAMAX', String(maxPixel), 'maximum stored value'),
  textCard('COMMENT', ' Real image samples include a complete padded header and pixel array.'),
  textCard('HISTORY', ' Generated deterministically by scripts/gen-sample-fits.mjs.'),
  'END'.padEnd(80, ' '),
];

const headerText = cards.join('');
const header = Buffer.alloc(Math.ceil(headerText.length / BLOCK) * BLOCK, 0x20);
header.write(headerText, 0, 'ascii');

const data = Buffer.alloc(Math.ceil(pixels.length / BLOCK) * BLOCK);
pixels.copy(data);

const output = Buffer.concat([header, data]);
const destination = join(new URL('../docs/examples/', import.meta.url).pathname, 'sample.fits');
await writeFile(destination, output);
console.log(`Wrote ${destination} (${output.length} bytes, ${WIDTH}x${HEIGHT} FITS image)`);
