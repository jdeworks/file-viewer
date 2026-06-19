function r32le(b, off) {
  return ((b[off] | (b[off + 1] << 8) | (b[off + 2] << 16)) >>> 0) + b[off + 3] * 0x1000000;
}

function ascii4(b, off) {
  return String.fromCharCode(b[off], b[off + 1], b[off + 2], b[off + 3]);
}

const Q1 = { 29: 'Quake', 30: 'Half-Life' };
const IBSP = { 38: 'Quake II', 46: 'Quake III Arena', 47: 'Quake III: Team Arena', 59: 'Doom 3' };
const VBSP = {
  18: 'Half-Life 2', 19: 'Half-Life 2', 20: 'Half-Life 2 / CS:S',
  21: 'Orange Box (TF2/Portal)', 22: 'Source 2013',
};

export function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 12) return {};
  const magic = ascii4(b, 0);
  const result = {};

  if (magic === 'IBSP' || magic === 'VBSP') {
    const version = r32le(b, 4);
    result['Format'] = `${magic} v${version}`;
    const labels = magic === 'IBSP' ? IBSP : VBSP;
    if (labels[version]) result['Game'] = labels[version];
    // Parse entity lump for map name
    const entityOff = r32le(b, 8);
    const entityLen = r32le(b, 12);
    if (entityOff && entityLen && entityOff + entityLen <= b.length) {
      const text = new TextDecoder('ascii', { fatal: false }).decode(b.slice(entityOff, entityOff + Math.min(entityLen, 2048)));
      const m = text.match(/"message"\s+"([^"]+)"/);
      if (m) result['Map Name'] = m[1];
    }
  } else {
    const version = r32le(b, 0);
    if (version === 29 || version === 30) {
      result['Format'] = `BSP v${version}`;
      if (Q1[version]) result['Game'] = Q1[version];
      const entityOff = r32le(b, 4);
      const entityLen = r32le(b, 8);
      if (entityOff && entityLen && entityOff + entityLen <= b.length) {
        const text = new TextDecoder('ascii', { fatal: false }).decode(b.slice(entityOff, entityOff + Math.min(entityLen, 2048)));
        const m = text.match(/"message"\s+"([^"]+)"/);
        if (m) result['Map Name'] = m[1];
      }
    }
  }

  return result;
}
