// glTF/GLB 3D viewer — parse the mesh, then hand it to the shared canvas mesh viewer.
import { parseGLTF } from './gltflib.js';
import { mountMeshView } from '../../../core/meshview.js';

export async function render(intake, _ctx) {
  let model;
  try { model = parseGLTF(intake); }
  catch (e) {
    const host = document.createElement('div');
    host.className = 'stl-doc';
    host.innerHTML = '<div class="json-error"><strong>Could not read glTF/GLB</strong><br>' + (e.message || e) + '</div>';
    return { parentNode: host };
  }
  model._filename = intake.filename;
  const info = model.tris.length.toLocaleString() + ' triangles · ' + model.size.map((s) => s.toFixed(1)).join(' × ');
  return mountMeshView(model, info);
}
