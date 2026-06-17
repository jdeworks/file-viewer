export function detect(intake) {
  if (!intake.isBinary) return 0;
  const b = intake.bytes;
  if (!b || b.length < 20) return 0;

  // Header magic: HeaderSize = 0x4C (76) followed by CLSID start 01 14 02 00
  if (b[0] === 0x4C && b[1] === 0x00 && b[2] === 0x00 && b[3] === 0x00 &&
      b[4] === 0x01 && b[5] === 0x14 && b[6] === 0x02 && b[7] === 0x00) return 0.99;

  if ((intake.filename || '').toLowerCase().endsWith('.lnk')) return 0.6;
  return 0;
}
