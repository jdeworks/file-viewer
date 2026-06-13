// Minimal ID3v2 (.mp3) tag reader — enough for the metadata panel: title, artist, album, year,
// genre, track. Handles v2.2 (3-char frame IDs) and v2.3/2.4 (4-char). The tag sits at the very
// start of the file, so it's available even for streamed (header-only) large audio. Pure JS.

const synchsafe = (b, o) => (b[o] << 21) | (b[o + 1] << 14) | (b[o + 2] << 7) | b[o + 3];

function decodeText(data) {
  if (!data.length) return '';
  const enc = data[0];
  const body = data.subarray(1);
  try {
    if (enc === 1) return new TextDecoder('utf-16').decode(body).replace(/\0+$/, '').trim();
    if (enc === 2) return new TextDecoder('utf-16be').decode(body).replace(/\0+$/, '').trim();
    if (enc === 3) return new TextDecoder('utf-8').decode(body).replace(/\0+$/, '').trim();
    return new TextDecoder('iso-8859-1').decode(body).replace(/\0+$/, '').trim();
  } catch { return ''; }
}

export function parseId3(bytes) {
  if (!bytes || bytes.length < 10) return null;
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return null;   // 'ID3'
  const major = bytes[3];
  const end = Math.min(bytes.length, 10 + synchsafe(bytes, 6));
  const v22 = major === 2;
  const idLen = v22 ? 3 : 4;
  const headLen = v22 ? 6 : 10;
  const map = v22
    ? { TT2: 'title', TP1: 'artist', TAL: 'album', TYE: 'year', TCO: 'genre', TRK: 'track' }
    : { TIT2: 'title', TPE1: 'artist', TALB: 'album', TYER: 'year', TDRC: 'year', TCON: 'genre', TRCK: 'track' };

  const out = {};
  let o = 10;
  while (o + headLen <= end) {
    const id = String.fromCharCode(...bytes.subarray(o, o + idLen));
    if (!/^[A-Z0-9]+$/.test(id)) break;     // padding / end of frames
    let size;
    if (v22) { size = (bytes[o + 3] << 16) | (bytes[o + 4] << 8) | bytes[o + 5]; }
    else if (major === 4) { size = synchsafe(bytes, o + 4); }
    else { size = ((bytes[o + 4] << 24) | (bytes[o + 5] << 16) | (bytes[o + 6] << 8) | bytes[o + 7]) >>> 0; }
    o += headLen;
    if (size <= 0 || o + size > end) break;
    const key = map[id];
    if (key) { const v = decodeText(bytes.subarray(o, o + size)); if (v) out[key] = v; }
    o += size;
  }
  return Object.keys(out).length ? out : null;
}
