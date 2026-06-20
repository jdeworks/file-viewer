import { hasExtension, mimeMatches } from '../../../core/detect.js';

// SVG: plain-text XML with <svg root, or .svg / .svgz extension.
// Must score above the generic image type's 0.92 for .svg extension.
export function detect(intake) {
  // SVGZ (gzip-compressed SVG): gzip magic bytes 1f 8b
  if (intake.bytes && intake.bytes.length >= 2 &&
      intake.bytes[0] === 0x1f && intake.bytes[1] === 0x8b &&
      hasExtension(intake, 'svgz')) return 0.97;

  // Strong: content starts with <svg or <?xml ... <svg
  const t = (intake.textSample || '').trimStart();
  if (t.startsWith('<svg') || (t.startsWith('<?xml') && t.includes('<svg'))) return 0.96;

  // Extension + MIME
  if (hasExtension(intake, 'svg', 'svgz')) return 0.95;
  if (mimeMatches(intake, 'image/svg')) return 0.95;

  return 0;
}
