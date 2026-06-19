import { hasExtension, mimeMatches } from '../../core/detect.js';

// Raster images detect by magic bytes; SVG (text) by content/extension.
export function detect(intake) {
  const b = intake.bytes;
  if (b && b.length > 12) {
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 0.99; // PNG
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 0.99;                   // JPEG
    if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 0.99;                   // GIF
    if (b[0] === 0x42 && b[1] === 0x4d) return 0.95;                                     // BMP
    if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 0.99; // WEBP
    if ((b[0] === 0xff && b[1] === 0x0a) || (b[0] === 0 && b[1] === 0 && b[2] === 0 && b[3] === 0x0c && b[4] === 0x4a && b[5] === 0x58 && b[6] === 0x4c && b[7] === 0x20)) return 0.99; // JPEG XL
  }
  if (hasExtension(intake, 'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'avif', 'jxl', 'ico')) return 0.95;
  if (hasExtension(intake, 'svg')) return 0.92;
  if (mimeMatches(intake, 'image/')) return 0.9;
  const t = (intake.textSample || '').trim();
  if (t.startsWith('<svg') || (t.startsWith('<?xml') && t.includes('<svg'))) return 0.85;
  return 0;
}
