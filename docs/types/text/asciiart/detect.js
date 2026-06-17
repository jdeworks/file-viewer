import { hasExtension } from '../../../core/detect.js';

const BLOCK_CHARS = /[█▓▒░═╔╗╚╝╠╣╦╩╬║─│┌┐└┘├┤┬┴┼]/g;

export function detect(intake) {
  if (intake.isBinary) {
    // SAUCE00 can appear in binary files — check magic bytes
    const bytes = intake.bytes;
    if (bytes && bytes.length > 128) {
      // SAUCE record is the last 128 bytes, starting with "SAUCE00"
      const tail = bytes.slice(bytes.length - 128);
      if (tail[0] === 0x53 && tail[1] === 0x41 && tail[2] === 0x55 && tail[3] === 0x43 && tail[4] === 0x45) {
        return 0.95;
      }
    }
    return 0;
  }

  const text = intake.textSample || intake.text || '';
  if (!text) return 0;

  // Extension-based detection
  if (hasExtension(intake, 'ans', 'asc')) return 0.90;
  if (hasExtension(intake, 'nfo', 'diz')) return 0.80;

  // SAUCE00 in text file (appears at end of file as ASCII)
  if (text.includes('SAUCE00')) return 0.95;

  // Content-based: count signals
  const lines = text.split(/\r?\n/);
  const totalLines = lines.filter((l) => l.length > 0).length;
  if (totalLines < 3) return 0;

  let signals = 0;

  // Signal 1: >30% of non-empty lines are wider than 80 chars
  const wideLines = lines.filter((l) => l.length > 80).length;
  if (totalLines > 0 && wideLines / totalLines > 0.30) signals++;

  // Signal 2: ANSI escape sequences present
  const ansiCount = (text.match(/\x1b\[/g) || []).length;
  if (ansiCount >= 3) signals++;

  // Signal 3: density of block/box-drawing characters
  const blockCount = (text.match(BLOCK_CHARS) || []).length;
  if (blockCount >= 5) signals++;

  // Signal 4: repeated use of pipe/backslash art (ASCII art without special chars)
  const lineArt = lines.filter((l) => /[|\\\/]{3,}/.test(l)).length;
  if (lineArt >= 3) signals++;

  if (signals < 2) return 0;

  // Scale: 2 signals → 0.60, 3 → 0.70, 4 → 0.75
  const score = Math.min(0.75, 0.55 + signals * 0.07);
  return score;
}
