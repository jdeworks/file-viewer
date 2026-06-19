function hasAscii(b, off, s) {
  if (off + s.length > b.length) return false;
  for (let i = 0; i < s.length; i++) if (b[off + i] !== s.charCodeAt(i)) return false;
  return true;
}

function hasExtension(intake, ...exts) {
  const name = (intake.filename || '').toLowerCase();
  return exts.some((e) => name.endsWith('.' + e));
}

export function detect(intake) {
  const b = intake.bytes;
  if (!b || b.length < 8) return 0;

  // Parquet magic: 'PAR1' at byte 0 AND at last 4 bytes
  const hasMagicStart = hasAscii(b, 0, 'PAR1');
  const hasMagicEnd = hasAscii(b, b.length - 4, 'PAR1');

  if (hasMagicStart && hasMagicEnd) {
    return hasExtension(intake, 'parquet') ? 0.99 : 0.96;
  }
  if (hasMagicStart || hasMagicEnd) {
    return hasExtension(intake, 'parquet') ? 0.85 : 0.60;
  }

  if (hasExtension(intake, 'parquet')) return 0.4;
  return 0;
}
