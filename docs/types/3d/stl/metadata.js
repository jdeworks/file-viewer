import { parseSTL } from './stllib.js';

export function extract(intake) {
  try {
    const m = parseSTL(intake);
    const name = solidName(intake);
    return [
      { label: 'Format', value: m.format === 'ascii' ? 'ASCII STL' : 'Binary STL' },
      ...(name ? [{ label: 'Solid name', value: name }] : []),
      { label: 'Vertices', value: m.vertexCount.toLocaleString() },
      { label: 'Triangles', value: m.tris.length.toLocaleString() },
      { label: 'Dimensions', value: m.size.map((s) => s.toFixed(2)).join(' × ') },
    ];
  } catch {
    return [{ label: 'STL', value: 'unreadable' }];
  }
}

function solidName(intake) {
  const text = intake.text || '';
  const m = text.match(/^\s*solid\s+(.+)$/m);
  if (m) return m[1].trim().slice(0, 80);
  return '';
}
