export function detect(intake) {
  if (!intake.isBinary) return 0;
  // Procreate files are ZIPs — .procreate extension is the only reliable signal
  if (/\.procreate$/i.test(intake.filename || '')) return 0.97;
  return 0;
}
