export function detect(intake) {
  const { filename, bytes: b } = intake;
  const ext = (filename || '').split('.').pop().toLowerCase();
  const isIpa = ext === 'ipa';
  if (!b || b.length < 4) return isIpa ? 0.6 : 0;
  const isPK = b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
  if (!isPK) return isIpa ? 0.3 : 0;
  return isIpa ? 0.99 : 0;
}
