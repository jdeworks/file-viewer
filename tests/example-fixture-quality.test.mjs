import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { Archive } from 'libarchive.js/dist/libarchive-node.mjs';
import { render as renderFits } from '../docs/types/text/fits/renderer.js';

const require = createRequire(import.meta.url);
const JSZip = require('jszip');

const root = new URL('../docs/examples/', import.meta.url);
const bytes = (name) => readFile(new URL(name, root));

// The public 7z must exercise real nested listing and extraction, not only its six-byte signature.
const sevenZipBytes = await bytes('Sample.7z');
assert.ok(sevenZipBytes.length >= 256, 'Sample.7z must not regress to the old empty 33-byte archive');
const sevenZip = await Archive.open(new Blob([sevenZipBytes]));
const archiveFiles = await sevenZip.getFilesArray();
const archiveNames = archiveFiles.map(({ path, file }) => `${path}${file.name}`);
assert.deepEqual(archiveNames, ['README.md', 'docs/guide.txt', 'data/people.csv', 'src/example.js']);
const guide = archiveFiles.find(({ path, file }) => `${path}${file.name}` === 'docs/guide.txt');
assert.match(await (await guide.file.extract()).text(), /inspect nested paths/);
await sevenZip.close();

// An MP4 labeled as video needs an actual nonzero video sample entry. The browser smoke below also
// decodes it; this structural check gives a fast failure for the former audio-only placeholder.
const mp4 = await bytes('sample.mp4');
assert.equal(mp4.subarray(4, 8).toString('ascii'), 'ftyp');
const videoCodecs = ['avc1', 'hvc1', 'hev1', 'vp09', 'av01', 'mp4v'];
let mp4Video = null;
for (const codec of videoCodecs) {
  let offset = -1;
  while ((offset = mp4.indexOf(codec, offset + 1, 'ascii')) >= 0) {
    if (offset + 32 > mp4.length) break;
    const width = mp4.readUInt16BE(offset + 28);
    const height = mp4.readUInt16BE(offset + 30);
    if (width && height) { mp4Video = { codec, width, height }; break; }
  }
  if (mp4Video) break;
}
assert.deepEqual(mp4Video, { codec: 'avc1', width: 320, height: 180 });

// FITS uses fixed 80-byte cards and 2,880-byte blocks; its declared image has a complete, nonzero
// big-endian pixel array. This rejects the previous newline header that merely claimed 512×512.
const fits = await bytes('sample.fits');
assert.equal(fits.length % 2880, 0);
const cards = [];
let endOffset = -1;
for (let offset = 0; offset + 80 <= fits.length; offset += 80) {
  const card = fits.subarray(offset, offset + 80).toString('ascii');
  cards.push(card);
  if (card.slice(0, 8).trim() === 'END') { endOffset = offset; break; }
}
assert.ok(endOffset >= 0 && endOffset < 2880, 'FITS END card must terminate the primary header block');
const fitsValue = (keyword) => cards.find((card) => card.slice(0, 8).trim() === keyword)
  ?.slice(10).split('/')[0].trim().replace(/^'(.*)'$/, '$1').trim();
assert.equal(fitsValue('BITPIX'), '16');
assert.equal(fitsValue('NAXIS1'), '64');
assert.equal(fitsValue('NAXIS2'), '48');
const fitsPixels = fits.subarray(2880, 2880 + 64 * 48 * 2);
assert.equal(fitsPixels.length, 6144);
const fitsValues = [];
for (let offset = 0; offset < fitsPixels.length; offset += 2) fitsValues.push(fitsPixels.readInt16BE(offset));
assert.equal(Math.min(...fitsValues), Number(fitsValue('DATAMIN')));
assert.equal(Math.max(...fitsValues), Number(fitsValue('DATAMAX')));
assert.ok(new Set(fitsValues).size > 1000, 'FITS image must contain a varied pixel field');
const fitsHtml = renderFits({ bytes: fits, isBinary: true, size: fits.length }).bodyHtml;
assert.match(fitsHtml, /Real image samples include a complete padded header/);
assert.match(fitsHtml, /Generated deterministically by scripts\/gen-sample-fits\.mjs/);

// The ELF fixture needs complete program and section tables so the binary renderer sees more than
// a header stub. The entry point targets the executable .text segment and a non-executable stack is
// declared through the second program header.
const elf = await bytes('sample.elf');
assert.deepEqual([...elf.subarray(0, 5)], [0x7f, 0x45, 0x4c, 0x46, 2]);
const elf64 = (offset) => Number(elf.readBigUInt64LE(offset));
const programHeaders = elf.readUInt16LE(56);
const sectionHeaders = elf.readUInt16LE(60);
const sectionOffset = elf64(40);
assert.equal(programHeaders, 2);
assert.equal(sectionHeaders, 5);
assert.ok(sectionOffset + sectionHeaders * 64 <= elf.length, 'ELF section table must fit the file');
assert.equal(elf64(24), 0x400100);
assert.match(elf.toString('latin1'), /\.text\0.*\.symtab\0\.strtab\0/s);

// Pages must exercise both enhanced capabilities. The former 454-byte placeholder contained a
// 1x1 thumbnail and no IWA document content, making the preview look blank while the text tab had
// nothing to extract.
const pages = await bytes('sample.pages');
const pagesZip = await JSZip.loadAsync(pages);
assert.deepEqual(Object.keys(pagesZip.files).sort(), ['Index/Document.iwa', 'preview.png']);
const pagesPreview = Buffer.from(await pagesZip.file('preview.png').async('uint8array'));
assert.deepEqual([...pagesPreview.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
assert.equal(pagesPreview.readUInt32BE(16), 640);
assert.equal(pagesPreview.readUInt32BE(20), 360);
assert.ok(pagesPreview.length > 2000, 'Pages preview must contain a meaningful document image');
const pagesIwa = Buffer.from(await pagesZip.file('Index/Document.iwa').async('uint8array'));
assert.ok(pagesIwa.length > 150, 'Pages fixture must contain extractable IWA content');
assert.match(pagesIwa.toString('utf8'), /File Viewer Pages Fidelity Sample/);

console.log('public example fixture quality tests passed');
