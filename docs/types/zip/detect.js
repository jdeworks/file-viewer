import { hasExtension } from '../../core/detect.js';

// Zip-family archives. Office formats (.docx/.xlsx/.pptx) are also zips but win on their
// own extensions, so only claim generic archive extensions strongly; PK magic is a weak
// fallback so a mis-named archive still lands here rather than as raw bytes.
export function detect(intake) {
  if (hasExtension(intake, 'zip', 'jar', 'epub', 'apk', 'war', 'cbz', 'whl', 'nupkg')) return 0.9;
  const b = intake.bytes;
  if (b && b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07)) return 0.45;
  return 0;
}
