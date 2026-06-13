import { parseOBJ } from './objlib.js';

export function extract(intake) {
  try {
    const m = parseOBJ(intake.text || '');
    return [
      { label: 'Vertices', value: m.vertexCount.toLocaleString() },
      { label: 'Triangles', value: m.tris.length.toLocaleString() },
      { label: 'Dimensions', value: m.size.map((s) => s.toFixed(2)).join(' × ') },
    ];
  } catch {
    return [{ label: 'OBJ', value: 'unreadable' }];
  }
}
