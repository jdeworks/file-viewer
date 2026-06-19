export function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 16) return {};
  const sig = 'SQLite format 3\0';
  for (let i = 0; i < sig.length; i++) if (b[i] !== sig.charCodeAt(i)) return {};
  return { Format: 'MBTiles', Container: 'SQLite 3' };
}
