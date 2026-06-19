// Fusion 360 .f3d: ZIP file (PK magic) with specific internal structure
// Also .f3z (assembly) shares the same format

export function detect(intake) {
  const { filename, bytes: b } = intake;
  const ext = filename ? filename.split('.').pop().toLowerCase() : '';
  const isF3dExt = ext === 'f3d' || ext === 'f3z';

  if (!b || b.length < 4) return isF3dExt ? 0.5 : 0;

  const isPkZip = b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07);
  if (isF3dExt) return isPkZip ? 0.97 : 0.4;
  return 0;
}
