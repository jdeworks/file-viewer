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

function parseSubFrames(frame, offset) {
  const out = {};
  let o = offset;
  while (o + 10 <= frame.length) {
    const id = String.fromCharCode(...frame.subarray(o, o + 4));
    if (!/^[A-Z0-9]{4}$/.test(id)) break;
    const size = u32(frame, o + 4);
    o += 10;
    if (size <= 0 || o + size > frame.length) break;
    if (id === 'TIT2') out.title = decodeText(frame.subarray(o, o + size));
    o += size;
  }
  return out;
}

// CHAP (v2.3/2.4 only): element-id\0, start/end ms (4 bytes BE each), start/end byte offsets,
// then optional sub-frames (a TIT2 title is the useful one). Returns { id, start, end, title }.
function parseChap(frame) {
  let o = 0;
  while (o < frame.length && frame[o] !== 0) o++;
  if (o >= frame.length) return null;
  const elementId = new TextDecoder('utf-8').decode(frame.subarray(0, o)).trim();
  o += 1;                                        // skip element-id terminator
  if (o + 16 > frame.length) return null;
  const startMs = u32(frame, o);
  const endMs = u32(frame, o + 4);
  o += 16;                                        // start/end time + start/end offset
  const sub = parseSubFrames(frame, o);
  const chapter = { id: elementId, start: startMs / 1000, title: sub.title || '' };
  if (endMs > startMs) chapter.end = endMs / 1000;
  return chapter;
}

// CTOC: element-id\0, flags, child count, child element ids, then optional TIT2 title sub-frame.
function parseCtoc(frame) {
  let o = 0;
  while (o < frame.length && frame[o] !== 0) o++;
  if (o >= frame.length) return null;
  const id = new TextDecoder('utf-8').decode(frame.subarray(0, o)).trim();
  o += 1;
  if (o + 2 > frame.length) return null;
  const flags = frame[o++];
  const childCount = frame[o++];
  const children = [];
  for (let i = 0; i < childCount && o < frame.length; i += 1) {
    const start = o;
    while (o < frame.length && frame[o] !== 0) o++;
    if (o >= frame.length) return null;
    const child = new TextDecoder('utf-8').decode(frame.subarray(start, o)).trim();
    o += 1;
    if (child) children.push(child);
  }
  const sub = parseSubFrames(frame, o);
  return {
    id,
    children,
    title: sub.title || '',
    topLevel: !!(flags & 0x02),
    ordered: !!(flags & 0x01),
  };
}

function orderChaptersWithCtoc(chapters, ctocs) {
  if (!chapters.length || !ctocs.length) return chapters.sort((a, b) => a.start - b.start);
  const byId = new Map(chapters.filter((chapter) => chapter.id).map((chapter) => [chapter.id, chapter]));
  const tocById = new Map(ctocs.filter((toc) => toc.id).map((toc) => [toc.id, toc]));
  const seenToc = new Set();

  const flatten = (id, groupTitle = '') => {
    if (byId.has(id)) {
      const chapter = byId.get(id);
      if (!chapter.title && groupTitle) chapter.tocTitle = groupTitle;
      return [chapter];
    }
    const toc = tocById.get(id);
    if (!toc || seenToc.has(id)) return [];
    seenToc.add(id);
    const title = toc.title || groupTitle;
    const list = toc.children.flatMap((child) => flatten(child, title));
    seenToc.delete(id);
    return list;
  };

  const roots = ctocs
    .filter((toc) => toc.topLevel || toc.ordered)
    .sort((a, b) => Number(b.topLevel) - Number(a.topLevel) || Number(b.ordered) - Number(a.ordered));
  const candidates = roots.length ? roots : ctocs;
  let ordered = [];
  for (const toc of candidates) {
    const list = toc.children.flatMap((child) => flatten(child, toc.title || ''));
    if (list.length > ordered.length) ordered = list;
  }
  if (ordered.length < 2) return chapters.sort((a, b) => a.start - b.start);

  const used = new Set(ordered);
  const rest = chapters.filter((chapter) => !used.has(chapter)).sort((a, b) => a.start - b.start);
  return [...ordered, ...rest];
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
  const ctocs = [];
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
    else if (id === 'CTOC') { const t = parseCtoc(frame); if (t) ctocs.push(t); }
    o += size;
  }
  if (chapters.length) {
    out.chapters = orderChaptersWithCtoc(chapters, ctocs).map((chapter) => ({
      ...chapter,
      title: chapter.title || chapter.tocTitle || chapter.id || '',
    }));
  }
  return Object.keys(out).length ? out : null;
}
