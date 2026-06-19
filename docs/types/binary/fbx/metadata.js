const FBX_VERSION_NAMES = {
  6000: '6.0', 7000: '7.0', 7100: '7.1', 7200: '7.2',
  7300: '7.3', 7400: '7.4', 7500: '7.5', 7700: '7.7',
};

export function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 27) return {};
  const magic = new TextDecoder('ascii', { fatal: false }).decode(b.slice(0, 20));
  if (magic !== 'Kaydara FBX Binary  ') return {};
  const version = (b[23] | (b[24] << 8) | (b[25] << 16) | (b[26] << 24)) >>> 0;
  const vStr = FBX_VERSION_NAMES[version] || String(version);
  return {
    Format: 'FBX (Filmbox 3D)',
    'FBX version': `${vStr} (${version})`,
    'Encoding': 'Binary',
    'File size': `${b.length} bytes`,
  };
}
