export function detect(intake) {
  if (!intake.isBinary) return 0;
  const b = intake.bytes;
  const ext = (intake.filename || '').split('.').pop()?.toLowerCase();
  // ZIP magic: PK\x03\x04
  const isZip = b && b.length > 4 && b[0] === 0x50 && b[1] === 0x4B && b[2] === 0x03 && b[3] === 0x04;
  if (ext === 'sketch' && isZip) return 0.95;
  if (ext === 'sketch') return 0.7;
  return 0;
}
