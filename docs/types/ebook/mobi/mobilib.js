// MOBI / AZW parser (no dependency, pure JS). MOBI is a PalmDB container: a header + a list of
// records. Record 0 holds the PalmDOC + MOBI headers; the next records hold the (optionally
// PalmDOC-LZ77-compressed) book text; later records hold images. We parse the structure, decompress
// the text, and expose it as HTML + an image map. HUFF/CDIC compression and DRM are detected and
// reported (not supported) rather than producing garbage. Bytes are DATA — never executed.

const td = (bytes, enc = 'utf-8') => new TextDecoder(enc, { fatal: false }).decode(bytes);

// PalmDB: parse the record offset table → array of Uint8Array records.
export function parsePalmDB(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 78) throw new Error('PalmDB header is too short');
  const numRecords = dv.getUint16(76, false);
  if (78 + numRecords * 8 > bytes.length) throw new Error('PalmDB record table is truncated');
  const offsets = [];
  for (let i = 0; i < numRecords; i++) {
    const offset = dv.getUint32(78 + i * 8, false);
    if (offset > bytes.length || (i && offset < offsets[i - 1])) throw new Error('PalmDB record offset is invalid');
    offsets.push(offset);
  }
  const records = [];
  for (let i = 0; i < numRecords; i++) {
    const start = offsets[i];
    const end = i + 1 < numRecords ? offsets[i + 1] : bytes.length;
    records.push(bytes.subarray(start, end));
  }
  return records;
}

export function readMobiHeader(bytes) {
  if (!bytes || bytes.length < 80) return null;
  const records = parsePalmDB(bytes);
  if (!records.length) return null;
  const rec0 = records[0];
  if (rec0.length < 16) return { records };
  const dv = new DataView(rec0.buffer, rec0.byteOffset, rec0.byteLength);
  const out = {
    records,
    compression: dv.getUint16(0, false),
    textLength: dv.getUint32(4, false),
    textRecordCount: dv.getUint16(8, false),
    encryption: dv.getUint16(12, false),
  };
  const M = 16;
  if (rec0.length >= 20 && td(rec0.subarray(16, 20)) === 'MOBI') {
    const mobiHeaderLen = M + 8 <= rec0.length ? dv.getUint32(M + 4, false) : 0;
    out.mobiType = M + 12 <= rec0.length ? dv.getUint32(M + 8, false) : 0;
    out.textEncoding = M + 32 <= rec0.length ? dv.getUint32(M + 28, false) : 0;
    out.version = M + 40 <= rec0.length ? dv.getUint32(M + 36, false) : 0;
    out.firstImageIndex = M + 108 + 4 <= rec0.length ? dv.getUint32(M + 108, false) : 0xffffffff;
    out.extraFlags = mobiHeaderLen > 244 && M + 242 + 2 <= rec0.length ? dv.getUint16(M + 242, false) : 0;
    const fullNameOffset = M + 88 <= rec0.length ? dv.getUint32(M + 84, false) : 0;
    const fullNameLength = M + 92 <= rec0.length ? dv.getUint32(M + 88, false) : 0;
    const enc = out.textEncoding === 1252 ? 'windows-1252' : 'utf-8';
    if (fullNameOffset && fullNameOffset + fullNameLength <= rec0.length) {
      out.fullName = td(rec0.subarray(fullNameOffset, fullNameOffset + fullNameLength), enc);
    }
  }
  return out;
}

// PalmDOC LZ77 decompression (MOBI compression type 2).
export function palmDocDecompress(input) {
  const out = [];
  let i = 0;
  const n = input.length;
  while (i < n) {
    const b = input[i++];
    if (b === 0) { out.push(0); }
    else if (b >= 1 && b <= 8) { for (let j = 0; j < b && i < n; j++) out.push(input[i++]); }   // literal run
    else if (b <= 0x7f) { out.push(b); }                                                        // literal
    else if (b >= 0xc0) { out.push(32, b ^ 0x80); }                                             // space + char
    else {                                                                                      // 0x80..0xbf: LZ77 pair
      const b2 = input[i++];
      const pair = (b << 8) | b2;
      const dist = (pair >> 3) & 0x07ff;
      const len = (pair & 0x07) + 3;
      let srcPos = out.length - dist;
      for (let j = 0; j < len; j++) { out.push(out[srcPos] || 0); srcPos++; }
    }
  }
  return Uint8Array.from(out);
}

// Size of a single trailing-data entry at the end of a text record (backward-encoded varint).
function trailingEntrySize(rec, end) {
  let bitpos = 0, result = 0, p = end - 1;
  while (true) {
    const v = rec[p];
    if (bitpos >= 28 || p < 0) break;
    result |= (v & 0x7f) << bitpos;
    bitpos += 7;
    p--;
    if (v & 0x80) break;
  }
  return result;
}

