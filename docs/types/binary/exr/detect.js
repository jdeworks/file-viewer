import { hasExtension, mimeMatches } from '../../../core/detect.js';

// OpenEXR magic: 0x76 0x2F 0x31 0x01
const MAGIC = [0x76, 0x2f, 0x31, 0x01];

export function detect(intake) {
  const { bytes: b } = intake;
  const isExrExt = hasExtension(intake, 'exr');
  const isExrMime = mimeMatches(intake, 'x-exr', 'openexr');

  if (!b || b.length < 4) return isExrExt || isExrMime ? 0.95 : 0;
  const hasMagic = MAGIC.every((v, i) => b[i] === v);

  if (hasMagic) return isExrExt ? 0.99 : isExrMime ? 0.98 : 0.97;
  return isExrExt || isExrMime ? 0.55 : 0;
}
