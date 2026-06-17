export function detect(intake) {
  // Binary plist magic: 62 70 6C 69 73 74 30 30 ("bplist00")
  if (intake.bytes && intake.bytes.length >= 8) {
    const magic = String.fromCharCode(...intake.bytes.slice(0, 8));
    if (magic === 'bplist00') return 0.99;
  }
  // XML plist: has <!DOCTYPE plist or <plist version=
  const sample = intake.textSample || '';
  if (sample.includes('<!DOCTYPE plist') || sample.includes('<plist version=')) return 0.97;
  if (intake.filename?.toLowerCase().endsWith('.plist')) return 0.7;
  return 0;
}
