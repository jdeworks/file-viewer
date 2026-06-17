export async function extractMetadata(intake) {
  const n = intake.filename.toLowerCase();
  const size = intake.bytes.length;
  const type = n.endsWith('.iso') ? 'CD-ROM image'
    : size <= 1474560 ? 'Floppy disk image (1.44MB)'
    : 'Hard disk image';
  return { 'Image type': type, 'Size': (size / 1024 / 1024).toFixed(2) + ' MB' };
}
