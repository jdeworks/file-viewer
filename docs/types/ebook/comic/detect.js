import { hasExtension } from '../../../core/detect.js';

// Comic book archives: .cbz (zip of images) and .cbr (rar of images). Claim these extensions
// above the generic zip type so a comic opens in the page-turning reader, not as a file listing.
// A bare zip/rar magic is NOT claimed here — only the comic extensions — so normal archives stay
// in the archive type.
export function detect(intake) {
  if (hasExtension(intake, 'cbz', 'cbr', 'cb7', 'cbt')) return 0.96;
  return 0;
}
