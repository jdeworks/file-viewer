function readStr(b, off, len) {
  let s = '';
  for (let i = 0; i < len; i++) {
    const c = b[off + i];
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s.trim();
}

export async function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 40 + 32) return { fields: [{ label: 'Format', value: 'ISO 9660' }] };
  const pvd = 16 * 2048;
  if (b.length < pvd + 40 + 32) return { fields: [{ label: 'Format', value: 'ISO 9660' }] };
  const volumeId = readStr(b, pvd + 40, 32);
  return {
    fields: [
      { label: 'Format', value: 'ISO 9660' },
      { label: 'Volume ID', value: volumeId || null },
    ].filter((f) => f.value),
  };
}
