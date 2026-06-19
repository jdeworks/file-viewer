export function metadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 8) return {};
  const isAr = b[0] === 0x21 && b[1] === 0x3c && b[2] === 0x61 && b[3] === 0x72
    && b[4] === 0x63 && b[5] === 0x68 && b[6] === 0x3e && b[7] === 0x0a;
  if (!isAr) return {};
  return { format: 'Debian Package' };
}
