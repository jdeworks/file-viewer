// Wavefront OBJ 3D viewer — parse the mesh, then hand it to the shared canvas mesh viewer.
import { parseOBJ } from './objlib.js';
import { mountMeshView } from '../../../core/meshview.js';

export async function render(intake, _ctx) {
  const model = parseOBJ(intake.text || '');
  model._filename = intake.filename;
  const info = model.tris.length.toLocaleString() + ' triangles · ' + model.vertexCount.toLocaleString() + ' vertices · '
    + model.size.map((s) => s.toFixed(1)).join(' × ');
  return mountMeshView(model, info);
}
