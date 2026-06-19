export function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 12) return {};
  const magic = new TextDecoder('ascii', { fatal: false }).decode(b.slice(0, 7));
  if (magic !== 'BLENDER') return {};
  const ptrSize = b[7] === 0x2d ? 8 : 4;
  const isLE = b[8] === 0x76;
  const versionStr = new TextDecoder('ascii', { fatal: false }).decode(b.slice(9, 12));
  const vNum = parseInt(versionStr, 10);
  let versionDisplay = versionStr;
  if (!isNaN(vNum)) {
    versionDisplay = `${Math.floor(vNum / 100)}.${Math.floor((vNum % 100) / 10)}.${vNum % 10}`;
  }
  return {
    Format: 'Blender 3D Scene',
    'Blender version': versionDisplay,
    'Pointer size': `${ptrSize} bytes`,
    'Endianness': isLE ? 'Little-endian' : 'Big-endian',
  };
}
