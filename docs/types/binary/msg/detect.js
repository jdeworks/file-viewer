export function detect(intake) {
  if (!intake.isBinary) return 0;
  const b = intake.bytes;
  if (b?.length >= 8 &&
      b[0] === 0xD0 && b[1] === 0xCF && b[2] === 0x11 && b[3] === 0xE0 &&
      b[4] === 0xA1 && b[5] === 0xB1 && b[6] === 0x1A && b[7] === 0xE1) {
    // Could be .msg, .doc, .xls, .ppt — use extension to disambiguate
    if (intake.filename?.toLowerCase().endsWith('.msg')) return 0.97;
    return 0.3; // OLE2 but unknown subtype
  }
  if (intake.filename?.toLowerCase().endsWith('.msg')) return 0.5;
  return 0;
}