// Strip trailing data entries from a text record before decompression (extraFlags from MOBI header).
function trimTrailing(rec, extraFlags) {
  let end = rec.length;
  let flags = extraFlags >> 1;
  while (flags) {
    if (flags & 1) { const size = trailingEntrySize(rec, end); end -= size; }
    flags >>= 1;
  }
  if (extraFlags & 1) {                              // multibyte overlap trailing entry
    const b = rec[end - 1];
    const size = (b & 0x3) + 1;
    end -= size;
  }
  return rec.subarray(0, Math.max(0, end));
}

const imgMime = (b) => {
  if (b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50) return 'image/png';
  if (b[0] === 0x47 && b[1] === 0x49) return 'image/gif';
  return null;
};

// Open a MOBI/AZW → { ok, html, images: Map<recindexFromFirstImage, dataUrl>, title } or { ok:false, reason }.
export function openMobi(bytes) {
  if (!bytes || bytes.length < 80) return { ok: false, reason: 'not a MOBI file (too short)' };
  const header = readMobiHeader(bytes);
  const records = header.records;
  if (!records.length) return { ok: false, reason: 'no records found' };
  const rec0 = records[0];
  const dv0 = new DataView(rec0.buffer, rec0.byteOffset, rec0.byteLength);
  const compression = header.compression;
  const textLength = header.textLength;
  const textRecordCount = header.textRecordCount;
  const encryption = header.encryption;
  if (encryption !== 0) return { ok: false, reason: 'this book is DRM-protected and cannot be read' };
  if (compression === 17480) return { ok: false, reason: 'this MOBI uses HUFF/CDIC compression, which is not supported yet' };
  if (compression !== 1 && compression !== 2) return { ok: false, reason: 'unsupported MOBI compression (' + compression + ')' };

  // MOBI header starts at offset 16 in record 0; its field offsets below are 16 + the MOBI-header
  // offset (e.g. First Image Index is MOBI 0x6C → record-0 offset 124).
  const M = 16;
  const hasMobi = rec0.length >= 20 && td(rec0.subarray(16, 20)) === 'MOBI';
  let textEncoding = 'utf-8', firstImageIndex = 0xffffffff, extraFlags = 0, fullName = '';
  if (hasMobi) {
    // KF8/AZW3 (file version ≥ 8) stores the book differently (EPUB-like); the PalmDOC text path
    // below would yield garbage, so detect it and say so rather than mis-rendering.
    const version = dv0.getUint32(M + 36, false);
    if (version >= 8) return { ok: false, reason: 'this is an AZW3 / KF8 (Kindle Format 8) book — not supported yet (older .mobi works)' };
    const mobiHeaderLen = dv0.getUint32(M + 4, false);
    const enc = dv0.getUint32(M + 28, false);
    textEncoding = enc === 1252 ? 'windows-1252' : 'utf-8';
    if (M + 108 + 4 <= rec0.length) firstImageIndex = dv0.getUint32(M + 108, false);
    // extra-data flags live at MOBI offset 0xF2 (242) when the header is long enough.
    if (mobiHeaderLen > 244 && M + 242 + 2 <= rec0.length) extraFlags = dv0.getUint16(M + 242, false);
    const fullNameOffset = dv0.getUint32(M + 84, false);
    const fullNameLength = dv0.getUint32(M + 88, false);
    if (fullNameOffset && fullNameOffset + fullNameLength <= rec0.length) fullName = td(rec0.subarray(fullNameOffset, fullNameOffset + fullNameLength), textEncoding);
  }

  // Decompress text records 1..textRecordCount.
  const parts = [];
  for (let i = 1; i <= textRecordCount && i < records.length; i++) {
    let rec = records[i];
    if (extraFlags) rec = trimTrailing(rec, extraFlags);
    parts.push(compression === 2 ? palmDocDecompress(rec) : rec);
  }
  let total = 0; for (const p of parts) total += p.length;
  const buf = new Uint8Array(total);
  let off = 0; for (const p of parts) { buf.set(p, off); off += p.length; }
  let html = td(buf.subarray(0, textLength || buf.length), textEncoding);

  // Images: records from firstImageIndex onward that look like images.
  const images = new Map();
  if (firstImageIndex !== 0xffffffff && firstImageIndex < records.length) {
    let recindex = 1;                               // MOBI <img recindex> is 1-based from firstImageIndex
    for (let i = firstImageIndex; i < records.length; i++) {
      const r = records[i];
      const mime = r.length > 4 ? imgMime(r) : null;
      if (mime) { images.set(recindex, 'data:' + mime + ';base64,' + base64(r)); }
      recindex++;
    }
  }
  return { ok: true, html, images, title: fullName };
}

// Base64-encode bytes (chunked to avoid call-stack limits on big images).
function base64(bytes) {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  return btoa(bin);
}
