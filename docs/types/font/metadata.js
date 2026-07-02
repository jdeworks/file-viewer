const FORMATS = { wOFF: 'WOFF', wOF2: 'WOFF2', OTTO: 'OpenType (CFF)', true: 'TrueType', ttcf: 'TrueType Collection' };

export async function extract(intake) {
  const b = intake.bytes || new Uint8Array();
  let format = 'unknown';
  if (b.length >= 4) {
    const sig = String.fromCharCode(b[0], b[1], b[2], b[3]);
    if (FORMATS[sig]) format = FORMATS[sig];
    else if (b[0] === 0x00 && b[1] === 0x01 && b[2] === 0x00 && b[3] === 0x00) format = 'TrueType';
  }
  const out = [
    { label: 'Format', value: format },
    { label: 'Size', value: (intake.size / 1024).toFixed(1) + ' KB' },
  ];
  const info = await parseSfntInfo(b);
  if (info) {
    if (info.collectionCount) out.push({ label: 'Fonts in collection', value: String(info.collectionCount) });
    out.push({ label: 'Tables', value: String(info.tableCount) });
    if (info.family) out.push({ label: 'Family', value: info.family });
    if (info.subfamily) out.push({ label: 'Subfamily', value: info.subfamily });
    if (info.fullName) out.push({ label: 'Full name', value: info.fullName });
    if (info.version) out.push({ label: 'Font version', value: info.version });
    if (info.unitsPerEm) out.push({ label: 'Units per em', value: String(info.unitsPerEm) });
    if (info.glyphs != null) out.push({ label: 'Glyphs', value: info.glyphs.toLocaleString() });
    if (info.weightClass) out.push({ label: 'Weight class', value: String(info.weightClass) });
    if (info.widthClass) out.push({ label: 'Width class', value: String(info.widthClass) });
    if (info.designer) out.push({ label: 'Designer', value: info.designer });
    if (info.manufacturer) out.push({ label: 'Manufacturer', value: info.manufacturer });
    if (info.vendorUrl) out.push({ label: 'Vendor URL', value: info.vendorUrl });
    if (info.copyright) out.push({ label: 'Copyright', value: info.copyright.slice(0, 200) });
    if (info.license) out.push({ label: 'License', value: info.license.slice(0, 200) });
    if (info.licenseUrl) out.push({ label: 'License URL', value: info.licenseUrl });
  }
  return out;
}

// Resolve the font's table directory to { tableCount, collectionCount?, tables }, where
// `tables` maps a 4-char tag to an async getter that returns that table's decoded bytes
// (local offsets, 0-based) or null. Three container shapes:
//  - raw sfnt / TrueType Collection ('ttcf'): table dir at offset+12, 16-byte entries
//    (tag, checksum, offset, length); table bytes are plain slices.
//  - WOFF ('wOFF'): its own header (numTables at byte 12, NOT byte 4 like raw sfnt) and a
//    44-byte-offset table dir with 20-byte entries (tag, offset, compLength, origLength,
//    origChecksum); a table is zlib (RFC 1950)-compressed whenever compLength < origLength.
//  - WOFF2 ('wOF2'): numTables also lives at byte 12, but table data is one Brotli-compressed
//    blob addressed by a compact custom directory (UIntBase128 varints + implicit known-tag
//    table) — decoding it needs a Brotli decompressor we don't vendor, so we only report the
//    honest table count and stop there (no name-table/head/maxp/OS2 fields for WOFF2).
async function parseSfntInfo(bytes) {
  if (bytes.length < 12) return null;
  const dv0 = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const sig = tag(bytes, 0);

  if (sig === 'wOF2') {
    if (bytes.length < 16) return null;
    const tableCount = dv0.getUint16(12, false);
    return tableCount ? { tableCount, tables: new Map() } : null;
  }

  let tables;
  let info = {};
  if (sig === 'wOFF') {
    if (bytes.length < 44) return null;
    const tableCount = dv0.getUint16(12, false);
    if (!tableCount || 44 + tableCount * 20 > bytes.length) return null;
    tables = new Map();
    for (let i = 0; i < tableCount; i++) {
      const p = 44 + i * 20;
      const name = tag(bytes, p);
      const off = dv0.getUint32(p + 4, false);
      const compLength = dv0.getUint32(p + 8, false);
      const origLength = dv0.getUint32(p + 12, false);
      if (!name || off + compLength > bytes.length) continue;
      tables.set(name, async () => {
        const raw = bytes.subarray(off, off + compLength);
        return compLength === origLength ? raw : inflateZlib(raw);
      });
    }
    info.tableCount = tableCount;
  } else {
    let offset = 0;
    if (sig === 'ttcf') {
      if (bytes.length < 16) return null;
      info.collectionCount = dv0.getUint32(8, false);
      offset = dv0.getUint32(12, false);
    }
    if (offset + 12 > bytes.length) return null;
    const tableCount = dv0.getUint16(offset + 4, false);
    if (!tableCount || offset + 12 + tableCount * 16 > bytes.length) return null;
    tables = new Map();
    for (let i = 0; i < tableCount; i++) {
      const p = offset + 12 + i * 16;
      const name = tag(bytes, p);
      const tOffset = dv0.getUint32(p + 8, false);
      const length = dv0.getUint32(p + 12, false);
      if (name && tOffset + length <= bytes.length) tables.set(name, async () => bytes.subarray(tOffset, tOffset + length));
    }
    info.tableCount = tableCount;
  }

  const nameBytes = await tables.get('name')?.();
  if (nameBytes) readNames(nameBytes, info);
  const headBytes = await tables.get('head')?.();
  if (headBytes) readHead(headBytes, info);
  const maxpBytes = await tables.get('maxp')?.();
  if (maxpBytes) readMaxp(maxpBytes, info);
  const os2Bytes = await tables.get('OS/2')?.();
  if (os2Bytes) readOS2(os2Bytes, info);
  return info;
}

