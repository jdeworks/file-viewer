export function detect(intake) {
  if (/\.swf$/i.test(intake.filename)) return 0.98;
  // Flash magic bytes: CWS (compressed), FWS (uncompressed), ZWS (zlib)
  const b = intake.bytes;
  if (b.length >= 3 && (b[0] === 0x43 || b[0] === 0x46 || b[0] === 0x5a) && b[1] === 0x57 && b[2] === 0x53) return 0.97;
  return 0;
}
