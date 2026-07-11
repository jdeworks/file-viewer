import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  const b = intake.bytes;
  const hasExt = hasExtension(intake, 'torrent');
  if (!b || b.length < 2) return hasExt ? 0.6 : 0;
  const isBencodeDict = b[0] === 0x64; // 'd' — bencode dict
  if (hasExt) return isBencodeDict ? 0.95 : 0.85;
  // Extensionless content sniffing stays conservative and requires the general binary heuristic;
  // bencoded text alone is too easy to confuse with an ordinary file beginning with "d".
  if (intake.isBinary && isBencodeDict) return 0.35;
  return 0;
}
