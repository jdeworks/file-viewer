#!/usr/bin/env node
// Generates docs/examples/sample.sketch — a minimal valid Sketch file (ZIP).
// Pure Node.js, no external dependencies or zip binary needed.

const fs = require('fs');
const path = require('path');

// CRC32 table
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function writeUint16LE(buf, offset, val) {
  buf[offset]     = val & 0xFF;
  buf[offset + 1] = (val >>> 8) & 0xFF;
}

function writeUint32LE(buf, offset, val) {
  buf[offset]     = val & 0xFF;
  buf[offset + 1] = (val >>> 8) & 0xFF;
  buf[offset + 2] = (val >>> 16) & 0xFF;
  buf[offset + 3] = (val >>> 24) & 0xFF;
}

function buildZip(files) {
  const localHeaders = [];
  const centralDirs = [];
  let offset = 0;

  for (const { name, data } of files) {
    const nameBytes = Buffer.from(name, 'utf8');
    const crc = crc32(data);
    const size = data.length;

    // Local file header
    const localHeader = Buffer.alloc(30 + nameBytes.length);
    writeUint32LE(localHeader, 0, 0x04034B50);   // local file header signature
    writeUint16LE(localHeader, 4, 20);             // version needed: 2.0
    writeUint16LE(localHeader, 6, 0);              // general purpose bit flag
    writeUint16LE(localHeader, 8, 0);              // compression method: stored
    writeUint16LE(localHeader, 10, 0);             // last mod file time
    writeUint16LE(localHeader, 12, 0);             // last mod file date
    writeUint32LE(localHeader, 14, crc);           // crc-32
    writeUint32LE(localHeader, 18, size);          // compressed size
    writeUint32LE(localHeader, 22, size);          // uncompressed size
    writeUint16LE(localHeader, 26, nameBytes.length); // file name length
    writeUint16LE(localHeader, 28, 0);             // extra field length
    nameBytes.copy(localHeader, 30);

    localHeaders.push(localHeader);
    localHeaders.push(data);

    // Central directory entry
    const cdEntry = Buffer.alloc(46 + nameBytes.length);
    writeUint32LE(cdEntry, 0, 0x02014B50);         // central dir file header sig
    writeUint16LE(cdEntry, 4, 20);                 // version made by
    writeUint16LE(cdEntry, 6, 20);                 // version needed
    writeUint16LE(cdEntry, 8, 0);                  // general purpose bit flag
    writeUint16LE(cdEntry, 10, 0);                 // compression method: stored
    writeUint16LE(cdEntry, 12, 0);                 // last mod file time
    writeUint16LE(cdEntry, 14, 0);                 // last mod file date
    writeUint32LE(cdEntry, 16, crc);               // crc-32
    writeUint32LE(cdEntry, 20, size);              // compressed size
    writeUint32LE(cdEntry, 24, size);              // uncompressed size
    writeUint16LE(cdEntry, 28, nameBytes.length);  // file name length
    writeUint16LE(cdEntry, 30, 0);                 // extra field length
    writeUint16LE(cdEntry, 32, 0);                 // file comment length
    writeUint16LE(cdEntry, 34, 0);                 // disk number start
    writeUint16LE(cdEntry, 36, 0);                 // internal file attributes
    writeUint32LE(cdEntry, 38, 0);                 // external file attributes
    writeUint32LE(cdEntry, 42, offset);            // relative offset of local header
    nameBytes.copy(cdEntry, 46);

    centralDirs.push(cdEntry);
    offset += localHeader.length + size;
  }

  const cdOffset = offset;
  const cdBuffer = Buffer.concat(centralDirs);
  const cdSize = cdBuffer.length;

  // End of central directory record
  const eocd = Buffer.alloc(22);
  writeUint32LE(eocd, 0, 0x06054B50);             // EOCD signature
  writeUint16LE(eocd, 4, 0);                       // disk number
  writeUint16LE(eocd, 6, 0);                       // disk with start of central dir
  writeUint16LE(eocd, 8, files.length);            // entries on this disk
  writeUint16LE(eocd, 10, files.length);           // total entries
  writeUint32LE(eocd, 12, cdSize);                 // central dir size
  writeUint32LE(eocd, 16, cdOffset);              // central dir offset
  writeUint16LE(eocd, 20, 0);                      // comment length

  return Buffer.concat([...localHeaders, cdBuffer, eocd]);
}

