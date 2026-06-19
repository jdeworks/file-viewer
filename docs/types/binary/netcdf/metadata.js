function readU32BE(b, off) {
  return ((b[off] << 24) | (b[off+1] << 16) | (b[off+2] << 8) | b[off+3]) >>> 0;
}
function pad4(n) { return n + (4 - n % 4) % 4; }

export function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 8) return {};
  if (!(b[0] === 0x43 && b[1] === 0x44 && b[2] === 0x46)) return {};

  const fields = {};
  fields['Format'] = b[3] === 1 ? 'NetCDF-3 Classic' : 'NetCDF-3 64-bit';

  // Quick scan for global title attribute
  let pos = 8;
  try {
    const dimTag = readU32BE(b, pos); pos += 4;
    if (dimTag !== 0) {
      const ndims = readU32BE(b, pos); pos += 4;
      fields['Dimensions'] = String(ndims);
      for (let i = 0; i < ndims && pos < b.length - 8; i++) {
        const len = readU32BE(b, pos); pos += 4 + pad4(len) + 4;
      }
    } else { pos += 4; }
    // att_list
    const attTag = readU32BE(b, pos); pos += 4;
    if (attTag === 0x0C) {
      const natts = readU32BE(b, pos); pos += 4;
      for (let i = 0; i < natts && pos < b.length - 12; i++) {
        const len = readU32BE(b, pos); pos += 4;
        const name = new TextDecoder().decode(b.slice(pos, pos + len)).trim();
        pos += pad4(len);
        const ncType = readU32BE(b, pos); pos += 4;
        const count  = readU32BE(b, pos); pos += 4;
        const typeSize = {1:1,2:1,3:2,4:4,5:4,6:8}[ncType] || 1;
        if (ncType === 2 && count < 200) {
          const val = new TextDecoder().decode(b.slice(pos, pos + count)).replace(/\0/g,'').trim();
          if (name.toLowerCase() === 'title' && val) fields['Title'] = val;
          if (name.toLowerCase() === 'institution' && val) fields['Institution'] = val;
        }
        pos += pad4(count * typeSize);
      }
    }
  } catch {}

  return fields;
}
