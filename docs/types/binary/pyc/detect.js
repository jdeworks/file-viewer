// Python bytecode: magic uint16 LE followed by \r\n at bytes [2-3]
// Known magic ranges: 3000-3600 (Python 3.x), 62061-62211 (Python 2.7), etc.

export function detect(intake) {
  const { filename, bytes: b } = intake;
  const ext = filename ? filename.split('.').pop().toLowerCase() : '';
  const isPycExt = ext === 'pyc' || ext === 'pyo';

  if (!b || b.length < 16) return isPycExt ? 0.5 : 0;

  if (b[2] !== 0x0d || b[3] !== 0x0a) return isPycExt ? 0.3 : 0;

  const magic = b[0] | (b[1] << 8);
  const known = (magic >= 3000 && magic <= 3600) || (magic >= 20000 && magic <= 65000);
  if (isPycExt) return known ? 0.99 : 0.75;
  return known ? 0.85 : 0;
}
