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
  const readIfd = (ifd) => {
    if (ifd + 2 > b.length) return;
    const n = u16(ifd);
    for (let i = 0; i < n; i++) {
      const e = ifd + 2 + i * 12;
      if (e + 12 > b.length) break;
      const tag = u16(e), type = u16(e + 2), count = u32(e + 4);
      if (tag === 0x8769) { readIfd(base + u32(e + 8)); continue; }   // Exif sub-IFD pointer
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
