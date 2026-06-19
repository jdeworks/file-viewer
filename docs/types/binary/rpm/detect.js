export function detect(intake) {
  const { filename, bytes: b } = intake;
  const ext = (filename || '').split('.').pop().toLowerCase();
  const isRpm = ext === 'rpm' || ext === 'srpm';
  if (!b || b.length < 4) return isRpm ? 0.6 : 0;
  // RPM magic: ED AB EE DB
  const isRpmMagic = b[0] === 0xed && b[1] === 0xab && b[2] === 0xee && b[3] === 0xdb;
  if (isRpmMagic) return isRpm ? 0.99 : 0.97;
  return isRpm ? 0.3 : 0;
}
