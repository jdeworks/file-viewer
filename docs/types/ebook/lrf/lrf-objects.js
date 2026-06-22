// LRF object-record parser. Each record starts with tag 0xF500 (ObjectStart: id + type byte),
// then a stream of 0xF5xx tags, ending 0xF501 (ObjectEnd). The low byte indexes a size/type
// table (calibre tags.py); we walk the stream consuming each tag's operand by that size.
//
// Object type byte (calibre object_map): 01 PageTree, 02 Page, 06 Block, 0A Text(TextBlock),
// 0C Image, 11 ImageStream, 19 Font, 1C BookAttr, 1E TOCObject.

import { descramble } from './lrf-header.js';

// Tag operand sizes by low byte (from calibre tags.py). Values: integer byte count, or a
// string: 'string' (length-prefixed UTF-16LE), 'type_one' (u16 count + count×u32), 'tag_78'
// (special), 'unknown' (treated as 0). Anything not listed defaults to 0.
const TAG_SIZE = {
  0x00: 6, 0x01: 0, 0x02: 4, 0x03: 4, 0x04: 4, 0x05: 0, 0x06: 0, 0x07: 4,
  0x0b: 'type_one', 0x0d: 2, 0x0e: 2, 0x11: 2, 0x12: 2, 0x16: 'string', 0x17: 4, 0x1a: 2,
  0x22: 2, 0x4a: 8, 0x4b: 4, 0x4c: 4,    // Image: ImageRect(8), ImageSize(4), RefStream→ImageStream(4)
  0x53: 4, 0x54: 2, 0x55: 'string', 0x56: 2, 0x57: 2, 0x58: 2, 0x59: 'string',
  0x5a: 'string', 0x5b: 4, 0x5c: 'type_one', 0x5d: 'string', 0x5e: 2, 0x61: 2, 0x6c: 8,
  0x6d: 2, 0x73: 10, 0x75: 2, 0x76: 2, 0x77: 2, 0x78: 'tag_78', 0x79: 2, 0x7a: 2, 0x7b: 4,
  0x7c: 4,
  0xa1: 4, 0xa5: 0, 0xa7: 4, 0xc3: 2, 0xc5: 2, 0xc6: 2, 0xc8: 2, 0xca: 2, 0xcb: 0,
  0xcc: 2,                                          // character-attribute (e.g. kerning/weight) — 2-byte operand
  0xd1: 12, 0xd4: 2, 0xd7: 14, 0xd8: 4, 0xd9: 8, 0xda: 2, 0xdb: 2, 0xdc: 2,
  0xf1: 2, 0xf2: 4, 0xf3: 4, 0xf4: 2,
};

const tagSize = (low) => (Object.prototype.hasOwnProperty.call(TAG_SIZE, low) ? TAG_SIZE[low] : 0);

// Read one tag starting at p (which points at the low byte, with bytes[p+1] === 0xF5).
// Returns { low, value, contained, next } where value is the numeric operand (when fixed-size),
// contained is an array of u32 ids (type_one), and next is the offset after the operand.
function readTag(bytes, dv, p) {
  const low = bytes[p];
  let q = p + 2;
  const size = tagSize(low);
  const tag = { low, value: 0, contained: null, str: null, next: q };
  if (size === 'string') {
    const len = dv.getUint16(q, true); q += 2;
    tag.str = utf16le(bytes.subarray(q, q + len));
    q += len;
  } else if (size === 'type_one') {
    const count = dv.getUint16(q, true); q += 2;
    const ids = [];
    for (let i = 0; i < count && q + 4 <= bytes.length; i++) { ids.push(dv.getUint32(q, true)); q += 4; }
    tag.contained = ids;
  } else if (size === 'tag_78') {
    // tag_78: u16 then a nested type_one-style list. Skip it safely.
    q += 2;
    const count = dv.getUint16(q, true); q += 2 + count * 2;
  } else {
    const n = typeof size === 'number' ? size : 0;
    if (n === 2) tag.value = dv.getUint16(q, true);
    else if (n === 4) tag.value = dv.getUint32(q, true);
    else if (n === 6) tag.value = dv.getUint32(q, true);   // ObjectStart: id(u32)+type(u8)+pad
    q += n;
  }
  tag.next = q;
  return tag;
}

// UTF-16LE decode of a byte range.
const _td16 = new TextDecoder('utf-16le', { fatal: false });
export function utf16le(bytes) { return _td16.decode(bytes); }

// Parse a single object record into a light descriptor. We DON'T fully model styles — just the
// structure the reader needs: spine (PageTree), page→content, block→content, text streams,
// image refs, image streams, and the book metadata XML.
export function parseObject(bytes, entry) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let p = entry.offset;
  const end = entry.offset + entry.size;
  if (bytes[p + 1] !== 0xf5 || bytes[p] !== 0x00) return null;       // must start with ObjectStart
  const id = dv.getUint32(p + 2, true);
  const type = bytes[p + 6];
  p += 8;                                                            // ObjectStart = 2 (tag) + 6 (operand)

  const obj = { id, type, contained: null, refs: [], streamFlags: 0, streamStart: -1, streamSize: 0 };
  // Raw-data stream objects carry binary bytes after StreamStart; structural ones (Page/Block/
  // Image) carry MORE tags (Link refs to their content). We decide by type: Text/ImageStream/
  // Font/Sound are raw; everything else parses its stream region as tags.
  const isRawStream = (t) => t === TYPE.Text || t === TYPE.ImageStream || t === TYPE.Font || t === 0x17 || t === 0x16;

  while (p + 2 <= end) {
    if (bytes[p + 1] !== 0xf5) { p++; continue; }                   // resync on a stray byte
    const low = bytes[p];
    if (low === 0x01) break;                                        // ObjectEnd
    const tag = readTag(bytes, dv, p);
    if ((low === 0x0b || low === 0x5c) && tag.contained) obj.contained = tag.contained;   // contained-objects list (PageTree page list)
    else if (low === 0x54) obj.streamFlags = tag.value;                          // StreamFlags
    else if (low === 0x04) obj.streamSize = tag.value;                           // StreamSize
    else if (low === 0x05) {                                                     // StreamStart
      obj.streamStart = tag.next;
      if (isRawStream(type)) break;                                             // raw data follows → stop tag-walking
      // structural stream: keep walking tags (the Link refs below live inside it)
    } else if (low === 0x06) { /* StreamEnd */ }
    else if ((low === 0x03 || low === 0x4c) && tag.value) obj.refs.push(tag.value);  // Link / RefStream → content or ImageStream
    p = tag.next;
  }

  // A raw-data object (Text / ImageStream / Font) carries its bytes after StreamStart.
  if (obj.streamStart >= 0 && isRawStream(type)) {
    const sz = obj.streamSize || (end - obj.streamStart);
    obj.stream = bytes.subarray(obj.streamStart, Math.min(end, obj.streamStart + sz));
  }
  return obj;
}

// Get a stream object's decoded raw bytes (descramble if flagged; inflate handled by caller).
export function streamBytes(obj, xorKey, wholeBuffer) {
  if (!obj || !obj.stream) return null;
  let buf = obj.stream;
  if (obj.streamFlags & 0x200) buf = descramble(buf, xorKey, wholeBuffer);
  return buf;
}

export const TYPE = {
  PageTree: 0x01, Page: 0x02, Block: 0x06, Text: 0x0a, Image: 0x0c,
  ImageStream: 0x11, Font: 0x19, BookAttr: 0x1c, TOCObject: 0x1e,
};
