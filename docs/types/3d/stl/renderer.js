// STL 3D viewer — parse the mesh, then hand it to the shared canvas mesh viewer. STL is geometry
// data (not code), so it renders safely in the parent pane.
import { parseSTL } from './stllib.js';
import { mountMeshView } from '../../../core/meshview.js';

export async function render(intake, _ctx) {
  let model;
  try { model = parseSTL(intake); }
  catch (e) {
    const host = document.createElement('div');
    host.className = 'stl-doc';
    host.innerHTML = '<div class="json-error"><strong>Could not read STL</strong><br>' + (e.message || e) + '</div>';
    return { parentNode: host };
  }
  const info = model.tris.length.toLocaleString() + ' triangles · ' + model.size.map((s) => s.toFixed(1)).join(' × ');
  return mountMeshView(model, info);
}
