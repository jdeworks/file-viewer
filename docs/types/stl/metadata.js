import { parseSTL } from './stllib.js';

export function extract(intake) {
  try {
    const m = parseSTL(intake);
    return [
      { label: 'Format', value: (!intake.isBinary && /^\s*solid/i.test(intake.text || '')) ? 'ASCII STL' : 'Binary STL' },
      { label: 'Triangles', value: m.tris.length.toLocaleString() },
      { label: 'Dimensions', value: m.size.map((s) => s.toFixed(2)).join(' × ') },
    ];
  } catch {
    return [{ label: 'STL', value: 'unreadable' }];
  }
}
