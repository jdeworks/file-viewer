import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  if (!intake.bytes || intake.bytes.length < 4) {
    // No/short bytes to check magic against (e.g. a zero-byte upload, or a catalog
    // pass that only has filename metadata) — fall back to the extension hint
    // instead of unconditionally returning 0, same as the sibling hdf5 detector.
    return hasExtension(intake, 'nc', 'nc4', 'netcdf') ? 0.6 : 0;
  }
  const b = intake.bytes;
  // NetCDF-3 classic: "CDF\x01" or "CDF\x02"
  if (b[0] === 0x43 && b[1] === 0x44 && b[2] === 0x46 && (b[3] === 0x01 || b[3] === 0x02)) return 0.98;
  // NetCDF-4 (HDF5-based): HDF5 signature "\x89HDF\r\n\x1a\n"
  // Score must beat the generic HDF5 detector's 0.95 default (an HDF5-signature file
  // without an h5/hdf5/hdf/he5 extension) so a .nc/.nc4/.netcdf file routes here instead
  // of being misclassified as plain HDF5.
  if (b[0] === 0x89 && b[1] === 0x48 && b[2] === 0x44 && b[3] === 0x46) {
    if (hasExtension(intake, 'nc', 'nc4', 'netcdf')) return 0.96;
  }
  if (hasExtension(intake, 'nc', 'nc4', 'netcdf')) return 0.6;
  return 0;
}
