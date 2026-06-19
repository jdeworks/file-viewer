export function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 9) return {};
  const HDF5_MAGIC = [0x89, 0x48, 0x44, 0x46, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!HDF5_MAGIC.every((v, i) => b[i] === v)) return {};
  const version = b[8];
  const result = {
    Format: 'HDF5 (Hierarchical Data Format 5)',
    'Superblock Version': String(version),
    'File Size': `${b.length} bytes`,
  };
  if (b[13]) result['Offset Size'] = `${b[13]} bytes`;
  if (b[14]) result['Length Size'] = `${b[14]} bytes`;
  return result;
}
