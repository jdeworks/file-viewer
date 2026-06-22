// Sony LRF (BBeB) reader core. Mirrors mobilib.js in shape: bytes → header → object index →
// objects → spine/text/images → a render-ready book model, or { ok:false, reason } for DRM /
// unsupported files. All decoding uses native APIs (DataView, TextDecoder, DecompressionStream) —
// zero off-origin. Bytes are DATA, never executed.
//
// Pipeline:
//   1) header + object index (lrf-header.js)
//   2) parse every object record (lrf-objects.js)
//   3) PageTree → ordered Page ids = the "spine"; Page/Block → TextBlock + Image objects
//   4) TextBlock stream → inflate + descramble → HTML (lrf-text.js)
//   5) ImageStream → raw bytes + format flag → blob-ready { mime, bytes }
//   6) BookAttr / info XML → title, author, cover

import { isLrf, looksDrm, readHeader, readObjectIndex, inflateAny, descramble } from './lrf-header.js';
import { parseObject, streamBytes, TYPE } from './lrf-objects.js';
import { decodeTextStream } from './lrf-text.js';

const IMG_MIME = { 0x11: 'image/jpeg', 0x12: 'image/png', 0x13: 'image/bmp', 0x14: 'image/gif' };

// Decode the zlib info XML block at 0x58 (raw zlib — no length prefix, header byte is at offset 0).
async function readInfoXml(bytes, header) {
  const start = 0x58;
  const size = header.compressedInfoSize;
  if (!size || start + size > bytes.length) return null;
  const block = bytes.subarray(start, start + size);
  if (block.length < 2) return null;
  try {
    const xml = await inflateAny(block);
    // LRF info XML declares its own encoding; it's commonly UTF-16. Decode UTF-16LE if a BOM or a
    // null-heavy prefix says so, else UTF-8.
    const looksUtf16 = (xml[0] === 0xff && xml[1] === 0xfe) || (xml.length > 2 && xml[1] === 0x00);
    return new TextDecoder(looksUtf16 ? 'utf-16le' : 'utf-8', { fatal: false }).decode(xml);
  } catch { return null; }
}