// Inflate a zlib (RFC 1950)-wrapped buffer — the compression WOFF uses for table data —
// via the native (unvendored) DecompressionStream API. Returns null on failure/unsupported.
async function inflateZlib(bytes) {
  if (typeof DecompressionStream === 'undefined') return null;
  try {
    const ds = new DecompressionStream('deflate');
    const w = ds.writable.getWriter();
    w.write(bytes); w.close();
    const chunks = [];
    const r = ds.readable.getReader();
    while (true) { const { done, value } = await r.read(); if (done) break; chunks.push(value); }
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const out = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) { out.set(c, off); off += c.length; }
    return out;
  } catch { return null; }
}

function tag(bytes, offset) {
  if (offset + 4 > bytes.length) return '';
  return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
}

// All read* helpers take a table's own bytes (local, 0-based offsets) — same layout
// regardless of whether the table came from a raw sfnt slice or an inflated WOFF entry.
function readNames(tbl, info) {
  if (tbl.length < 6) return;
  const dv = new DataView(tbl.buffer, tbl.byteOffset, tbl.byteLength);
  const count = dv.getUint16(2, false);
  const strings = dv.getUint16(4, false);
  const wanted = new Map([
    [0, 'copyright'], [1, 'family'], [2, 'subfamily'], [4, 'fullName'], [5, 'version'],
    [8, 'manufacturer'], [9, 'designer'], [11, 'vendorUrl'], [13, 'license'], [14, 'licenseUrl'],
  ]);
  for (let i = 0; i < count; i++) {
    const p = 6 + i * 12;
    if (p + 12 > tbl.length) break;
    const platform = dv.getUint16(p, false);
    const encoding = dv.getUint16(p + 2, false);
    const language = dv.getUint16(p + 4, false);
    const nameId = dv.getUint16(p + 6, false);
    const length = dv.getUint16(p + 8, false);
    const offset = strings + dv.getUint16(p + 10, false);
    const key = wanted.get(nameId);
    if (!key || info[key] || offset + length > tbl.length) continue;
    const value = decodeName(tbl.subarray(offset, offset + length), platform, encoding).trim();
    if (value && (language === 0x0409 || !info[key])) info[key] = value.slice(0, 500);
  }
}

function decodeName(bytes, platform, encoding) {
  const utf16 = platform === 0 || platform === 3 || (platform === 2 && encoding === 1);
  if (utf16) {
    let out = '';
    for (let i = 0; i + 1 < bytes.length; i += 2) out += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
    return out;
  }
  return new TextDecoder('latin1').decode(bytes);
}

function readHead(tbl, info) {
  if (tbl.length < 20) return;
  info.unitsPerEm = new DataView(tbl.buffer, tbl.byteOffset, tbl.byteLength).getUint16(18, false);
}

function readMaxp(tbl, info) {
  if (tbl.length < 6) return;
  info.glyphs = new DataView(tbl.buffer, tbl.byteOffset, tbl.byteLength).getUint16(4, false);
}

function readOS2(tbl, info) {
  if (tbl.length < 8) return;
  const dv = new DataView(tbl.buffer, tbl.byteOffset, tbl.byteLength);
  info.weightClass = dv.getUint16(4, false);
  info.widthClass = dv.getUint16(6, false);
}
