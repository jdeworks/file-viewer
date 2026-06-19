// Blender .blend files start with:
//   bytes 0-6:  "BLENDER" (ASCII)
//   byte 7:     pointer size: '_' = 4 bytes, '-' = 8 bytes
//   byte 8:     endianness: 'v' = little-endian, 'V' = big-endian
//   bytes 9-11: version number (e.g. "400" for Blender 4.0.0)
const BLENDER_MAGIC = [0x42, 0x4c, 0x45, 0x4e, 0x44, 0x45, 0x52]; // "BLENDER"

export function detect(intake) {
  const { filename, bytes: b } = intake;
  const ext = filename ? filename.split('.').pop().toLowerCase() : '';
  const isBlendExt = ext === 'blend' || ext === 'blend1' || ext === 'blend2';

  if (!b || b.length < 12) return isBlendExt ? 0.6 : 0;

  const hasMagic = BLENDER_MAGIC.every((v, i) => b[i] === v);
  const validPtr = b[7] === 0x5f || b[7] === 0x2d; // '_' or '-'
  const validEnd = b[8] === 0x76 || b[8] === 0x56; // 'v' or 'V'
  const structural = hasMagic && validPtr && validEnd;

  if (isBlendExt) return structural ? 0.99 : hasMagic ? 0.80 : 0.65;
  return structural ? 0.98 : 0;
}
