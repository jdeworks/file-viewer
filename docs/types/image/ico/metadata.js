export function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 6) return {};
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const typeNum = dv.getUint16(2, true);
  const count = dv.getUint16(4, true);
  const sizes = [], bitDepths = [];
  for (let i = 0; i < count; i++) {
    const base = 6 + i * 16;
    const w = b[base] || 256, h = b[base + 1] || 256;
    const bits = typeNum === 1 ? dv.getUint16(base + 6, true) : 0;
    sizes.push(`${w}×${h}`);
    if (bits) bitDepths.push(bits + 'bpp');
  }
  return {
    type: typeNum === 2 ? 'CUR' : 'ICO',
    imageCount: count,
    sizes: sizes.join(', '),
    bitDepths: bitDepths.length ? bitDepths.join(', ') : undefined,
  };
}
