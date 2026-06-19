export function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 5) return {};
  const docLen = b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24);
  if (docLen < 5 || docLen > b.length) return {};
  let fieldCount = 0;
  let off = 4;
  while (off < docLen - 1 && fieldCount < 100) {
    const typeCode = b[off++];
    while (off < b.length && b[off++] !== 0) {} // skip cstring key
    fieldCount++;
    // skip value by type — rough size
    const sizes = { 0x01: 8, 0x07: 12, 0x08: 1, 0x09: 8, 0x0a: 0, 0x10: 4, 0x11: 8, 0x12: 8, 0x13: 16 };
    if (typeCode in sizes) { off += sizes[typeCode]; }
    else if (typeCode === 0x02 || typeCode === 0x0d || typeCode === 0x0e) {
      const len = b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24);
      off += 4 + len;
    } else if (typeCode === 0x03 || typeCode === 0x04) {
      const subdocLen = b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24);
      off += subdocLen;
    } else if (typeCode === 0x05) {
      const blen = b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24);
      off += 5 + blen;
    } else { break; }
  }
  return {
    Format: 'BSON (Binary JSON)',
    'Document size': `${docLen} bytes`,
    'Top-level fields': String(fieldCount),
  };
}
