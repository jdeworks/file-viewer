// MATLAB MAT-file format versions:
// v5: "MATLAB 5.0 MAT-file" in first 116 bytes (descriptive text field)
// v4: no magic, very old format — extension-only detection
// HDF5-based (v7.3+): uses HDF5 container with attribute "MATLAB_class" — handled by HDF5 type

import { hasExtension, mimeMatches } from '../../../core/detect.js';

export function detect(intake) {
  const { bytes: b } = intake;
  const isMatExt = hasExtension(intake, 'mat');

  if (!b || b.length < 128) {
    if (isMatExt) return 0.6;
    if (mimeMatches(intake, 'matlab', 'x-matlab')) return 0.5;
    return 0;
  }

  // MATLAB v5: first 4 bytes of descriptive text start with "MATL"
  const headerText = new TextDecoder('ascii', { fatal: false }).decode(b.slice(0, 20));
  const isV5 = headerText.startsWith('MATLAB 5.0 MAT-file');

  // Check endian indicator at byte 126-127: 'MI' = big-endian, 'IM' = little-endian
  const endian = (b[126] === 0x4d && b[127] === 0x49) || (b[126] === 0x49 && b[127] === 0x4d);
  const structural = isV5 && endian;

  if (isMatExt) return structural ? 0.99 : isV5 ? 0.85 : 0.65;
  if (mimeMatches(intake, 'matlab', 'x-matlab')) return structural ? 0.96 : 0.5;
  return structural ? 0.97 : 0;
}
