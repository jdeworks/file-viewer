export async function extractMetadata(intake) {
  // Extract format from the ftyp box brand
  const b = intake.bytes;
  let brand = 'HEIF';
  if (b && b.length >= 12 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    brand = String.fromCharCode(b[8], b[9], b[10], b[11]).trim();
  }
  return { format: brand.toUpperCase(), container: 'ISO Base Media File Format' };
}
