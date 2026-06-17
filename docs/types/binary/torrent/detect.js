import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  if (!intake.isBinary) return 0;
  const b = intake.bytes;
  if (!b || b.length < 2) return 0;
  const hasExt = hasExtension(intake, 'torrent');
  const isBencodeDict = b[0] === 0x64; // 'd' — bencode dict
  if (hasExt) return isBencodeDict ? 0.95 : 0.85;
  if (isBencodeDict) return 0.35;
  return 0;
}
