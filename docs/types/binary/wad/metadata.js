function r32le(b, off) { return ((b[off] | (b[off+1]<<8) | (b[off+2]<<16)) >>> 0) + (b[off+3] * 0x1000000); }

export function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 12) return {};
  const magic = String.fromCharCode(b[0], b[1], b[2], b[3]);
  if (magic !== 'IWAD' && magic !== 'PWAD') return {};
  const fields = {};
  fields['Format'] = magic === 'IWAD' ? 'Internal WAD (IWAD)' : 'Patch WAD (PWAD)';
  fields['Lump Count'] = String(r32le(b, 4));
  return fields;
}
