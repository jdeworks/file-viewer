const MAGIC = [0x76, 0x2f, 0x31, 0x01];

export function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 8) return {};
  if (!MAGIC.every((v, i) => b[i] === v)) return {};
  const version = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24);
  const fileVersion = version & 0xff;
  const isTiled = !!(version & 0x0200);
  const isMultiPart = !!(version & 0x1000);
  return {
    Format: 'OpenEXR (High Dynamic Range Image)',
    'File version': String(fileVersion),
    'Layout': isTiled ? 'Tiled' : 'Scanline',
    ...(isMultiPart ? { 'Multi-part': 'Yes' } : {}),
    'File size': `${b.length} bytes`,
  };
}
