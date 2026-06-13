// PLY exports: convert the mesh to STL / OBJ. See core/mesh-export.
import { meshExports } from '../../core/mesh-export.js';
import { parsePLY } from './plylib.js';

export function getExports(intake) {
  return meshExports(intake, () => parsePLY(intake), 'ply');
}
