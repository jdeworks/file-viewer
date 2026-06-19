function readU16(b, off) { return b[off] | (b[off + 1] << 8); }
function readU32(b, off) { return (b[off] | (b[off+1]<<8) | (b[off+2]<<16) | (b[off+3]<<24)) >>> 0; }

export function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 32) return {};
  const numStreams = readU32(b, 8);
  const dirRva    = readU32(b, 12);
  const timestamp = readU32(b, 20);

  const fields = {};
  if (timestamp) fields['Created'] = new Date(timestamp * 1000).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  fields['Streams'] = String(numStreams);

  for (let i = 0; i < numStreams && i < 64; i++) {
    const off = dirRva + i * 12;
    if (off + 12 > b.length) break;
    const type   = readU32(b, off);
    const dataRva = readU32(b, off + 8);
    if (type === 7 && dataRva + 20 <= b.length) {
      const arch  = readU16(b, dataRva);
      const major = readU32(b, dataRva + 8);
      const build = readU32(b, dataRva + 16);
      const ARCHES = { 0: 'x86', 9: 'x64', 12: 'ARM64' };
      if (ARCHES[arch]) fields['Architecture'] = ARCHES[arch];
      if (major === 10 && build >= 22000) fields['OS'] = `Windows 11 (Build ${build})`;
      else if (major === 10) fields['OS'] = `Windows 10 (Build ${build})`;
    }
  }

  return fields;
}
