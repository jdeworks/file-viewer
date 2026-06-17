export function detect(intake) {
  if (!intake.isBinary) return 0;
  const b = intake.bytes;
  if (b && b.length >= 12) {
    // Check ftyp box at offset 4-7
    if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
      const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
      if (['heic', 'heix', 'mif1', 'msf1', 'hevc', 'heim', 'heis', 'avif'].includes(brand)) return 0.99;
    }
  }
  const ext = intake.filename?.toLowerCase().split('.').pop();
  if (['heic', 'heif', 'hif'].includes(ext)) return 0.7;
  return 0;
}