function metaFromXml(xml) {
  const out = { title: '', author: '', cover: '', publisher: '', language: '' };
  if (!xml) return out;
  let doc;
  try { doc = new DOMParser().parseFromString(xml, 'application/xml'); } catch { return out; }
  if (!doc || doc.querySelector('parsererror')) {
    // Fall back to a tolerant regex pull when the XML is slightly malformed.
    const grab = (re) => { const m = xml.match(re); return m ? m[1].trim() : ''; };
    out.title = grab(/<Title[^>]*>([\s\S]*?)<\/Title>/i);
    out.author = grab(/<Author[^>]*>([\s\S]*?)<\/Author>/i);
    out.publisher = grab(/<Publisher[^>]*>([\s\S]*?)<\/Publisher>/i);
    out.language = grab(/<Language[^>]*>([\s\S]*?)<\/Language>/i);
    const cm = xml.match(/<CoverObject[^>]*>([\s\S]*?)<\/CoverObject>/i) || xml.match(/cover[^>]*objid="?(\d+)/i);
    if (cm) out.cover = cm[1].trim();
    return out;
  }
  const text = (sel) => { const el = doc.querySelector(sel); return el ? el.textContent.trim() : ''; };
  out.title = text('Title') || text('BookInfo > Title');
  out.author = text('Author') || text('BookInfo > Author');
  out.publisher = text('Publisher');
  out.language = text('Language');
  const cover = doc.querySelector('CoverObject') || doc.querySelector('[objid]');
  if (cover) out.cover = (cover.getAttribute('objid') || cover.textContent || '').trim();
  return out;
}

// Build the ordered spine of Page ids by following the PageTree's contained list (the root object
// is usually a BookAttr/PageTree). We look up the first PageTree object as the reliable anchor.
function buildSpine(objects) {
  for (const obj of objects.values()) {
    if (obj.type === TYPE.PageTree && obj.contained && obj.contained.length) return obj.contained.slice();
  }
  // Fallback: every Page object in id order.
  return [...objects.values()].filter((o) => o.type === TYPE.Page).map((o) => o.id).sort((a, b) => a - b);
}

// Collect TextBlock + Image object ids reachable from a Page (Page → Blocks → content refs).
function pageContent(pageId, objects) {
  const texts = [], images = [];
  const seen = new Set();
  const walk = (id, depth) => {
    if (depth > 6 || seen.has(id)) return;
    seen.add(id);
    const o = objects.get(id);
    if (!o) return;
    if (o.type === TYPE.Text) texts.push(o);
    else if (o.type === TYPE.Image || o.type === TYPE.ImageStream) images.push(o);
    const kids = (o.contained || []).concat(o.refs || []);
    for (const k of kids) walk(k, depth + 1);
  };
  walk(pageId, 0);
  return { texts, images };
}

// Resolve an Image object id → the ImageStream it references → { mime, bytes } (descrambled).
function resolveImage(refId, objects, xorKey) {
  let stream = objects.get(refId);
  if (stream && stream.type === TYPE.Image && stream.refs.length) stream = objects.get(stream.refs[0]);
  if (!stream || stream.type !== TYPE.ImageStream || !stream.stream) return null;
  const mime = IMG_MIME[stream.streamFlags & 0xff] || 'image/jpeg';
  const bytes = streamBytes(stream, xorKey, false);   // images scramble only first 0x400 bytes
  return bytes ? { mime, bytes } : null;
}

export async function openLrf(bytes) {
  if (looksDrm(bytes)) return { ok: false, reason: 'this book is DRM-protected (Marlin) and cannot be read' };
  if (!isLrf(bytes)) return { ok: false, reason: 'not a Sony LRF file (bad signature)' };
  const header = readHeader(bytes);
  if (header.version < 700 || header.version > 1200) {
    // Out-of-range version usually means an encrypted .lrx or a corrupt file.
    return { ok: false, reason: 'unsupported LRF version (' + header.version + ') — the file may be DRM-protected or corrupt' };
  }
  const index = readObjectIndex(bytes, header);
  if (!index.size) return { ok: false, reason: 'no object index found (file may be truncated or encrypted)' };

  // Parse every object record.
  const objects = new Map();
  for (const [id, entry] of index) {
    try { const o = parseObject(bytes, entry); if (o) objects.set(id, o); } catch { /* skip bad record */ }
  }
  if (!objects.size) return { ok: false, reason: 'could not parse any LRF objects' };

  const meta = metaFromXml(await readInfoXml(bytes, header));

  // Spine: ordered page ids → render-ready pages with decoded HTML + resolved inline images.
  const spineIds = buildSpine(objects);
  const pages = [];
  const imageCache = new Map();                          // image obj id → { mime, bytes }
  let textChars = 0;
  for (const pid of spineIds) {
    const { texts, images } = pageContent(pid, objects);
    const plots = [];                                     // inline image refs from text 0xD1 tags
    let html = '';
    for (const t of texts) {
      const raw = await decodeTextBlock(t, header.xorKey);
      if (raw != null) html += decodeTextStream(raw, plots);
    }
    // Page-level Image / ImageStream objects become block images (cover, full-page art) — append an
    // <img data-ref> the renderer resolves to a blob: URL, unless the same ref already rendered inline.
    const inline = new Set(plots);
    for (const im of images) {
      if (!inline.has(im.id)) { html += '<img class="lrf-plot lrf-block" data-ref="' + im.id + '" alt="">'; plots.push(im.id); }
    }
    for (const ref of plots) {
      if (!imageCache.has(ref)) { const img = resolveImage(ref, objects, header.xorKey); if (img) imageCache.set(ref, img); }
    }
    textChars += html.replace(/<[^>]+>/g, '').length;
    pages.push({ id: pid, html, plots });
  }

  // Cover: prefer the metadata's cover object; else, if the book has exactly one Image/ImageStream
  // that never rendered in a page (commonly the cover, wrapped in a Button), surface it as the cover.
  let cover = null;
  let coverRef = 0;
  if (meta.cover) { const c = resolveImage(parseInt(meta.cover, 10), objects, header.xorKey); if (c) { cover = c; coverRef = parseInt(meta.cover, 10); } }
  if (!cover) {
    const imgObjs = [...objects.values()].filter((o) => o.type === TYPE.Image || o.type === TYPE.ImageStream);
    if (imgObjs.length) {
      const c = resolveImage(imgObjs[0].id, objects, header.xorKey);
      if (c) { cover = c; coverRef = imgObjs[0].id; }
    }
  }
  // Show the cover as the first page if no page already renders it.
  if (cover && coverRef) {
    const shown = pages.some((p) => p.plots.includes(coverRef));
    if (!shown) {
      imageCache.set(coverRef, cover);
      pages.unshift({ id: -1, html: '<img class="lrf-plot lrf-block lrf-cover" data-ref="' + coverRef + '" alt="cover">', plots: [coverRef] });
    }
  }

  return {
    ok: true,
    version: header.version,
    title: meta.title,
    author: meta.author,
    publisher: meta.publisher,
    language: meta.language,
    width: header.width,
    height: header.height,
    pages,
    imageCache,
    cover,
    textChars,
  };
}

// Decode a TextBlock object's stream: inflate if flagged compressed, descramble if flagged.
async function decodeTextBlock(obj, xorKey) {
  if (!obj || !obj.stream) return null;
  let buf = obj.stream;
  if (obj.streamFlags & 0x200) buf = descramble(buf, xorKey, true);   // text scrambles whole buffer
  if (obj.streamFlags & 0x100) {
    // First u32 = uncompressed size, rest = deflate.
    try { buf = await inflateAny(buf.subarray(4)); } catch { return buf; }
  }
  return buf;
}
