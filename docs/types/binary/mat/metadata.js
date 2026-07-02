const MAT_TYPES = {
  14: 'miMATRIX',
};

const MX_CLASSES = {
  1: 'cell', 2: 'struct', 3: 'object', 4: 'char',
  5: 'sparse', 6: 'double', 7: 'single',
  8: 'int8', 9: 'uint8', 10: 'int16', 11: 'uint16',
  12: 'int32', 13: 'uint32', 14: 'int64', 15: 'uint64',
};

function r32le(b, off) {
  return (b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24)) >>> 0;
}

function r32be(b, off) {
  return ((b[off] << 24) | (b[off + 1] << 16) | (b[off + 2] << 8) | b[off + 3]) >>> 0;
}

function parseVariables(b, isLE) {
  const r32 = isLE ? r32le : r32be;
  const vars = [];
  let off = 128;
  while (off + 8 <= b.length && vars.length < 30) {
    const typeTag = r32(b, off);
    const byteCount = r32(b, off + 4);
    const isSmall = (typeTag >> 16) !== 0;
    const realType = isSmall ? (typeTag & 0xffff) : typeTag;
    if (MAT_TYPES[realType] === 'miMATRIX' && !isSmall) {
      try {
        let subOff = off + 8;
        const flagsSize = r32(b, subOff + 4);
        const className = MX_CLASSES[b[subOff + 8] & 0xff] || 'unknown';
        subOff += 8 + Math.ceil(flagsSize / 8) * 8;
        const dimsSize = r32(b, subOff + 4);
        const dims = [];
        for (let i = 0; i < dimsSize / 4 && i < 4; i++) dims.push(r32(b, subOff + 8 + i * 4));
        subOff += 8 + Math.ceil(dimsSize / 8) * 8;
        const nameType = r32(b, subOff);
        const nameSize = (nameType >> 16) !== 0 ? (nameType >> 16) : r32(b, subOff + 4);
        const nameOff = (nameType >> 16) !== 0 ? subOff + 4 : subOff + 8;
        const name = new TextDecoder('ascii', { fatal: false }).decode(b.slice(nameOff, nameOff + nameSize));
        vars.push({ name, className, dims: dims.join('x') });
      } catch {
        // Keep parsing later top-level elements where possible.
      }
    }
    off += isSmall ? 8 : 8 + Math.ceil(byteCount / 8) * 8;
  }
  return vars;
}

export function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 128) return {};
  const headerText = new TextDecoder('ascii', { fatal: false }).decode(b.slice(0, 116)).replace(/\x00/g, '').trim();
  if (!headerText.startsWith('MATLAB 5.0 MAT-file')) return {};
  const isLE = b[126] === 0x49;
  const variables = parseVariables(b, isLE);
  const classSummary = [...new Set(variables.map((v) => v.className).filter(Boolean))].join(', ');
  const out = {
    Format: 'MATLAB MAT-file v5',
    Endianness: isLE ? 'Little-endian' : 'Big-endian',
    Header: headerText.length > 60 ? headerText.slice(0, 60) + '…' : headerText,
    Variables: String(variables.length),
    'Variable names': variables.map((v) => v.name).filter(Boolean).join(', ') || undefined,
    'Variable classes': classSummary || undefined,
    Dimensions: variables.map((v) => `${v.name}: ${v.dims}`).filter(Boolean).join('; ') || undefined,
    'File size': `${b.length.toLocaleString()} bytes`,
  };
  return Object.fromEntries(Object.entries(out).filter(([, value]) => value !== undefined && value !== ''));
}
