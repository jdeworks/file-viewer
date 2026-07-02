import { hasExtension, mimeMatches } from '../../../core/detect.js';

// HDF5 magic: 0x89 'H' 'D' 'F' '\r' '\n' 0x1a '\n' (8 bytes)
const HDF5_MAGIC = [0x89, 0x48, 0x44, 0x46, 0x0d, 0x0a, 0x1a, 0x0a];

export function detect(intake) {
  const b = intake.bytes;
  if (!b || b.length < 8) {
    if (hasExtension(intake, 'h5', 'hdf5', 'hdf', 'he5')) return 0.35;
    if (mimeMatches(intake, 'hdf5', 'x-hdf')) return 0.3;
    return 0;
  }

  const matches = HDF5_MAGIC.every((v, i) => b[i] === v);
  if (matches) {
    if (hasExtension(intake, 'h5', 'hdf5', 'hdf', 'he5')) return 0.98;
    if (mimeMatches(intake, 'hdf5', 'x-hdf')) return 0.97;
    return 0.95;
  }

  if (hasExtension(intake, 'h5', 'hdf5', 'hdf', 'he5')) return 0.35;
  if (mimeMatches(intake, 'hdf5', 'x-hdf')) return 0.3;
  return 0;
}
