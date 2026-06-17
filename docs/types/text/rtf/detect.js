export function detect(intake) {
  if (intake.isBinary) return 0;
  // RTF header: {\rtf1
  if (intake.textSample?.startsWith('{\\rtf')) return 0.95;
  if (intake.filename?.toLowerCase().endsWith('.rtf')) return 0.7;
  return 0;
}
