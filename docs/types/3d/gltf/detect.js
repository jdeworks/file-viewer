import { hasExtension } from '../../../core/detect.js';

// glTF 2.0 models: .glb (binary, magic 'glTF') and .gltf (JSON).
export function detect(intake) {
  if (hasExtension(intake, 'glb', 'gltf')) return 0.95;
  const b = intake.bytes;
  if (b && b.length >= 4 && b[0] === 0x67 && b[1] === 0x6c && b[2] === 0x54 && b[3] === 0x46) return 0.9;   // 'glTF'
  if (!intake.isBinary && /"asset"\s*:\s*{[^}]*"version"\s*:\s*"2\.0"/.test(intake.textSample || '')) return 0.6;
  return 0;
}
