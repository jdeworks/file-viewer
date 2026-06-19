export function detect(intake) {
  const { filename, bytes: b } = intake;
  const name = (filename || '').toLowerCase();
  const ext = name.split('.').pop();
  // nupkg, vsix, whl (Python wheel), jar (Java archive)
  const isKnownExt = ext === 'nupkg' || ext === 'vsix' || ext === 'whl' || ext === 'jar';
  // All are ZIP files: PK\x03\x04
  if (!b || b.length < 4) return isKnownExt ? 0.6 : 0;
  const isPK = b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
  if (!isPK) return isKnownExt ? 0.3 : 0;
  if (ext === 'nupkg') return 0.99;
  if (ext === 'vsix') return 0.99;
  if (ext === 'whl') return 0.99;
  if (ext === 'jar') return 0.95;
  return 0;
}
