import { parseOBJ } from './objlib.js';

export function extract(intake) {
  try {
    const m = parseOBJ(intake.text || '');
    return [
      { label: 'Vertices', value: m.vertexCount.toLocaleString() },
      { label: 'Texture coords', value: m.texcoordCount.toLocaleString() },
      { label: 'Normals', value: m.normalCount.toLocaleString() },
      { label: 'Faces', value: m.faceCount.toLocaleString() },
      { label: 'Triangles', value: m.tris.length.toLocaleString() },
      { label: 'Objects/groups', value: `${m.objectCount.toLocaleString()} / ${m.groupCount.toLocaleString()}` },
      { label: 'Materials', value: m.materialCount.toLocaleString() },
      { label: 'Dimensions', value: m.size.map((s) => s.toFixed(2)).join(' × ') },
    ];
  } catch {
    return [{ label: 'OBJ', value: 'unreadable' }];
  }
}
