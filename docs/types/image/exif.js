// Minimal EXIF reader for JPEG: pulls the most useful tags (camera make/model, capture date,
// orientation, and the recorded pixel dimensions) out of the APP1/TIFF block. Hand-rolled, no
// dependency. Returns null when there's no EXIF.

const TAGS = { 0x010F: 'make', 0x0110: 'model', 0x0112: 'orientation', 0x0132: 'dateTime', 0x9003: 'dateTimeOriginal', 0xA002: 'pixelX', 0xA003: 'pixelY' };
const ORIENT = { 1: 'normal', 3: '180°', 6: '90° CW', 8: '90° CCW' };

export function parseExif(bytes) {
  if (!bytes || bytes.length < 4 || bytes[0] !== 0xFF || bytes[1] !== 0xD8) return null;   // JPEG SOI
  let o = 2;
  while (o + 4 < bytes.length) {
    if (bytes[o] !== 0xFF) break;
    const marker = bytes[o + 1];
    if (marker === 0xDA || marker === 0xD9) break;                 // SOS / EOI — past metadata
    const len = (bytes[o + 2] << 8) | bytes[o + 3];
    if (marker === 0xE1 && bytes[o + 4] === 0x45 && bytes[o + 5] === 0x78 && bytes[o + 6] === 0x69 && bytes[o + 7] === 0x66) {
      return parseTiff(bytes, o + 10);                             // skip 'Exif\0\0'
    }
    o += 2 + len;
  }
  return null;
}

function parseTiff(b, base) {
  if (base + 8 > b.length) return null;
  const le = b[base] === 0x49;                                     // 'II' little-endian, 'MM' big
  const u16 = (o) => le ? b[o] | (b[o + 1] << 8) : (b[o] << 8) | b[o + 1];
  const u32 = (o) => le ? (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0
    : ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;

  const out = {};
  // RATIONAL (type 5): a numerator/denominator u32 pair at `off`. Used for GPS lat/lon triples.
  const readRational = (off) => { const den = u32(off + 4); return den ? u32(off) / den : 0; };
  // A GPS coordinate is three RATIONALs (deg, min, sec) starting at `off`.
  const readGpsCoord = (off) => readRational(off) + readRational(off + 8) / 60 + readRational(off + 16) / 3600;
  // GPS IFD (tag 0x8825): decode lat/lon (+ N/S/E/W refs) into decimal degrees. Additive — only
  // touches its own out.gps* keys, never the existing IFD0/Exif tags above.
  const readGpsIfd = (ifd) => {
    if (ifd + 2 > b.length) return;
    const n = u16(ifd);
    for (let i = 0; i < n; i++) {
      const e = ifd + 2 + i * 12;
      if (e + 12 > b.length) break;
      const tag = u16(e), count = u32(e + 4);
      const valOff = count * 8 > 4 ? base + u32(e + 8) : e + 8;          // RATIONALs are always > 4 bytes
      if (tag === 0x0001) out.gpsLatRef = String.fromCharCode(b[e + 8] || 0).trim();
      else if (tag === 0x0003) out.gpsLonRef = String.fromCharCode(b[e + 8] || 0).trim();
      else if (tag === 0x0002 && valOff + 24 <= b.length) out.gpsLat = readGpsCoord(valOff);
      else if (tag === 0x0004 && valOff + 24 <= b.length) out.gpsLon = readGpsCoord(valOff);
    }
  };
  const readIfd = (ifd) => {
    if (ifd + 2 > b.length) return;
    const n = u16(ifd);
    for (let i = 0; i < n; i++) {
      const e = ifd + 2 + i * 12;
      if (e + 12 > b.length) break;
      const tag = u16(e), type = u16(e + 2), count = u32(e + 4);
      if (tag === 0x8769) { readIfd(base + u32(e + 8)); continue; }   // Exif sub-IFD pointer
      if (tag === 0x8825) { readGpsIfd(base + u32(e + 8)); continue; } // GPS IFD pointer
      const name = TAGS[tag];
      if (!name) continue;
      if (type === 2) {                                              // ASCII
        const len = count, off = len > 4 ? base + u32(e + 8) : e + 8;
        let s = '';
        for (let k = 0; k < len && off + k < b.length; k++) { const c = b[off + k]; if (c === 0) break; s += String.fromCharCode(c); }
        out[name] = s.trim();
      } else if (type === 3) {                                       // SHORT
        out[name] = u16(e + 8);
      } else if (type === 4) {                                       // LONG
        out[name] = u32(e + 8);
      }
    }
  };
  readIfd(base + u32(base + 4));
  if (out.orientation != null) out.orientation = ORIENT[out.orientation] || ('#' + out.orientation);
  return Object.keys(out).length ? out : null;
}
