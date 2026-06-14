import { parseGLTF } from './gltflib.js';

export function extract(intake) {
  try {
    const m = parseGLTF(intake);
    const isGlb = intake.bytes && intake.bytes[0] === 0x67 && intake.bytes[1] === 0x6c;
    return [
      { label: 'Format', value: isGlb ? 'GLB (binary glTF)' : 'glTF (JSON)' },
      { label: 'Triangles', value: m.tris.length.toLocaleString() },
      { label: 'Dimensions', value: m.size.map((s) => s.toFixed(2)).join(' × ') },
    ];
  } catch {
    return [{ label: 'glTF', value: 'unreadable' }];
  }
}
