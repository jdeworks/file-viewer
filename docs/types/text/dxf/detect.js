import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  if (intake.isBinary) return 0;
  if (hasExtension(intake, 'dxf')) return 0.95;
  const head = (intake.textSample || '').trimStart();
  // DXF files start with group code 0 on first line, value on second line
  // e.g. "  0\r\nSECTION\r\n" or "0\nSECTION"
  if (/^\s*0\s*[\r\n]+\s*SECTION/m.test(head.slice(0, 200))) return 0.92;
  return 0;
}
