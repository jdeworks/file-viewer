// LMMS .mmp: plain XML starting with <lmms-project or <?xml
// LMMS .mmpz: gzip-compressed .mmp (magic: 1f 8b)

import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  const { bytes: b, textSample } = intake;
  const isMmp = hasExtension(intake, 'mmp');
  const isMmpz = hasExtension(intake, 'mmpz');
  const isLmmsExt = isMmp || isMmpz;

  if (!b || b.length < 4) return isLmmsExt ? 0.5 : 0;

  // .mmpz: gzip magic
  const isGzip = b[0] === 0x1f && b[1] === 0x8b;
  if (isGzip && isMmpz) return 0.95;
  if (isGzip && isLmmsExt) return 0.95;

  // .mmp: XML with lmms-project root
  if (textSample) {
    const s = textSample.trimStart();
    if (s.includes('<lmms-project')) return isLmmsExt ? 0.99 : 0.92;
    if (s.includes('<?xml') && isLmmsExt) return 0.80;
  }
  return isLmmsExt ? 0.5 : 0;
}
