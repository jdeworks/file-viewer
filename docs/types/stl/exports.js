// STL exports: convert the mesh to OBJ / PLY (the other text mesh formats). See core/mesh-export.
import { meshExports } from '../../core/mesh-export.js';
import { parseSTL } from './stllib.js';

export function getExports(intake) {
  return meshExports(intake, () => parseSTL(intake), 'stl');
}
