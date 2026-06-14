// OBJ exports: convert the mesh to STL / PLY. See core/mesh-export.
import { meshExports } from '../../../core/mesh-export.js';
import { parseOBJ } from './objlib.js';

export function getExports(intake) {
  return meshExports(intake, () => parseOBJ(intake.text || ''), 'obj');
}
