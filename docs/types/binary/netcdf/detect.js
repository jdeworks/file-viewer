import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  if (!intake.bytes || intake.bytes.length < 4) return 0;
  const b = intake.bytes;
  // NetCDF-3 classic: "CDF\x01" or "CDF\x02"
  if (b[0] === 0x43 && b[1] === 0x44 && b[2] === 0x46 && (b[3] === 0x01 || b[3] === 0x02)) return 0.98;
  // NetCDF-4 (HDF5-based): HDF5 signature "\x89HDF\r\n\x1a\n"
  if (b[0] === 0x89 && b[1] === 0x48 && b[2] === 0x44 && b[3] === 0x46) {
    if (hasExtension(intake, 'nc', 'nc4', 'netcdf')) return 0.85;
  }
  if (hasExtension(intake, 'nc', 'nc4', 'netcdf')) return 0.6;
  return 0;
}
