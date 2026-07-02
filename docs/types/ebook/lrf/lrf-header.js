// Sony LRF (BBeB) header + container primitives. Little-endian throughout. Bytes are DATA,
// never executed. Layout confirmed against calibre's meta.py:
//   0x00 8B  signature "L\0R\0F\0\0\0"
//   0x08 u16 version (~800–1000)        0x0A u16 xor/scramble key
//   0x0C u32 root object id             0x10 u64 #objects
//   0x18 u64 object-index offset        0x24 u8  binding/flags
//   0x2A u16 width                      0x2C u16 height
//   0x44 u32 toc object id              0x4C u16 compressed info size
//   0x4E u16 thumbnail type             0x50 u32 thumbnail size
//   0x54 u32 uncompressed info size     0x58 → compressed info XML (zlib/deflate)
// The info block is a zlib stream (first u32 = uncompressed size, then raw deflate).

export const LRF_SIG = [0x4c, 0x00, 0x52, 0x00, 0x46, 0x00, 0x00, 0x00];

export function isLrf(bytes) {
  if (!bytes || bytes.length < 0x58) return false;
  for (let i = 0; i < LRF_SIG.length; i++) if (bytes[i] !== LRF_SIG[i]) return false;
  return true;
}

// .lrx and Marlin-DRM LRF are genuinely encrypted. The .lrf signature plus a Marlin marker is the
// practical tell; .lrx is handled by extension in detect.js.
export function looksDrm(bytes) {
  if (!bytes) return false;
  // Marlin DRM wrapper magic seen at the very start of protected Sony books.
  const m = String.fromCharCode(bytes[0] || 0, bytes[1] || 0, bytes[2] || 0, bytes[3] || 0);
  return m === 'MURL' || m === 'Marl';
}

export function readHeader(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    version: dv.getUint16(0x08, true),
    xorKey: dv.getUint16(0x0a, true),
    rootObjectId: dv.getUint32(0x0c, true),
    numObjects: Number(dv.getBigUint64(0x10, true)),
    objectIndexOffset: Number(dv.getBigUint64(0x18, true)),
    binding: dv.getUint8(0x24),
    width: dv.getUint16(0x2a, true),
    height: dv.getUint16(0x2c, true),
    tocObjectId: dv.getUint32(0x44, true),
    compressedInfoSize: dv.getUint16(0x4c, true),
    thumbType: dv.getUint16(0x4e, true),
    thumbSize: dv.getUint32(0x50, true),
    uncompressedInfoSize: dv.getUint32(0x54, true),
  };
}

// Object index: numObjects × 16B = { u32 id, u32 offset, u32 size, u32 reserved } → Map id→{offset,size}.
export function readObjectIndex(bytes, header) {
  const index = new Map();
  let p = header.objectIndexOffset;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < header.numObjects; i++) {
    if (p + 16 > bytes.length) break;
    const id = dv.getUint32(p, true);
    const offset = dv.getUint32(p + 4, true);
    const size = dv.getUint32(p + 8, true);
    p += 16;
    if (offset + size <= bytes.length && size > 0) index.set(id, { offset, size });
  }
  return index;
}

// Native inflate of a raw zlib/deflate buffer (no off-origin; DecompressionStream is a platform API).
export async function inflate(buf, format = 'deflate') {
  const ds = new DecompressionStream(format);
  const writer = ds.writable.getWriter();
  // Drive the writer without leaving an unhandled rejection if the stream errors mid-way; the
  // reader loop below surfaces the real error to the caller.
  writer.write(buf).catch(() => {});
  writer.close().catch(() => {});
  const parts = [];
  const reader = ds.readable.getReader();
  let trailingError = null;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      parts.push(value);
    }
  } catch (e) {
    // Some LRF blocks have junk after the zlib stream ("junk found after end"); keep what decoded.
    trailingError = e;
  }
  let total = 0; for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let off = 0; for (const p of parts) { out.set(p, off); off += p.length; }
  if (!out.length && trailingError) throw trailingError;   // nothing decoded → real failure
  return out;
}

// Try zlib ('deflate') first, fall back to raw deflate ('deflate-raw') for streams without a header.
export async function inflateAny(buf) {
  try { return await inflate(buf, 'deflate'); }
  catch { return await inflate(buf, 'deflate-raw'); }
}

// LRF stream descrambling (NOT DRM). flags & 0x200 → scrambled. key = xorKey & 0xFF; if
// 0 < key <= 0xF0 then key = (len % key) + 0xF, else key = 0 (no scrambling — calibre's
// LRFStream.read_stream treats any masked key above 0xF0, same as a zero key, as "don't touch the
// buffer", not "XOR with the raw byte"). Image/font/sound streams scramble only the first 0x400
// bytes; text streams scramble the whole buffer.
export function descramble(buf, xorKey, wholeBuffer) {
  let key = xorKey & 0xff;
  if (key !== 0 && key <= 0xf0) key = (buf.length % key) + 0x0f;
  else key = 0;
  if (key === 0) return buf;
  const out = new Uint8Array(buf);
  const n = wholeBuffer ? out.length : Math.min(out.length, 0x400);
  for (let i = 0; i < n; i++) out[i] ^= key;
  return out;
}
