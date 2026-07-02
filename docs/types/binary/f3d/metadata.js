export function metadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 4) return {};
  const isZip = b[0] === 0x50 && b[1] === 0x4b;
  if (!isZip) return {};
  const ext = intake.filename ? intake.filename.split('.').pop().toLowerCase() : '';
  return {
    Format: ext === 'f3z' ? 'Fusion 360 Assembly' : 'Fusion 360 Design',
    'Archive format': 'ZIP',
    'File size': `${b.length} bytes`,
  };
}