// File contents
const tinyPng = Buffer.from([
  0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A, // PNG magic
  0x00,0x00,0x00,0x0D,0x49,0x48,0x44,0x52, // IHDR chunk
  0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01, // 1x1
  0x08,0x02,0x00,0x00,0x00,0x90,0x77,0x53, // 8bit RGB
  0xDE,0x00,0x00,0x00,0x0C,0x49,0x44,0x41, // IDAT
  0x54,0x08,0xD7,0x63,0xF8,0xCF,0xC0,0x00,
  0x00,0x00,0x02,0x00,0x01,0xE2,0x21,0xBC,
  0x33,0x00,0x00,0x00,0x00,0x49,0x45,0x4E, // IEND
  0x44,0xAE,0x42,0x60,0x82
]);

const metaJson = JSON.stringify({
  appVersion: "99",
  build: 1,
  app: "com.bohemiancoding.sketch3",
  fonts: ["Inter", "SF Pro Display"],
  version: 137,
  commit: "sample",
  compatibilityVersion: 99,
  created: { commit: "sample", appVersion: "99", build: 1, app: "com.bohemiancoding.sketch3", compatibilityVersion: 99 },
  saveHistory: ["BETA.99.1"],
  autosaved: 0,
  variant: "NONAPPSTORE",
  pagesAndArtboards: {
    "page-1-id": {
      name: "Page 1",
      artboards: {
        "artboard-1-id": { name: "Home Screen" },
        "artboard-2-id": { name: "Settings" }
      }
    }
  }
});

const docJson = JSON.stringify({
  _class: "document",
  do_objectID: "doc-id",
  assets: { _class: "assetCollection", colorAssets: [], gradientAssets: [], images: [], colors: [], gradients: [] },
  foreignLayerStyles: [],
  foreignSymbols: [],
  foreignTextStyles: [],
  foreignSwatches: [],
  layerStyles: { _class: "sharedStyleContainer", objects: [] },
  layerSymbols: { _class: "symbolContainer", objects: [] },
  layerTextStyles: { _class: "sharedTextStyleContainer", objects: [] },
  pages: [{ _class: "MSJSONFileReference", _ref_class: "MSImmutablePage", _ref: "pages/page-1-id" }]
});

const pageJson = JSON.stringify({
  _class: "page",
  do_objectID: "page-1-id",
  name: "Page 1",
  layers: [
    {
      _class: "artboard",
      do_objectID: "artboard-1-id",
      name: "Home Screen",
      frame: { _class: "rect", x: 0, y: 0, width: 375, height: 812 },
      layers: []
    },
    {
      _class: "artboard",
      do_objectID: "artboard-2-id",
      name: "Settings",
      frame: { _class: "rect", x: 400, y: 0, width: 375, height: 812 },
      layers: []
    }
  ]
});

const files = [
  { name: 'meta.json',                data: Buffer.from(metaJson, 'utf8') },
  { name: 'document.json',            data: Buffer.from(docJson, 'utf8') },
  { name: 'pages/page-1-id.json',     data: Buffer.from(pageJson, 'utf8') },
  { name: 'previews/preview.png',     data: tinyPng },
];

const out = path.join(__dirname, '../docs/examples/sample.sketch');
fs.writeFileSync(out, buildZip(files));
console.log('Written:', out, '(' + fs.statSync(out).size + ' bytes)');
