export function detect(intake) {
  if (!intake.isBinary) return 0;
  const n = intake.filename.toLowerCase();
  // Floppy images
  if (n.endsWith('.img') || n.endsWith('.ima')) return 0.85;
  // CD/DVD images
  if (n.endsWith('.iso')) return 0.80;
  // Hard disk images
  if (n.endsWith('.vhd') || n.endsWith('.qcow2')) return 0.75;
  return 0;
}
