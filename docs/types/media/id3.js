// Minimal ID3v2 (.mp3) tag reader — enough for the metadata panel: title, artist, album, year,
// genre, track. Handles v2.2 (3-char frame IDs) and v2.3/2.4 (4-char). The tag sits at the very
// start of the file, so it's available even for streamed (header-only) large audio. Pure JS.
//
// P7 extends this to also surface APIC embedded cover-art bytes and CHAP chapter frames, so the
// player can show album art and a clickable chapter list — all parsed from the same head slice.

const synchsafe = (b, o) => (b[o] << 21) | (b[o + 1] << 14) | (b[o + 2] << 7) | b[o + 3];
const u32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;

function normImageMime(v) {
  const s = (v || '').trim().toLowerCase();
  if (!s) return 'image/jpeg';
  if (!s.includes('/')) return s === 'jpg' ? 'image/jpeg' : 'image/' + s;
  return s;
}

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

// Read a null-terminated string in the given text encoding starting at `off`; return
// { value, next } where `next` is the byte index just past the terminator.
function readStr(bytes, off, end, enc) {
  const wide = enc === 1 || enc === 2;        // UTF-16 → 2-byte terminator
  let i = off;
  if (wide) {
    while (i + 1 < end && !(bytes[i] === 0 && bytes[i + 1] === 0)) i += 2;
    const value = decodeText(Uint8Array.of(enc, ...bytes.subarray(off, i)));
    return { value, next: Math.min(end, i + 2) };
  }
  while (i < end && bytes[i] !== 0) i++;
  const value = decodeText(Uint8Array.of(enc, ...bytes.subarray(off, i)));
  return { value, next: Math.min(end, i + 1) };
}

// APIC (v2.3/2.4) / PIC (v2.2): encoding byte, MIME / 3-char format, picture type, description,
// then the raw image bytes. Returns { mime, bytes } or null.
function parseApic(frame, v22) {
  if (!frame.length) return null;
  const enc = frame[0];
  let o = 1, mime;
  if (v22) { mime = normImageMime(String.fromCharCode(frame[1], frame[2], frame[3])); o = 4; }
  else {
    let e = o;
    while (e < frame.length && frame[e] !== 0) e++;
    if (e >= frame.length) return null;
    mime = normImageMime(String.fromCharCode(...frame.subarray(o, e)));
    o = e + 1;
  }
  o += 1;                                       // picture type byte
  const desc = readStr(frame, o, frame.length, enc);
  o = desc.next;
  const data = frame.subarray(o);
  return data.length ? { mime, bytes: data.slice() } : null;
}

// CHAP (v2.3/2.4 only): element-id\0, start/end ms (4 bytes BE each), start/end byte offsets,
// then optional sub-frames (a TIT2 title is the useful one). Returns { start, title } or null.
function parseChap(frame) {
  let o = 0;
  while (o < frame.length && frame[o] !== 0) o++;
  if (o >= frame.length) return null;
  o += 1;                                        // skip element-id + terminator
  if (o + 16 > frame.length) return null;
  const startMs = u32(frame, o);
  o += 16;                                        // start/end time + start/end offset
  let title = '';
  while (o + 10 <= frame.length) {                // embedded sub-frames (10-byte headers)
    const id = String.fromCharCode(...frame.subarray(o, o + 4));
    if (!/^[A-Z0-9]{4}$/.test(id)) break;
    const size = u32(frame, o + 4);
    o += 10;
    if (size <= 0 || o + size > frame.length) break;
    if (id === 'TIT2') title = decodeText(frame.subarray(o, o + size));
    o += size;
  }
  return { start: startMs / 1000, title };
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
  const picId = v22 ? 'PIC' : 'APIC';

  const out = {};
  const chapters = [];
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
    const frame = bytes.subarray(o, o + size);
    const key = map[id];
    if (key) { const v = decodeText(frame); if (v) out[key] = v; }
    else if (id === picId && !out.cover) { const pic = parseApic(frame, v22); if (pic) out.cover = pic; }
    else if (id === 'CHAP') { const c = parseChap(frame); if (c) chapters.push(c); }
    o += size;
  }
  if (chapters.length) out.chapters = chapters.sort((a, b) => a.start - b.start);
  return Object.keys(out).length ? out : null;
}
