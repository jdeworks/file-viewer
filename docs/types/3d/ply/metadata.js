import { parsePLY } from './plylib.js';

export function extract(intake) {
  try {
    const m = parsePLY(intake);
    return [
      { label: 'Format', value: m.format === 'ascii' ? 'ASCII PLY' : 'Binary PLY' },
      { label: 'Triangles', value: m.tris.length.toLocaleString() },
      { label: 'Dimensions', value: m.size.map((s) => s.toFixed(2)).join(' × ') },
    ];
  } catch {
    return [{ label: 'PLY', value: 'unreadable' }];
  }
}
