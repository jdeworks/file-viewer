import { hasExtension, mimeMatches } from '../../../core/detect.js';

// Binary FBX magic: "Kaydara FBX Binary  \x00\x1a\x00" (23 bytes)
// ASCII FBX starts with "; FBX" or "FBX\r\n" (but is handled via code/raw for now)
const BINARY_MAGIC = [
  0x4b, 0x61, 0x79, 0x64, 0x61, 0x72, 0x61, 0x20, // "Kaydara "
  0x46, 0x42, 0x58, 0x20, 0x42, 0x69, 0x6e, 0x61, // "FBX Bina"
  0x72, 0x79, 0x20, 0x20, 0x00, 0x1a, 0x00,         // "ry  \0\x1a\0"
];

export function detect(intake) {
  const { bytes: b, textSample } = intake;
  const isFbxExt = hasExtension(intake, 'fbx');
  const isFbxMime = mimeMatches(intake, 'fbx', 'filmbox');

  if (!b || b.length < 23) {
    // ASCII FBX fallback
    if ((isFbxExt || isFbxMime) && textSample && /^;\s*FBX/m.test(textSample)) return 0.92;
    return isFbxExt || isFbxMime ? 0.95 : 0;
  }

  const hasMagic = BINARY_MAGIC.every((v, i) => b[i] === v);
  if (isFbxExt || isFbxMime) return hasMagic ? 0.99 : 0.65;
  return hasMagic ? 0.97 : 0;
}
