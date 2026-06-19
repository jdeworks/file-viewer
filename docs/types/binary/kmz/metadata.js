export function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 4) return {};
  if (!(b[0] === 0x50 && b[1] === 0x4b)) return {};
  return { Format: 'KMZ (Compressed KML)', Container: 'ZIP' };
}
